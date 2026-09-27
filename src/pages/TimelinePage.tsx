import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Stethoscope, Pill, AlertTriangle, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Allergy, Consultation, Medication, OutletContext } from '../lib/types';
import { formatDate } from '../lib/dates';
import Modal from '../components/ui/Modal';

type TimelineItem = {
  id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  detail?: string;
};

export default function TimelinePage() {
  const { profile } = useOutletContext<OutletContext>();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const patientId = profile.id;
      const [{ data: consultations }, { data: medications }, { data: allergies }] = await Promise.all([
        supabase.from('consultations').select('*').eq('patient_id', patientId).order('date_time', { ascending: false }),
        supabase.from('medications').select('*').eq('patient_id', patientId).order('start_date', { ascending: false }),
        supabase.from('allergies').select('*').eq('patient_id', patientId).order('date_recorded', { ascending: false }),
      ]);

      const mapped: TimelineItem[] = [
        ...((consultations as Consultation[]) || []).map((c) => ({
          id: c.id,
          date: c.date_time,
          type: 'consultation',
          title: c.diagnosis || c.chief_complaint || 'Consultation',
          description: c.symptoms || c.treatment_plan || 'Clinical visit',
          detail: [c.chief_complaint, c.examination, c.observations, c.notes].filter(Boolean).join('\n'),
        })),
        ...((medications as Medication[]) || []).map((m) => ({
          id: m.id,
          date: m.start_date || '',
          type: 'prescription',
          title: m.name,
          description: [m.dosage, m.frequency, m.reason].filter(Boolean).join(' · '),
        })),
        ...((allergies as Allergy[]) || []).map((a) => ({
          id: a.id,
          date: a.date_recorded || '',
          type: 'allergy',
          title: `Allergy: ${a.substance}`,
          description: [a.reaction, a.severity].filter(Boolean).join(' · '),
        })),
      ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      setItems(mapped);
      setLoading(false);
    }
    load();
  }, [profile.id]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.type === filter)),
    [items, filter],
  );

  const iconFor = (type: string) => {
    if (type === 'prescription') return { Icon: Pill, color: 'bg-green-100 text-green-600' };
    if (type === 'allergy') return { Icon: AlertTriangle, color: 'bg-red-100 text-red-600' };
    return { Icon: Stethoscope, color: 'bg-blue-100 text-blue-600' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Medical Timeline</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All events</option>
            <option value="consultation">Consultations</option>
            <option value="prescription">Medications</option>
            <option value="allergy">Allergies</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading timeline...</p>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No records yet. They will appear here after a consultation.
        </div>
      ) : (
        <div className="relative border-l border-slate-200 ml-4 space-y-8 pb-8">
          {visible.map((item) => {
            const { Icon, color } = iconFor(item.type);
            return (
              <div key={item.id} className="relative pl-8">
                <div className={`absolute -left-5 top-1 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => setSelected(item)} className="text-sm font-medium text-slate-500 hover:text-primary">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p className="text-sm text-slate-500 mb-3">{formatDate(selected.date)} · {selected.type}</p>
          <p className="text-slate-700 whitespace-pre-wrap">{selected.detail || selected.description}</p>
        </Modal>
      )}
    </div>
  );
}
