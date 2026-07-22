import { supabaseAdmin } from '../../../../config/supabase';
import type { ImportBatch, ImportRowResult, ImportBatchStatus } from '../../domain/entities/import-batch';

export const importRepository = {
  async createBatch(input: Omit<ImportBatch, 'id' | 'created_at' | 'updated_at'>): Promise<ImportBatch> {
    const { data, error } = await supabaseAdmin
      .from('import_batches')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBatchById(id: string): Promise<ImportBatch | null> {
    const { data, error } = await supabaseAdmin
      .from('import_batches')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async listBatchRows(batchId: string, page = 1, pageSize = 50): Promise<{ data: ImportRowResult[]; total: number }> {
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

  async saveRowResults(rows: Omit<ImportRowResult, 'id' | 'created_at'>[]): Promise<void> {
    // Supabase allows bulk inserts up to a limit. If rows > 1000, chunk it.
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.from('import_row_results').insert(chunk);
      if (error) throw error;
    }
  },

  async updateBatchStatus(id: string, status: ImportBatchStatus, counts?: { total_rows?: number; valid_rows?: number; invalid_rows?: number; error_message?: string }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('import_batches')
      .update({ status, ...counts, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async commitBatchRows(batchId: string, validRows: any[], actorId: string): Promise<void> {
    // Insert into youth_profiles
    const profilesToInsert = validRows.map(r => ({
      ...r,
      created_by: actorId,
    }));

    const chunkSize = 500;
    for (let i = 0; i < profilesToInsert.length; i += chunkSize) {
      const chunk = profilesToInsert.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.from('youth_profiles').insert(chunk);
      if (error) throw error;
    }

    // Update batch status
    await this.updateBatchStatus(batchId, 'COMMITTED');
  }
};
