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

export type ChildLaborerSortField =
  | 'child_name'
  | 'barangay_name'
  | 'birth_date'
  | 'gender'
  | 'record_status'
  | 'created_at';

export type ChildLaborerListParams = {
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

  summary: (params: { filingYear?: number; barangayId?: string }) => {
    const query = new URLSearchParams();
    if (params.filingYear) query.set('filingYear', String(params.filingYear));
    if (params.barangayId) query.set('barangayId', params.barangayId);
    return apiClient.request<{ data: ChildLaborerSummary }>(`/child-laborers/summary?${query}`);
  },

  export: (params: {
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
