import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Medication, OutletContext } from '../lib/types';
import { formatDate } from '../lib/dates';

export default function MedicationsPage() {
  const { profile } = useOutletContext<OutletContext>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('medications')
      .select('*')
      .eq('patient_id', profile.id)
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setMedications((data as Medication[]) || []);
        setLoading(false);
      });
  }, [profile.id]);

  if (profile.role !== 'patient') {
    return <p className="text-slate-600">Open a patient record to view or prescribe medications.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Medications</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center">
            <Pill className="w-5 h-5 mr-2 text-primary" /> Current & Past Medications
          </h2>
        </div>
        {loading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : medications.length === 0 ? (
          <p className="p-6 text-slate-500">No medications on file.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {medications.map((med) => (
              <div key={med.id} className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {med.name} <span className="text-sm font-normal text-slate-500 ml-2">{med.dosage}</span>
                    </h3>
                    <p className="text-slate-600 mt-1">{med.frequency}{med.route ? ` · ${med.route}` : ''}</p>
                    {med.reason && <p className="text-sm text-slate-500 mt-1">{med.reason}</p>}
                    <p className="text-xs text-slate-400 mt-2">Started: {formatDate(med.start_date)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    med.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {med.status || 'unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
