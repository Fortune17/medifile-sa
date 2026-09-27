export type UserRole = 'patient' | 'doctor' | 'nurse' | 'admin' | 'reception';

export type Profile = {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  email?: string;
};

export type OutletContext = {
  profile: Profile;
};

export type PatientRecord = {
  id: string;
  id_number: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_number: string | null;
  address: string | null;
  province: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_type: string | null;
  unique_patient_number: string | null;
};

export type HealthcareWorker = {
  id: string;
  hpcsa_number: string;
  speciality: string | null;
  phone_number: string | null;
};

export type Consent = {
  id: string;
  patient_id: string;
  provider_id: string;
  granted_at: string;
  expires_at: string | null;
  access_level: string | null;
  status: string;
  provider_name?: string;
};

export type Consultation = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  hospital_id: string | null;
  date_time: string;
  chief_complaint: string | null;
  symptoms: string | null;
  observations: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  follow_up_date: string | null;
  notes: string | null;
};

export type Medication = {
  id: string;
  patient_id: string;
  prescribing_doctor_id: string | null;
  name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: string | null;
};

export type Allergy = {
  id: string;
  patient_id: string;
  recorded_by: string | null;
  substance: string;
  reaction: string | null;
  severity: string | null;
  date_recorded: string | null;
  notes: string | null;
};

export type Appointment = {
  id: string;
  patient_id: string;
  provider_id: string | null;
  scheduled_at: string;
  reason: string | null;
  status: string | null;
  notes: string | null;
};

export function isProvider(role?: UserRole) {
  return role === 'doctor' || role === 'nurse';
}
