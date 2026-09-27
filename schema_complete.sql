-- Additional tables, RPCs, and RLS needed for full MediFile SA functionality.
-- Run this in the Supabase SQL editor after schema.sql / fix_trigger.sql.

-- Access tokens for clinic QR codes
CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES healthcare_workers(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Providers view consented patient profiles" ON profiles;
CREATE POLICY "Providers view consented patient profiles" ON profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consents
        WHERE consents.patient_id = profiles.id
          AND consents.provider_id = auth.uid()
          AND consents.status = 'active'
          AND (consents.expires_at IS NULL OR consents.expires_at > NOW())
    )
);

DROP POLICY IF EXISTS "Patients view their providers" ON profiles;
CREATE POLICY "Patients view their providers" ON profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consents
        WHERE consents.provider_id = profiles.id
          AND consents.patient_id = auth.uid()
    )
);

-- Patients can update their own demographic record
DROP POLICY IF EXISTS "Patients can update own record" ON patients;
CREATE POLICY "Patients can update own record" ON patients FOR UPDATE USING (auth.uid() = id);

-- Healthcare workers
DROP POLICY IF EXISTS "Workers view own record" ON healthcare_workers;
CREATE POLICY "Workers view own record" ON healthcare_workers FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Workers update own record" ON healthcare_workers;
CREATE POLICY "Workers update own record" ON healthcare_workers FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Patients view consented workers" ON healthcare_workers;
CREATE POLICY "Patients view consented workers" ON healthcare_workers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consents
        WHERE consents.provider_id = healthcare_workers.id
          AND consents.patient_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Providers view other workers via consent" ON healthcare_workers;
CREATE POLICY "Providers view other workers via consent" ON healthcare_workers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consents
        WHERE consents.provider_id = healthcare_workers.id
          AND consents.provider_id = auth.uid()
    )
);

-- Consents: providers can request pending access
DROP POLICY IF EXISTS "Providers request consent" ON consents;
CREATE POLICY "Providers request consent" ON consents FOR INSERT WITH CHECK (
    auth.uid() = provider_id AND status IN ('pending', 'active')
);

DROP POLICY IF EXISTS "Providers update own pending consents" ON consents;
CREATE POLICY "Providers update own pending consents" ON consents FOR UPDATE USING (auth.uid() = provider_id);

-- Record updates
DROP POLICY IF EXISTS "Providers update consented consultations" ON consultations;
CREATE POLICY "Providers update consented consultations" ON consultations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = consultations.patient_id AND provider_id = auth.uid() AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
);

DROP POLICY IF EXISTS "Providers update consented medications" ON medications;
CREATE POLICY "Providers update consented medications" ON medications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = medications.patient_id AND provider_id = auth.uid() AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
);

DROP POLICY IF EXISTS "Providers update consented allergies" ON allergies;
CREATE POLICY "Providers update consented allergies" ON allergies FOR UPDATE USING (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = allergies.patient_id AND provider_id = auth.uid() AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
);

