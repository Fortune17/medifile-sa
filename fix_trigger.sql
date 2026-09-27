CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_first_name text;
  v_last_name text;
  v_id_number text;
  v_hpcsa_number text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'patient');
  v_first_name := COALESCE(new.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(new.raw_user_meta_data->>'last_name', '');
  
  -- Fallbacks if id_number is not provided (should be provided by the form)
  v_id_number := COALESCE(new.raw_user_meta_data->>'id_number', substring(new.id::text from 1 for 13));
  v_hpcsa_number := COALESCE(new.raw_user_meta_data->>'hpcsa_number', substring(new.id::text from 1 for 10));

  INSERT INTO public.profiles (id, role, first_name, last_name, email)
  VALUES (
    new.id,
    v_role::public.user_role,
    v_first_name,
    v_last_name,
    new.email
  );
  
  IF v_role = 'patient' THEN
      INSERT INTO public.patients (id, id_number, unique_patient_number)
      VALUES (new.id, v_id_number, substring(new.id::text from 1 for 8));
  END IF;

  IF v_role = 'doctor' OR v_role = 'nurse' THEN
      INSERT INTO public.healthcare_workers (id, hpcsa_number)
      VALUES (new.id, v_hpcsa_number);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
