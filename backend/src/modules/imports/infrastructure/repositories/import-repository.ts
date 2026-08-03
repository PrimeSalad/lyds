import { supabaseAdmin } from '../../../../config/supabase';
import type {
  CommitImportResult,
  ImportBatch,
  ImportRowResult,
  ImportBatchStatus,
} from '../../domain/entities/import-batch';
import { toImportBatchPresentation } from './import-batch-presenter';

const BATCH_SELECT = (
  '*, barangay:barangays!barangay_id(name), category:categories!category_id(name, filing_year, record_type), '
  + 'uploader:profiles!uploaded_by(full_name)'
);

export const importRepository = {
  createBatch: async (input: Omit<ImportBatch, 'id' | 'created_at' | 'updated_at' | 'record_type'>): Promise<ImportBatch> => {
    const { data, error } = await supabaseAdmin
      .from('import_batches')
      .insert(input)
      .select(BATCH_SELECT)
      .single();
    if (error) throw error;
    return toImportBatchPresentation(data);
  },

  getBatchById: async (id: string): Promise<ImportBatch | null> => {
    const { data, error } = await supabaseAdmin
      .from('import_batches')
      .select(BATCH_SELECT)
      .eq('id', id)
      .single();
    if (error) return null;
    return toImportBatchPresentation(data);
  },

  listBatches: async (options: {
    barangayId?: string | null;
    status?: ImportBatchStatus;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ data: ImportBatch[]; total: number }> => {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    let query = supabaseAdmin
      .from('import_batches')
      .select(BATCH_SELECT, { count: 'exact' });
    if (options.barangayId) query = query.eq('barangay_id', options.barangayId);
    if (options.status) query = query.eq('status', options.status);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    return { data: (data ?? []).map(toImportBatchPresentation), total: count ?? 0 };
  },

  listBatchRows: async (batchId: string, page = 1, pageSize = 50): Promise<{ data: ImportRowResult[]; total: number }> => {
    const offset = (page - 1) * pageSize;
    const { data, error, count } = await supabaseAdmin
      .from('import_row_results')
      .select('*', { count: 'exact' })
      .eq('batch_id', batchId)
      .order('row_number')
      .range(offset, offset + pageSize - 1);
      
    if (error) throw error;
    return { data: data ?? [], total: count ?? 0 };
  },

  saveRowResults: async (rows: Omit<ImportRowResult, 'id' | 'created_at'>[]): Promise<void> => {
    // Supabase allows bulk inserts up to a limit. If rows > 1000, chunk it.
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.from('import_row_results').insert(chunk);
      if (error) throw error;
    }
  },

  updateBatchStatus: async (id: string, status: ImportBatchStatus, counts?: { total_rows?: number; valid_rows?: number; invalid_rows?: number; duplicate_rows?: number; error_message?: string | null }): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('import_batches')
      .update({ status, ...counts, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  commitBatchRows: async (
    batchId: string,
    actorId: string,
    recordType: ImportBatch['record_type'],
  ): Promise<CommitImportResult> => {
    const functionName = recordType === 'CHILD_LABORER'
      ? 'commit_child_laborer_import_batch'
      : 'commit_youth_import_batch';
    const { data, error } = await supabaseAdmin.rpc(functionName, {
      p_batch_id: batchId,
      p_actor_id: actorId,
    });
    if (error) throw error;
    return data as CommitImportResult;
  },
};
