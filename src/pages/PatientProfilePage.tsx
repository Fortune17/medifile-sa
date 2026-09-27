import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User, Phone, MapPin, Activity, Heart, Mail, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { HealthcareWorker, OutletContext, PatientRecord } from '../lib/types';
import { isProvider } from '../lib/types';
import { logAudit } from '../lib/audit';

const provinces = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

export default function PatientProfilePage() {
  const { profile } = useOutletContext<OutletContext>();
  const [patientData, setPatientData] = useState<PatientRecord | null>(null);
  const [worker, setWorker] = useState<HealthcareWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (profile.role === 'patient') {
        const { data } = await supabase.from('patients').select('*').eq('id', profile.id).single();
        if (data) setPatientData(data as PatientRecord);
      } else if (isProvider(profile.role)) {
        const { data } = await supabase.from('healthcare_workers').select('*').eq('id', profile.id).single();
        if (data) setWorker(data as HealthcareWorker);
      }
      setLoading(false);
    }
    load();
  }, [profile.id, profile.role]);

  const savePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientData) return;
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const updates = {
      phone_number: String(form.get('phone_number') || '') || null,
      address: String(form.get('address') || '') || null,
      province: String(form.get('province') || '') || null,
      date_of_birth: String(form.get('date_of_birth') || '') || null,
      gender: String(form.get('gender') || '') || null,
      blood_type: String(form.get('blood_type') || 'unknown'),
      emergency_contact_name: String(form.get('emergency_contact_name') || '') || null,
      emergency_contact_phone: String(form.get('emergency_contact_phone') || '') || null,
    };
    const { data, error: saveError } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();
    if (saveError) {
      setError(saveError.message);
    } else {
      setPatientData(data as PatientRecord);
      setEditing(false);
      await logAudit({ actorId: profile.id, patientId: profile.id, action: 'updated_profile', tableName: 'patients' });
    }
    setSaving(false);
  };

  const saveWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const updates = {
      speciality: String(form.get('speciality') || '') || null,
      phone_number: String(form.get('phone_number') || '') || null,
    };
    const { data, error: saveError } = await supabase
      .from('healthcare_workers')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();
    if (saveError) setError(saveError.message);
    else {
      setWorker(data as HealthcareWorker);
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-slate-500">Loading profile data...</div>;

  if (isProvider(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center border-b border-slate-100 pb-2">
            <Stethoscope className="w-5 h-5 mr-2 text-primary" /> Practitioner details
          </h2>
          {editing ? (
            <form onSubmit={saveWorker} className="grid md:grid-cols-2 gap-4">
              <Field label="Speciality" name="speciality" defaultValue={worker?.speciality} />
              <Field label="Phone" name="phone_number" defaultValue={worker?.phone_number} />
              {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Info label="Full name" value={`${profile.first_name} ${profile.last_name}`} />
              <Info label="HPCSA number" value={worker?.hpcsa_number} />
              <Info label="Speciality" value={worker?.speciality} />
              <Info label="Phone" value={worker?.phone_number} />
              <div className="md:col-span-2">
                <button onClick={() => setEditing(true)} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium">Edit profile</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (profile.role !== 'patient') {
    return <div className="text-slate-600">No medical profile is attached to this role.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center border-b border-slate-100 pb-2">
          <User className="w-5 h-5 mr-2 text-primary" /> Personal Information
        </h2>

        {editing ? (
          <form onSubmit={savePatient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
              <div className="text-slate-900 font-medium">{profile.first_name} {profile.last_name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">South African ID</label>
              <div className="text-slate-900 font-medium">{patientData?.id_number}</div>
            </div>
            <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={patientData?.date_of_birth ?? ''} />
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Gender</label>
              <select name="gender" defaultValue={patientData?.gender ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <Field label="Phone number" name="phone_number" defaultValue={patientData?.phone_number} />
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Province</label>
              <select name="province" defaultValue={patientData?.province ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                {provinces.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Field label="Address" name="address" defaultValue={patientData?.address} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Blood type</label>
              <select name="blood_type" defaultValue={patientData?.blood_type ?? 'unknown'} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <Field label="Emergency contact name" name="emergency_contact_name" defaultValue={patientData?.emergency_contact_name} />
            <Field label="Emergency contact phone" name="emergency_contact_phone" defaultValue={patientData?.emergency_contact_phone} />
            {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">{saving ? 'Saving...' : 'Save changes'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Info label="Full Name" value={`${profile.first_name} ${profile.last_name}`} />
            <Info label="South African ID" value={patientData?.id_number} />
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
              <div className="text-slate-900 font-medium flex items-center">
                <Mail className="w-4 h-4 mr-1 text-slate-400" /> {profile.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Phone Number</label>
              <div className="text-slate-900 font-medium flex items-center">
                <Phone className="w-4 h-4 mr-1 text-slate-400" /> {patientData?.phone_number || 'Not provided'}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
              <div className="text-slate-900 font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                {patientData?.address ? `${patientData.address}, ${patientData.province || ''}` : 'Not provided'}
              </div>
            </div>
            <Info label="Patient number" value={patientData?.unique_patient_number} />
            <Info label="Date of birth" value={patientData?.date_of_birth} />
          </div>
        )}
      </div>

      <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Heart className="w-24 h-24 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center border-b border-red-200/50 pb-2 relative z-10">
          <Activity className="w-5 h-5 mr-2" /> EMERGENCY MEDICAL INFORMATION
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div>
            <label className="block text-sm font-medium text-red-800/70 mb-1">Blood Type</label>
            <div className="text-red-900 font-bold text-lg">{patientData?.blood_type || 'Unknown'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-red-800/70 mb-1">Emergency Contact</label>
            <div className="text-red-900 font-medium">
              {patientData?.emergency_contact_name || 'Not provided'}
              {patientData?.emergency_contact_phone && <span className="block text-sm mt-1">{patientData.emergency_contact_phone}</span>}
            </div>
          </div>
        </div>
        {!editing && (
          <div className="mt-6 pt-4 border-t border-red-200/50 relative z-10">
            <button onClick={() => setEditing(true)} className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
              Edit Profile Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, type = 'text' }: { label: string; name: string; defaultValue?: string | null; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-500 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-500 mb-1">{label}</label>
      <div className="text-slate-900 font-medium">{value || 'Not provided'}</div>
    </div>
  );
}
