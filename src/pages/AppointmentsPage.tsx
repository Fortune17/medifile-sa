import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Appointment, OutletContext } from '../lib/types';
import { isProvider } from '../lib/types';
import { formatDate } from '../lib/dates';
import Modal from '../components/ui/Modal';

export default function AppointmentsPage() {
  const { profile } = useOutletContext<OutletContext>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    let query = supabase.from('appointments').select('*').order('scheduled_at', { ascending: true });
    if (profile.role === 'patient') query = query.eq('patient_id', profile.id);
    else query = query.eq('provider_id', profile.id);
    const { data } = await query;
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile.id, profile.role]);

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
      payload.patient_id = String(form.get('patient_id'));
    }
    const { error: insertError } = await supabase.from('appointments').insert(payload);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setShowForm(false);
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID (UUID)</label>
                <input name="patient_id" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="From the patient record URL" />
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
