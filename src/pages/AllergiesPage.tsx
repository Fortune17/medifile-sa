import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Allergy, OutletContext } from '../lib/types';
import { formatDate } from '../lib/dates';

export default function AllergiesPage() {
  const { profile } = useOutletContext<OutletContext>();
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('allergies')
      .select('*')
      .eq('patient_id', profile.id)
      .order('date_recorded', { ascending: false })
      .then(({ data }) => {
        setAllergies((data as Allergy[]) || []);
        setLoading(false);
      });
  }, [profile.id]);

  if (profile.role !== 'patient') {
    return <p className="text-slate-600">Open a patient record to view or record allergies.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Allergies</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-red-50">
          <h2 className="font-semibold text-red-800 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" /> Known allergies
          </h2>
        </div>
        {loading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : allergies.length === 0 ? (
          <p className="p-6 text-slate-500">No allergies recorded.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {allergies.map((item) => (
              <div key={item.id} className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.substance}</h3>
                    <p className="text-slate-600 mt-1">{item.reaction || 'Reaction not specified'}</p>
                    <p className="text-xs text-slate-400 mt-2">Recorded: {formatDate(item.date_recorded)}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 capitalize">
                    {item.severity || 'unspecified'}
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
