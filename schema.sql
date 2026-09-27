-- MediFile SA Database Schema

-- Custom Types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'nurse', 'admin', 'reception');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');
CREATE TYPE severity_type AS ENUM ('mild', 'moderate', 'severe', 'life-threatening');

-- Profiles Table (Extends Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients Table
CREATE TABLE patients (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    id_number TEXT UNIQUE NOT NULL, -- SA ID number
    date_of_birth DATE,
    gender gender_type,
    phone_number TEXT,
    address TEXT,
    province TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    blood_type blood_type DEFAULT 'unknown',
    unique_patient_number TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex')
);

-- Healthcare Workers Table
CREATE TABLE healthcare_workers (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    hpcsa_number TEXT UNIQUE NOT NULL,
    speciality TEXT,
    phone_number TEXT
);

-- Hospitals Table
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT, -- public, private
    province TEXT,
    address TEXT,
    contact_number TEXT
);

-- Access Consents (Who can view what)
CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES healthcare_workers(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- null means permanent until revoked
    access_level TEXT DEFAULT 'full', -- full, emergency, limited
    status TEXT DEFAULT 'active' -- active, revoked, expired
);

-- Consultations Table
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES healthcare_workers(id),
    hospital_id UUID REFERENCES hospitals(id),
    date_time TIMESTAMPTZ DEFAULT NOW(),
    chief_complaint TEXT,
    symptoms TEXT,
    observations TEXT,
    examination TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up_date DATE,
    notes TEXT
);

-- Medications Table
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    prescribing_doctor_id UUID REFERENCES healthcare_workers(id),
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    route TEXT,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'active' -- active, completed, discontinued
);

-- Allergies Table
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES profiles(id),
    substance TEXT NOT NULL,
    reaction TEXT,
    severity severity_type,
    date_recorded DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id),
    patient_id UUID REFERENCES patients(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    date_time TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Security: Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES: Users can read their own profile. Others can read basic info if they have consent.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. PATIENTS: Patients can view their own record.
CREATE POLICY "Patients can view own record" ON patients FOR SELECT USING (auth.uid() = id);

-- Providers can view patient records if they have an active consent
CREATE POLICY "Providers can view consented patients" ON patients FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consents 
        WHERE consents.patient_id = patients.id 
        AND consents.provider_id = auth.uid() 
        AND consents.status = 'active'
        AND (consents.expires_at IS NULL OR consents.expires_at > NOW())
    )
);

-- 3. CONSENTS: Patients can view and manage their own consents. Providers can view their own.
CREATE POLICY "Patients manage consents" ON consents FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Providers view their consents" ON consents FOR SELECT USING (auth.uid() = provider_id);

-- 4. MEDICAL RECORDS (Consultations, Medications, Allergies)
-- Patients can view their own
CREATE POLICY "Patients view own consultations" ON consultations FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients view own medications" ON medications FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients view own allergies" ON allergies FOR SELECT USING (auth.uid() = patient_id);

-- Providers with consent can view records
CREATE POLICY "Providers view consented consultations" ON consultations FOR SELECT USING (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = consultations.patient_id AND provider_id = auth.uid() AND status = 'active')
);
CREATE POLICY "Providers view consented medications" ON medications FOR SELECT USING (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = medications.patient_id AND provider_id = auth.uid() AND status = 'active')
);
CREATE POLICY "Providers view consented allergies" ON allergies FOR SELECT USING (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = allergies.patient_id AND provider_id = auth.uid() AND status = 'active')
);

-- Providers with consent can INSERT records
CREATE POLICY "Providers insert consultations" ON consultations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = consultations.patient_id AND provider_id = auth.uid() AND status = 'active')
);
CREATE POLICY "Providers insert medications" ON medications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = medications.patient_id AND provider_id = auth.uid() AND status = 'active')
);
CREATE POLICY "Providers insert allergies" ON allergies FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM consents WHERE patient_id = allergies.patient_id AND provider_id = auth.uid() AND status = 'active')
);

-- 5. AUDIT LOGS
CREATE POLICY "Patients can view their own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true); -- Usually restricted via triggers in production

-- Setup Trigger to create Profile on User Sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name, email)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'patient'::user_role),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  
  -- If patient, insert into patients
  IF COALESCE((new.raw_user_meta_data->>'role')::user_role, 'patient'::user_role) = 'patient' THEN
      INSERT INTO public.patients (id, id_number)
      VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data->>'id_number', encode(gen_random_bytes(6), 'hex'))
      );
  END IF;

  -- If doctor/nurse, insert into healthcare_workers
  IF COALESCE((new.raw_user_meta_data->>'role')::user_role, 'patient'::user_role) IN ('doctor', 'nurse') THEN
      INSERT INTO public.healthcare_workers (id, hpcsa_number)
      VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data->>'hpcsa_number', encode(gen_random_bytes(6), 'hex'))
      );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
