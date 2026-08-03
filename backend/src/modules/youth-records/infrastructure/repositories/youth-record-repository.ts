import { supabaseAdmin } from '../../../../config/supabase';
import type { YouthRecord, RecordStatus } from '../../domain/entities/youth-record';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';
import { toYouthRecordPresentation } from './youth-record-presenter';
import {
  getYouthRecordOrderClauses,
  YOUTH_RECORD_LIST_SELECT,
} from './youth-record-list-query';

const withStatusCompatibility = (recordData: any) => (
  recordData.status
    ? { ...recordData, youth_profile_status: recordData.status }
    : recordData
);

const isMissingStatusCompatibilityColumn = (error: any) =>
  typeof error?.message === 'string' &&
  error.message.includes('youth_profile_status') &&
  error.message.includes('column');

export interface ListRecordsFilters {
  recordType?: 'YOUTH_PROFILE' | 'OUT_OF_SCHOOL_YOUTH';
  barangayId?: string;
  categoryId?: string;
  status?: RecordStatus;
  search?: string;
  filingYear?: number;
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
      .select(YOUTH_RECORD_LIST_SELECT, { count: 'exact' })
      .is('deleted_at', null);

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
    let categoryQuery = supabaseAdmin
      .from('categories')
      .select('id')
      .eq('record_type', filters.recordType ?? 'YOUTH_PROFILE')
      .is('deleted_at', null);
    if (filters.filingYear) categoryQuery = categoryQuery.eq('filing_year', filters.filingYear);
    const { data: registryCategories, error: categoryError } = await categoryQuery;
    if (categoryError) throw new Error(categoryError.message);
    const categoryIds = (registryCategories ?? []).map((category: { id: string }) => category.id);
    if (filters.categoryId && !categoryIds.includes(filters.categoryId)) {
      return { data: [], meta: { page, pageSize, totalItems: 0, totalPages: 1 } };
    }
    if (!filters.categoryId) {
      if (categoryIds.length === 0) {
        return { data: [], meta: { page, pageSize, totalItems: 0, totalPages: 1 } };
      }
      query = query.in('category_id', categoryIds);
    }
    for (const clause of getYouthRecordOrderClauses(filters.sort)) {
      query = query.order(clause.column, { ascending: clause.ascending });
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const totalItems = count ?? 0;
    return {
      data: (data ?? []).map((record: any, index: number) => toYouthRecordPresentation(record, from + index + 1)),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  },

  async getRecordById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('youth_profiles')
      .select(
        '*, barangay:barangays!barangay_id(name, municipality, province), '
        + 'category:categories!category_id(name, filing_year, record_type), '
        + 'sex:reference_options!sex_assigned_at_birth_id(label), '
        + 'civil:reference_options!civil_status_id(label), '
        + 'classification:reference_options!youth_classification_id(label), '
        + 'age_group:reference_options!youth_age_group_id(label), '
        + 'education:reference_options!educational_attainment_id(label), '
        + 'work:reference_options!work_status_id(label)'
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return toYouthRecordPresentation(data);
  },

  async createRecord(recordData: any) {
    const insertRecord = async (dataToInsert: any) => supabaseAdmin
      .from('youth_profiles')
      .insert(dataToInsert)
      .select()
      .single();

    let { data, error } = await insertRecord(withStatusCompatibility(recordData));
    if (error && isMissingStatusCompatibilityColumn(error)) {
      ({ data, error } = await insertRecord(recordData));
    }

    if (error) throw new Error(error.message);
    return data as YouthRecord;
  },

  async updateRecord(id: string, recordData: any, expectedVersion: number) {
    const updateRecord = async (dataToUpdate: any) => supabaseAdmin
      .from('youth_profiles')
      .update({ ...dataToUpdate, version: expectedVersion + 1 })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single();

    let { data, error } = await updateRecord(withStatusCompatibility(recordData));
    if (error && isMissingStatusCompatibilityColumn(error)) {
      ({ data, error } = await updateRecord(recordData));
    }

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

  async approveDraftRecords(actorId: string) {
    const { data: categories, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('record_type', 'YOUTH_PROFILE')
      .is('deleted_at', null);
    if (categoryError) throw new Error(categoryError.message);
    const categoryIds = (categories ?? []).map((category) => category.id);
    if (categoryIds.length === 0) return 0;

    const approvedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('youth_profiles')
      .update({
        status: 'APPROVED',
        submitted_by: actorId,
        submitted_at: approvedAt,
        approved_by: actorId,
        approved_at: approvedAt,
        updated_by: actorId,
      })
      .eq('status', 'DRAFT')
      .in('category_id', categoryIds)
      .is('deleted_at', null)
      .select('id');

    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  },

  async approveSubmittedRecordsByBarangay(actorId: string, barangayId: string, filingYear?: number) {
    let categoryIds: string[] | null = null;
    if (filingYear) {
      const { data: categories, error: categoryError } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('filing_year', filingYear)
        .eq('record_type', 'YOUTH_PROFILE')
        .is('deleted_at', null);
      if (categoryError) throw new Error(categoryError.message);
      categoryIds = (categories ?? []).map((category) => category.id);
      if (categoryIds.length === 0) return 0;
    }

    const approvedAt = new Date().toISOString();
    let query = supabaseAdmin
      .from('youth_profiles')
      .update({
        status: 'APPROVED',
        approved_by: actorId,
        approved_at: approvedAt,
        updated_by: actorId,
      })
      .eq('barangay_id', barangayId)
      .eq('status', 'SUBMITTED')
      .is('deleted_at', null);
    if (categoryIds) query = query.in('category_id', categoryIds);

    const { data, error } = await query.select('id');
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
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
