import { supabaseAdmin } from '../../../../config/supabase';
import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export const getRecordHistory = async (id: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) throw YouthRecordErrors.NOT_FOUND;

  if (authContext.role === 'SK_OFFICIAL' && record.barangay_id !== authContext.barangayId) {
    throw YouthRecordErrors.BARANGAY_MISMATCH;
  }

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('*, actor:profiles(full_name)')
    .eq('entity_type', 'YOUTH_RECORD')
    .eq('entity_id', id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data;
};
