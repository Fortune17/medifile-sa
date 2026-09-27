import { supabase } from './supabase';

export async function logAudit(params: {
  actorId: string;
  patientId?: string;
  action: string;
  tableName?: string;
  recordId?: string;
}) {
  await supabase.from('audit_logs').insert({
    actor_id: params.actorId,
    patient_id: params.patientId ?? null,
    action: params.action,
    table_name: params.tableName ?? null,
    record_id: params.recordId ?? null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
}
