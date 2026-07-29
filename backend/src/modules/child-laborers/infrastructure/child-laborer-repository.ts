import { supabaseAdmin } from '../../../config/supabase';
import type {
  ChildLaborerRecord,
  ChildLaborerStatus,
  ChildLaborerWriteInput,
} from '../domain/child-laborer';
import {
  CHILD_LABORER_SELECT,
  childLaborerOrderClauses,
  type ChildLaborerSort,
} from './child-laborer-query';
import { buildChildLaborerSummary } from '../domain/child-laborer-summary';
import { toChildLaborerPresentation } from './child-laborer-presenter';

const TABLE = 'child_laborer_records';

export type ChildLaborerFilters = {
  categoryId?: string;
  filingYear?: number;
  barangayId?: string | null;
  status?: ChildLaborerStatus;
  search?: string;
  sort?: ChildLaborerSort;
};

const safeSearchTerm = (value: string) => value
  .replace(/[^\p{L}\p{N}\s.'-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const applyFilters = (query: any, filters: ChildLaborerFilters) => {
  let filteredQuery = query;
  if (filters.categoryId) filteredQuery = filteredQuery.eq('category_id', filters.categoryId);
  if (filters.filingYear) filteredQuery = filteredQuery.eq('filing_year', filters.filingYear);
  if (filters.barangayId) filteredQuery = filteredQuery.eq('barangay_id', filters.barangayId);
  if (filters.status) {
    filteredQuery = filteredQuery.eq('record_status', filters.status);
  } else {
    filteredQuery = filteredQuery.neq('record_status', 'ARCHIVED');
  }

  const search = filters.search ? safeSearchTerm(filters.search) : '';
  if (search) {
    filteredQuery = filteredQuery.or(
      `first_name.ilike.%${search}%,middle_name.ilike.%${search}%,last_name.ilike.%${search}%,nature_of_work.ilike.%${search}%`,
    );
  }
  return filteredQuery;
};

const listQuery = (filters: ChildLaborerFilters) => {
  let query = applyFilters(
    supabaseAdmin.from(TABLE).select(CHILD_LABORER_SELECT, { count: 'exact' }),
    filters,
  );
  for (const clause of childLaborerOrderClauses(filters.sort)) {
    query = query.order(clause.column, { ascending: clause.ascending });
  }
  return query;
};

const summaryQuery = (filters: ChildLaborerFilters) => applyFilters(
  supabaseAdmin.from(TABLE).select(`
    filing_year,
    category_id,
    barangay_id,
    birth_date,
    gender,
    attending_school,
    highest_grade_completed,
    nature_of_work,
    parent_guardian_occupation,
    record_status,
    barangay:barangays!barangay_id!inner(name)
  `),
  filters,
).order('id', { ascending: true });

const listForSummary = async (filters: ChildLaborerFilters) => {
  const records: any[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await summaryQuery(filters).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    records.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return records;
};

export const childLaborerRepository = {
  async list(filters: ChildLaborerFilters & { page: number; pageSize: number }) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    const { data, count, error } = await listQuery(filters).range(from, to);
    if (error) throw new Error(error.message);

    const totalItems = count ?? 0;
    return {
      data: (data ?? []).map((record: any, index: number) => (
        toChildLaborerPresentation(record, from + index + 1)
      )),
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
      },
    };
  },

  async listForExport(filters: ChildLaborerFilters) {
    const records: any[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await listQuery(filters).range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = data ?? [];
      records.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    return records.map((record, index) => toChildLaborerPresentation(record, index + 1));
  },

  async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(CHILD_LABORER_SELECT)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return toChildLaborerPresentation(data);
  },

  async findDuplicate(input: {
    filingYear: number;
    barangayId: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    excludeId?: string;
  }) {
    let query = supabaseAdmin
      .from(TABLE)
      .select('id')
      .eq('filing_year', input.filingYear)
      .eq('barangay_id', input.barangayId)
      .ilike('first_name', input.firstName)
      .ilike('last_name', input.lastName)
      .eq('birth_date', input.birthDate)
      .neq('record_status', 'ARCHIVED');
    if (input.excludeId) query = query.neq('id', input.excludeId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  },

  async create(input: ChildLaborerWriteInput & { created_by: string; updated_by: string }) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(input)
      .select(CHILD_LABORER_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toChildLaborerPresentation(data);
  },

  async update(
    id: string,
    input: Partial<ChildLaborerWriteInput> & { updated_by: string },
    expectedVersion: number,
  ) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ ...input, version: expectedVersion + 1 })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select(CHILD_LABORER_SELECT)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return toChildLaborerPresentation(data);
  },

  async summary(filters: Pick<ChildLaborerFilters, 'categoryId' | 'filingYear' | 'barangayId' | 'status' | 'search'>) {
    return buildChildLaborerSummary(await listForSummary(filters));
  },
};

export type ChildLaborerPresentation = Awaited<ReturnType<typeof childLaborerRepository.getById>>;
export type StoredChildLaborer = ChildLaborerRecord;
