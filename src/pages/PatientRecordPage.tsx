import { useEffect, useState, type ReactNode } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { AlertTriangle, FilePlus, Pill, Stethoscope, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Allergy, Consultation, Medication, OutletContext, PatientRecord, Profile } from '../lib/types';
import { isProvider } from '../lib/types';
import { formatDate } from '../lib/dates';
import { logAudit } from '../lib/audit';
import Modal from '../components/ui/Modal';

export default function PatientRecordPage() {
  const { profile } = useOutletContext<OutletContext>();
  const { patientId } = useParams();
  const [patientProfile, setPatientProfile] = useState<Profile | null>(null);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'consult' | 'med' | 'allergy' | null>(null);

  const load = async () => {
    if (!patientId) return;
    const [{ data: p, error: pErr }, { data: pr }, { data: c }, { data: m }, { data: a }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('profiles').select('*').eq('id', patientId).single(),
      supabase.from('consultations').select('*').eq('patient_id', patientId).order('date_time', { ascending: false }),
      supabase.from('medications').select('*').eq('patient_id', patientId).order('start_date', { ascending: false }),
      supabase.from('allergies').select('*').eq('patient_id', patientId).order('date_recorded', { ascending: false }),
    ]);
    if (pErr) setError(pErr.message);
    else setError(null);
    setPatient((p as PatientRecord) || null);
    setPatientProfile((pr as Profile) || null);
    setConsultations((c as Consultation[]) || []);
    setMedications((m as Medication[]) || []);
    setAllergies((a as Allergy[]) || []);
    if (p) {
      await logAudit({ actorId: profile.id, patientId, action: 'viewed_record', tableName: 'patients', recordId: patientId });
    }
  };

  useEffect(() => {
    load();
  }, [patientId]);

  if (!isProvider(profile.role)) {
    return <p className="text-slate-600">Only healthcare workers can open this record view.</p>;
  }

  const addConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error: insertError } = await supabase.from('consultations').insert({
      patient_id: patientId,
      doctor_id: profile.id,
      chief_complaint: form.get('chief_complaint'),
      symptoms: form.get('symptoms'),
      examination: form.get('examination'),
      diagnosis: form.get('diagnosis'),
      treatment_plan: form.get('treatment_plan'),
      notes: form.get('notes'),
      follow_up_date: String(form.get('follow_up_date') || '') || null,
    });
    if (insertError) { setError(insertError.message); return; }
    setModal(null);
    load();
  };

  const addMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error: insertError } = await supabase.from('medications').insert({
      patient_id: patientId,
      prescribing_doctor_id: profile.id,
      name: form.get('name'),
      dosage: form.get('dosage'),
      frequency: form.get('frequency'),
      route: form.get('route'),
      start_date: String(form.get('start_date') || '') || null,
      reason: form.get('reason'),
      status: 'active',
    });
    if (insertError) { setError(insertError.message); return; }
    setModal(null);
    load();
  };

  const addAllergy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error: insertError } = await supabase.from('allergies').insert({
      patient_id: patientId,
      recorded_by: profile.id,
      substance: form.get('substance'),
      reaction: form.get('reaction'),
      severity: form.get('severity'),
      notes: form.get('notes'),
    });
    if (insertError) { setError(insertError.message); return; }
    setModal(null);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {patientProfile ? `${patientProfile.first_name} ${patientProfile.last_name}` : 'Patient record'}
        </h1>
        <p className="text-slate-500 text-sm">Patient no. {patient?.unique_patient_number || '—'}</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white p-6 rounded-xl border border-slate-200 grid md:grid-cols-3 gap-4">
        <div className="flex items-start gap-2">
          <User className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-slate-500">Blood type</p>
            <p className="font-semibold">{patient?.blood_type || 'Unknown'}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Emergency contact</p>
          <p className="font-semibold">{patient?.emergency_contact_name || 'Not provided'}</p>
          <p className="text-sm text-slate-500">{patient?.emergency_contact_phone}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Phone</p>
          <p className="font-semibold">{patient?.phone_number || 'Not provided'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setModal('consult')} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <FilePlus className="w-4 h-4" /> Add consultation
        </button>
        <button onClick={() => setModal('med')} className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Pill className="w-4 h-4" /> Prescribe
        </button>
        <button onClick={() => setModal('allergy')} className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Record allergy
        </button>
      </div>

      <Section title="Consultations" icon={Stethoscope}>
        {consultations.length === 0 ? <Empty /> : consultations.map((c) => (
          <div key={c.id} className="p-4 border-b border-slate-100">
            <p className="font-medium">{c.diagnosis || c.chief_complaint || 'Consultation'}</p>
            <p className="text-sm text-slate-500">{formatDate(c.date_time)} · {c.symptoms}</p>
            {c.treatment_plan && <p className="text-sm mt-1">{c.treatment_plan}</p>}
          </div>
        ))}
      </Section>

      <Section title="Medications" icon={Pill}>
        {medications.length === 0 ? <Empty /> : medications.map((m) => (
          <div key={m.id} className="p-4 border-b border-slate-100 flex justify-between">
            <div>
              <p className="font-medium">{m.name} {m.dosage}</p>
              <p className="text-sm text-slate-500">{m.frequency}</p>
            </div>
            <span className="text-xs capitalize">{m.status}</span>
          </div>
        ))}
      </Section>

      <Section title="Allergies" icon={AlertTriangle}>
        {allergies.length === 0 ? <Empty /> : allergies.map((a) => (
          <div key={a.id} className="p-4 border-b border-slate-100">
            <p className="font-medium">{a.substance}</p>
            <p className="text-sm text-slate-500">{a.reaction} · {a.severity}</p>
          </div>
        ))}
      </Section>

      {modal === 'consult' && (
        <Modal title="New consultation" onClose={() => setModal(null)}>
          <form onSubmit={addConsultation} className="space-y-3">
            <Input name="chief_complaint" label="Chief complaint" required />
            <Input name="symptoms" label="Symptoms" />
            <Input name="examination" label="Examination" />
            <Input name="diagnosis" label="Diagnosis" />
            <Input name="treatment_plan" label="Treatment plan" />
            <Input name="follow_up_date" label="Follow-up date" type="date" />
            <Input name="notes" label="Notes" />
            <button className="w-full bg-primary text-white py-2 rounded-lg text-sm">Save consultation</button>
          </form>
        </Modal>
      )}
      {modal === 'med' && (
        <Modal title="Prescribe medication" onClose={() => setModal(null)}>
          <form onSubmit={addMedication} className="space-y-3">
            <Input name="name" label="Medication" required />
            <Input name="dosage" label="Dosage" />
            <Input name="frequency" label="Frequency" />
            <Input name="route" label="Route" />
            <Input name="start_date" label="Start date" type="date" />
            <Input name="reason" label="Reason" />
            <button className="w-full bg-primary text-white py-2 rounded-lg text-sm">Save prescription</button>
          </form>
        </Modal>
      )}
      {modal === 'allergy' && (
        <Modal title="Record allergy" onClose={() => setModal(null)}>
          <form onSubmit={addAllergy} className="space-y-3">
            <Input name="substance" label="Substance" required />
            <Input name="reaction" label="Reaction" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
              <select name="severity" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="mild">mild</option>
                <option value="moderate">moderate</option>
                <option value="severe">severe</option>
                <option value="life-threatening">life-threatening</option>
              </select>
            </div>
            <Input name="notes" label="Notes" />
            <button className="w-full bg-primary text-white py-2 rounded-lg text-sm">Save allergy</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Stethoscope; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 font-semibold flex items-center">
        <Icon className="w-4 h-4 mr-2 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="p-4 text-sm text-slate-500">None recorded.</p>;
}

function Input({ name, label, type = 'text', required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input name={name} type={type} required={required} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