-- Appointments
DROP POLICY IF EXISTS "Patients view own appointments" ON appointments;
CREATE POLICY "Patients view own appointments" ON appointments FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own appointments" ON appointments;
CREATE POLICY "Patients manage own appointments" ON appointments FOR ALL USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Providers view consented appointments" ON appointments;
CREATE POLICY "Providers view consented appointments" ON appointments FOR SELECT USING (
    auth.uid() = provider_id OR EXISTS (
        SELECT 1 FROM consents WHERE patient_id = appointments.patient_id AND provider_id = auth.uid() AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Providers insert appointments" ON appointments;
CREATE POLICY "Providers insert appointments" ON appointments FOR INSERT WITH CHECK (
    auth.uid() = provider_id AND EXISTS (
        SELECT 1 FROM consents WHERE patient_id = appointments.patient_id AND provider_id = auth.uid() AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Providers update appointments" ON appointments;
CREATE POLICY "Providers update appointments" ON appointments FOR UPDATE USING (auth.uid() = provider_id);

-- Access tokens: patients create/read their own
DROP POLICY IF EXISTS "Patients manage access tokens" ON access_tokens;
CREATE POLICY "Patients manage access tokens" ON access_tokens FOR ALL USING (auth.uid() = patient_id);

-- Hospitals readable
DROP POLICY IF EXISTS "Authenticated read hospitals" ON hospitals;
CREATE POLICY "Authenticated read hospitals" ON hospitals FOR SELECT USING (auth.role() = 'authenticated');

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Create a 30-minute QR token for the logged-in patient
CREATE OR REPLACE FUNCTION create_access_token()
RETURNS TABLE (token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patients WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Only patients can generate access tokens';
  END IF;

  DELETE FROM access_tokens WHERE patient_id = auth.uid() AND expires_at < NOW();

  INSERT INTO access_tokens (patient_id)
  VALUES (auth.uid())
  RETURNING access_tokens.token, access_tokens.expires_at
  INTO v_token, v_expires;

  INSERT INTO audit_logs (actor_id, patient_id, action, table_name)
  VALUES (auth.uid(), auth.uid(), 'generated_access_token', 'access_tokens');

  token := v_token;
  expires_at := v_expires;
  RETURN NEXT;
END;
$$;

-- Doctor/nurse redeems a QR token into a 24-hour consent
CREATE OR REPLACE FUNCTION redeem_access_token(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM healthcare_workers WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Only healthcare workers can redeem access tokens';
  END IF;

  SELECT patient_id, expires_at INTO v_patient, v_expires
  FROM access_tokens
  WHERE token = p_token;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;

  IF v_expires < NOW() THEN
    RAISE EXCEPTION 'Access token has expired';
  END IF;

  UPDATE consents
  SET status = 'active', access_level = 'full', expires_at = NOW() + INTERVAL '24 hours', granted_at = NOW()
  WHERE patient_id = v_patient AND provider_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO consents (patient_id, provider_id, access_level, status, expires_at)
    VALUES (v_patient, auth.uid(), 'full', 'active', NOW() + INTERVAL '24 hours');
  END IF;

  DELETE FROM access_tokens WHERE token = p_token;

  INSERT INTO audit_logs (actor_id, patient_id, action, table_name, record_id)
  VALUES (auth.uid(), v_patient, 'redeemed_access_token', 'consents', v_patient);

  RETURN v_patient;
END;
$$;

-- Exact-match directory search (SA ID or unique patient number)
CREATE OR REPLACE FUNCTION search_patients(p_query TEXT)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  unique_patient_number TEXT,
  consent_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM healthcare_workers WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Only healthcare workers can search patients';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    pr.first_name,
    pr.last_name,
    p.unique_patient_number,
    COALESCE((
      SELECT c.status FROM consents c
      WHERE c.patient_id = p.id AND c.provider_id = auth.uid()
      ORDER BY c.granted_at DESC NULLS LAST
      LIMIT 1
    ), 'none') AS consent_status
  FROM patients p
  JOIN profiles pr ON pr.id = p.id
  WHERE p.id_number = btrim(p_query)
     OR p.unique_patient_number = btrim(p_query)
     OR lower(pr.first_name || ' ' || pr.last_name) = lower(btrim(p_query));
END;
$$;

CREATE OR REPLACE FUNCTION request_patient_access(p_patient_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM healthcare_workers WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Only healthcare workers can request access';
  END IF;

  SELECT c.id INTO v_id FROM consents c
  WHERE c.patient_id = p_patient_id AND c.provider_id = auth.uid()
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE consents SET status = 'pending', granted_at = NOW() WHERE id = v_id AND status <> 'active';
    RETURN v_id;
  END IF;

  INSERT INTO consents (patient_id, provider_id, access_level, status)
  VALUES (p_patient_id, auth.uid(), 'full', 'pending')
  RETURNING consents.id INTO v_id;

  INSERT INTO audit_logs (actor_id, patient_id, action, table_name, record_id)
  VALUES (auth.uid(), p_patient_id, 'requested_access', 'consents', v_id);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_access_token() TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_access_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_patients(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION request_patient_access(UUID) TO authenticated;
