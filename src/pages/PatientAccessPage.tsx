import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Shield, Clock, XCircle, CheckCircle, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Consent, OutletContext } from '../lib/types';
import { formatDate } from '../lib/dates';
import { logAudit } from '../lib/audit';

export default function PatientAccessPage() {
  const { profile } = useOutletContext<OutletContext>();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsents();
  }, [profile.id]);

  const fetchConsents = async () => {
    const { data } = await supabase
      .from('consents')
      .select('id, patient_id, provider_id, granted_at, expires_at, access_level, status')
      .eq('patient_id', profile.id)
      .in('status', ['active', 'pending'])
      .order('granted_at', { ascending: false });

    const rows = (data as Consent[]) || [];
    const withNames = await Promise.all(rows.map(async (consent) => {
      const { data: provider } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', consent.provider_id)
        .maybeSingle();
      return {
        ...consent,
        provider_name: provider ? `Dr. ${provider.first_name} ${provider.last_name}` : 'Healthcare provider',
      };
    }));
    setConsents(withNames);
    setLoading(false);
  };

  const handleRevoke = async (id: string) => {
    await supabase.from('consents').update({ status: 'revoked' }).eq('id', id);
    await logAudit({ actorId: profile.id, patientId: profile.id, action: 'revoked_consent', tableName: 'consents', recordId: id });
    fetchConsents();
  };

  const handleApprove = async (id: string) => {
    await supabase.from('consents').update({ status: 'active', granted_at: new Date().toISOString() }).eq('id', id);
    await logAudit({ actorId: profile.id, patientId: profile.id, action: 'approved_consent', tableName: 'consents', recordId: id });
    fetchConsents();
  };

  const generateQR = async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('create_access_token');
    if (rpcError) {
      const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('access_tokens')
        .insert({ patient_id: profile.id, expires_at: expires })
        .select('token, expires_at')
        .single();
      if (insertError || !inserted) {
        setError(rpcError.message + (insertError ? ` / ${insertError.message}` : '') + '. Run schema_complete.sql in Supabase.');
        return;
      }
      setQrValue(inserted.token);
      setExpiresAt(inserted.expires_at);
      setShowQR(true);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setQrValue(row.token);
    setExpiresAt(row.expires_at);
    setShowQR(true);
  };

  if (profile.role !== 'patient') return <div>Access Denied. Only patients manage consent.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Access Control</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Temporary Clinic Access</h3>
          <p className="text-slate-600 text-sm mt-2 mb-6">
            Visiting a new doctor? Generate a secure QR code they can scan to request temporary access to your records.
          </p>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          {!showQR ? (
            <button onClick={generateQR} className="bg-primary text-white hover:bg-primary-hover px-6 py-3 rounded-xl font-medium w-full">
              Generate QR Code
            </button>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="bg-white p-4 rounded-lg border-2 border-primary mb-4">
                <QRCode value={qrValue} size={150} />
              </div>
              <p className="text-xs font-mono bg-slate-50 px-2 py-1 rounded mb-2 break-all">{qrValue}</p>
              <p className="text-xs text-red-500 font-medium mb-4 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> Expires {expiresAt ? formatDate(expiresAt, 'dd MMM HH:mm') : 'in 30 minutes'}
              </p>
              <button onClick={() => setShowQR(false)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium w-full">
                Hide QR Code
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 mr-2 text-primary" /> Permissions
          </h3>

          {loading ? (
            <div className="text-sm text-slate-500">Loading permissions...</div>
          ) : consents.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No active or pending permissions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {consents.map((consent) => (
                <div key={consent.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 gap-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{consent.provider_name}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      {consent.status === 'active' ? (
                        <><CheckCircle className="w-3 h-3 mr-1 text-green-500" /> {consent.access_level || 'Full'} access</>
                      ) : (
                        <>Pending approval</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {consent.status === 'pending' && (
                      <button onClick={() => handleApprove(consent.id)} className="text-xs bg-primary text-white px-2 py-1 rounded-md">Approve</button>
                    )}
                    <button onClick={() => handleRevoke(consent.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-md" title="Revoke Access">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
