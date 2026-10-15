import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Calendar, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Appointment, OutletContext } from '../lib/types';
import { isProvider } from '../lib/types';
import { formatDate } from '../lib/dates';
import Modal from '../components/ui/Modal';

type PatientSearchHit = {
  id: string;
  first_name: string;
  last_name: string;
  unique_patient_number: string;
  consent_status: string;
};

export default function AppointmentsPage() {
  const { profile } = useOutletContext<OutletContext>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSearchHit[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchHit | null>(null);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [searchingPatients, setSearchingPatients] = useState(false);

  const load = async () => {
    let query = supabase.from('appointments').select('*').order('scheduled_at', { ascending: true });
    if (profile.role === 'patient') query = query.eq('patient_id', profile.id);
    else query = query.eq('provider_id', profile.id);
    const { data } = await query;
    const loadedAppointments = (data as Appointment[]) || [];
    setAppointments(loadedAppointments);
    if (isProvider(profile.role) && loadedAppointments.length > 0) {
      const patientIds = [...new Set(loadedAppointments.map((item) => item.patient_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', patientIds);
      setPatientNames(Object.fromEntries(
        (profiles || []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`]),
      ));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile.id, profile.role]);

  const searchPatients = async () => {
    const value = patientQuery.trim();
    if (!value) return;
    setSearchingPatients(true);
    setError(null);
    const { data, error: searchError } = await supabase.rpc('search_patients', { p_query: value });
    if (searchError) {
      setError(searchError.message);
      setPatientResults([]);
    } else {
      setPatientResults((data as PatientSearchHit[]) || []);
    }
    setSearchingPatients(false);
  };

  const createAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      scheduled_at: new Date(String(form.get('scheduled_at'))).toISOString(),
      reason: String(form.get('reason') || '') || null,
      notes: String(form.get('notes') || '') || null,
      status: 'scheduled',
    };
    if (profile.role === 'patient') {
      payload.patient_id = profile.id;
    } else {
      payload.provider_id = profile.id;
      if (!selectedPatient) {
        setError('Search for and select a patient with active access first.');
        return;
      }
      payload.patient_id = selectedPatient.id;
    }
    const { error: insertError } = await supabase.from('appointments').insert(payload);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setShowForm(false);
    setSelectedPatient(null);
    setPatientQuery('');
    setPatientResults([]);
    load();
  };

  const cancelAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    load();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
          New appointment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : appointments.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            No appointments yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((item) => (
              <div key={item.id} className="p-4 sm:p-6 flex justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.reason || 'Appointment'}</p>
                  {isProvider(profile.role) && (
                    <p className="text-sm text-slate-600">
                      {patientNames[item.patient_id] ? (
                        <>
                          {patientNames[item.patient_id]} ·{' '}
                          <Link to={`/dashboard/patients/${item.patient_id}`} className="text-primary hover:underline">
                            Open record
                          </Link>
                        </>
                      ) : 'Patient details unavailable'}
                    </p>
                  )}
                  <p className="text-sm text-slate-500">{formatDate(item.scheduled_at, 'dd MMM yyyy HH:mm')}</p>
                  {item.notes && <p className="text-sm text-slate-600 mt-1">{item.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs capitalize bg-slate-100 px-2 py-1 rounded">{item.status}</span>
                  {item.status === 'scheduled' && (
                    <button onClick={() => cancelAppointment(item.id)} className="text-xs text-red-600">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="New appointment" onClose={() => setShowForm(false)}>
          <form onSubmit={createAppointment} className="space-y-4">
            {isProvider(profile.role) && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Patient</label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      <p className="text-xs text-slate-600">Patient no. {selectedPatient.unique_patient_number}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedPatient(null)} className="text-sm text-primary hover:underline">Change</button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={patientQuery}
                        onChange={(e) => setPatientQuery(e.target.value)}
                        className="min-w-0 flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Name, SA ID, or patient number"
                        aria-label="Search patients"
                      />
                      <button type="button" onClick={() => searchPatients()} disabled={searchingPatients || !patientQuery.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                        <Search className="h-4 w-4" />
                        {searchingPatients ? 'Searching' : 'Search'}
                      </button>
                    </div>
                    {patientResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            disabled={patient.consent_status !== 'active'}
                            onClick={() => setSelectedPatient(patient)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span>
                              <span className="block font-medium text-slate-900">{patient.first_name} {patient.last_name}</span>
                              <span className="text-xs text-slate-500">Patient no. {patient.unique_patient_number}</span>
                            </span>
                            <span className="text-xs capitalize text-slate-500">
                              {patient.consent_status === 'active' ? 'Select' : 'Access required'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {patientResults.length === 0 && patientQuery.trim() && !searchingPatients && (
                      <p className="text-xs text-slate-500">Search for a patient and select one with active access.</p>
                    )}
                  </>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date and time</label>
              <input name="scheduled_at" type="datetime-local" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <input name="reason" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea name="notes" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={3} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
