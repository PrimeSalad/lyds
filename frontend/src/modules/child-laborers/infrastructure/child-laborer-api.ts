import type {
  ChildLaborerListResponse,
  ChildLaborerGender,
  ChildLaborerRecord,
  ChildLaborerStatus,
  ChildLaborerSummary,
  CreateChildLaborerInput,
  UpdateChildLaborerInput,
} from '../../../generated/api/api-types';
import { apiClient } from '../../../infrastructure/api-client';
import { buildChildLaborerSummary } from '../domain/child-laborer-summary';

type ChildLaborerSummaryPayload = Partial<ChildLaborerSummary> & Pick<
  ChildLaborerSummary,
  'total_records' | 'attending_school' | 'not_attending_school' | 'active_cases' | 'closed_cases'
>;

const normalizeSummary = (summary: ChildLaborerSummaryPayload): ChildLaborerSummary => ({
  ...summary,
  status_counts: summary.status_counts ?? {},
  gender_distribution: summary.gender_distribution ?? [],
  age_distribution: summary.age_distribution ?? [],
  barangay_distribution: summary.barangay_distribution ?? [],
  work_distribution: summary.work_distribution ?? [],
  data_quality: summary.data_quality ?? {
    completeness_percentage: 0,
    complete_records: 0,
    records_with_grade: 0,
    records_with_parent_occupation: 0,
    records_with_specified_work: 0,
  },
});

const hasFullAnalytics = (summary: ChildLaborerSummaryPayload) => (
  Array.isArray(summary.gender_distribution)
  && Array.isArray(summary.age_distribution)
  && Array.isArray(summary.barangay_distribution)
  && Array.isArray(summary.work_distribution)
  && Boolean(summary.data_quality)
);

export type ChildLaborerSortField =
  | 'child_name'
  | 'barangay_name'
  | 'birth_date'
  | 'gender'
  | 'record_status'
  | 'created_at';

export type ChildLaborerListParams = {
  categoryId?: string;
  filingYear?: number;
  barangayId?: string;
  status?: ChildLaborerStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sortField?: ChildLaborerSortField;
  sortDir?: 'asc' | 'desc';
};

const queryString = (params: ChildLaborerListParams) => {
  const query = new URLSearchParams();
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.filingYear) query.set('filingYear', String(params.filingYear));
  if (params.barangayId) query.set('barangayId', params.barangayId);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.sortField) query.set('sortField', params.sortField);
  if (params.sortDir) query.set('sortDir', params.sortDir);
  return query.toString();
};

const listAllForAnalytics = async (params: ChildLaborerListParams) => {
  const records: ChildLaborerRecord[] = [];
  let page = 1;
  while (true) {
    const result = await apiClient.request<ChildLaborerListResponse>(`/child-laborers?${queryString({
      ...params,
      page,
      pageSize: 100,
      sortField: 'barangay_name',
      sortDir: 'asc',
    })}`);
    records.push(...result.data);
    if (page >= result.meta.totalPages) break;
    page += 1;
  }
  return records;
};

export const childLaborerApi = {
  list: (params: ChildLaborerListParams) => (
    apiClient.request<ChildLaborerListResponse>(`/child-laborers?${queryString(params)}`)
  ),

  get: (id: string) => apiClient.request<{ data: ChildLaborerRecord }>(`/child-laborers/${id}`),

  create: (input: CreateChildLaborerInput) => apiClient.request<{ data: ChildLaborerRecord }>('/child-laborers', {
    method: 'POST',
    body: JSON.stringify(input),
  }),

  update: (id: string, input: UpdateChildLaborerInput) => (
    apiClient.request<{ data: ChildLaborerRecord }>(`/child-laborers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  ),

  archive: (id: string) => apiClient.request<{ data: ChildLaborerRecord }>(`/child-laborers/${id}/archive`, {
    method: 'POST',
  }),

  restore: (id: string) => apiClient.request<{ data: ChildLaborerRecord }>(`/child-laborers/${id}/restore`, {
    method: 'POST',
  }),

  summary: async (params: {
    categoryId?: string;
    filingYear?: number;
    barangayId?: string;
    status?: ChildLaborerStatus;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.filingYear) query.set('filingYear', String(params.filingYear));
    if (params.barangayId) query.set('barangayId', params.barangayId);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const response = await apiClient.request<{ data: ChildLaborerSummaryPayload }>(`/child-laborers/summary?${query}`);
    if (!hasFullAnalytics(response.data)) {
      const records = await listAllForAnalytics({
        filingYear: params.filingYear,
        barangayId: params.barangayId,
        status: params.status,
        search: params.search,
      });
      return { data: buildChildLaborerSummary(records) };
    }
    return { data: normalizeSummary(response.data) };
  },

  export: (params: {
    categoryId?: string;
    format: 'csv' | 'xlsx';
    filingYear: number;
    barangayId?: string;
    status?: ChildLaborerStatus;
    search?: string;
  }) => {
    const query = new URLSearchParams({
      format: params.format,
      filingYear: String(params.filingYear),
    });
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.barangayId) query.set('barangayId', params.barangayId);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiClient.request<Blob>(`/child-laborers/export?${query}`);
  },
};

export type {
  ChildLaborerGender,
  ChildLaborerRecord,
  ChildLaborerStatus,
  ChildLaborerSummary,
  CreateChildLaborerInput,
  UpdateChildLaborerInput,
};
