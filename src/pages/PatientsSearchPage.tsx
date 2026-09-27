import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { QrCode, Search, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { OutletContext } from '../lib/types';
import { isProvider } from '../lib/types';

type SearchHit = {
  id: string;
  first_name: string;
  last_name: string;
  unique_patient_number: string;
  consent_status: string;
};

export default function PatientsSearchPage() {
  const { profile } = useOutletContext<OutletContext>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get('q') || '');
  const [token, setToken] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get('q')) search(params.get('q') || '');
  }, [params]);

  if (!isProvider(profile.role)) {
    return <p className="text-slate-600">Patient search is only available to healthcare workers.</p>;
  }

  const search = async (value: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error: rpcError } = await supabase.rpc('search_patients', { p_query: value.trim() });
    if (rpcError) {
      setError(`${rpcError.message}. Run schema_complete.sql in the Supabase SQL editor to enable patient search.`);
      setResults([]);
    } else {
      setResults((data as SearchHit[]) || []);
      if (!data || data.length === 0) setMessage('No matching patient. Search by exact SA ID, patient number, or full name.');
    }
    setLoading(false);
  };

  const requestAccess = async (patientId: string) => {
    const { error: rpcError } = await supabase.rpc('request_patient_access', { p_patient_id: patientId });
    if (rpcError) {
      const { error: insertError } = await supabase.from('consents').insert({
        patient_id: patientId,
        provider_id: profile.id,
        status: 'pending',
        access_level: 'full',
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }
    setMessage('Access requested. The patient must approve it in Access Control.');
    search(query);
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('redeem_access_token', { p_token: token.trim() });
    if (rpcError || !data) {
      setError(rpcError?.message || 'Could not redeem token. Confirm schema_complete.sql has been applied.');
      return;
    }
    navigate(`/dashboard/patients/${data}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Patients</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center"><Search className="w-5 h-5 mr-2 text-primary" /> Search</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="SA ID, patient number, or full name"
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">Search</button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center"><QrCode className="w-5 h-5 mr-2 text-primary" /> Redeem clinic QR</h2>
          <form onSubmit={redeem} className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="Paste token from patient QR"
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">Open</button>
          </form>
          <p className="text-xs text-slate-500 mt-3">Grants 24-hour access after a valid patient QR token.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-sm flex gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {message && <div className="bg-teal-50 border border-teal-100 text-teal-800 p-3 rounded-lg text-sm">{message}</div>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-500">Searching...</p>
        ) : results.length === 0 ? (
          <p className="p-6 text-slate-500">No results yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map((hit) => (
              <div key={hit.id} className="p-4 sm:p-6 flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{hit.first_name} {hit.last_name}</p>
                  <p className="text-sm text-slate-500">Patient no. {hit.unique_patient_number}</p>
                  <p className="text-xs mt-1 capitalize text-slate-500">Consent: {hit.consent_status}</p>
                </div>
                {hit.consent_status === 'active' ? (
                  <Link to={`/dashboard/patients/${hit.id}`} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">Open record</Link>
                ) : (
                  <button onClick={() => requestAccess(hit.id)} className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium">
                    Request access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
