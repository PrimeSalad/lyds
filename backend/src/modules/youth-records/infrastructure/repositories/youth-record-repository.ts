import { supabaseAdmin } from '../../../../config/supabase';
import type { YouthRecord, RecordStatus } from '../../domain/entities/youth-record';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export interface ListRecordsFilters {
  barangayId?: string;
  categoryId?: string;
  status?: RecordStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export const youthRecordRepository = {
  async listRecords(filters: ListRecordsFilters) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from('youth_profiles')
      .select('*, barangay:barangays(name), category:categories(name)', { count: 'exact' });

    if (filters.barangayId) {
      query = query.eq('barangay_id', filters.barangayId);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.ilike('display_name', `%${filters.search}%`);
    }
    if (filters.sort) {
      query = query.order(filters.sort.field, { ascending: filters.sort.direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return {
      data: data as any[],
      totalItems: count || 0,
    };
  },

  async getRecordById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('youth_profiles')
      .select('*, barangay:barangays(name), category:categories(name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data as any;
  },

  async createRecord(recordData: any) {
    const { data, error } = await supabaseAdmin
      .from('youth_profiles')
      .insert(recordData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as YouthRecord;
  },

  async updateRecord(id: string, recordData: any, expectedVersion: number) {
    const { data, error } = await supabaseAdmin
      .from('youth_profiles')
      .update({ ...recordData, version: expectedVersion + 1 })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw YouthRecordErrors.VERSION_CONFLICT;
      }
      throw new Error(error.message);
    }
    if (!data) throw YouthRecordErrors.VERSION_CONFLICT;
    return data as YouthRecord;
  },

  async transitionStatus(id: string, newStatus: RecordStatus, _actorId: string, extra: any = {}) {
    const record = await this.getRecordById(id);
    if (!record) throw YouthRecordErrors.NOT_FOUND;

    return await this.updateRecord(id, {
      status: newStatus,
      ...extra,
    }, record.version);
  },

  async checkDuplicates(barangayId: string, displayName: string, birthDate: string, excludeId?: string) {
    let query = supabaseAdmin
      .from('youth_profiles')
      .select('id, display_name')
      .eq('barangay_id', barangayId)
      .eq('display_name', displayName)
      .eq('birth_date', birthDate);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return data as { id: string, display_name: string }[];
  }
};
