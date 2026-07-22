import { apiClient } from '../../../infrastructure/api-client';

export type YouthRecordStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'ARCHIVED';

export type YouthRecord = {
  id: string; 
  display_name: string; 
  birth_date: string; 
  age_at_submission: number;
  version: number;
  status: YouthRecordStatus;
  barangay_id: string; 
  category_id: string; 
  created_at: string;
  sex_label?: string; 
  civil_status_label?: string; 
  youth_classification_label?: string;
  youth_age_group_label?: string; 
  educational_attainment_label?: string; 
  work_status_label?: string;
  email?: string; 
  contact_number?: string;
  custom_values?: Record<string, unknown>;
};

export type YouthRecordDetail = YouthRecord & {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  sex_assigned_at_birth_id?: string | null;
  civil_status_id?: string | null;
  youth_classification_id?: string | null;
  educational_attainment_id?: string | null;
  work_status_id?: string | null;
  is_registered_voter: boolean;
  voted_last_election?: boolean | null;
  attended_kk_assembly: boolean;
  kk_assembly_count?: number;
  custom_values?: Record<string, unknown>;
};

export type AuditLog = {
  id: string;
  record_id: string;
  action: string;
  actor_id: string;
  actor_name?: string;
  created_at: string;
  details?: Record<string, any>;
};

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category_id?: string;
  barangay_id?: string;
}

export type CreateInput = {
  category_id: string;
  barangay_id?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  birth_date: string;
  sex_assigned_at_birth_id?: string;
  civil_status_id?: string;
  youth_classification_id?: string;
  educational_attainment_id?: string;
  work_status_id?: string;
  email?: string;
  contact_number?: string;
  is_registered_voter: boolean;
  voted_last_election: boolean;
  attended_kk_assembly: boolean;
  kk_assembly_count: number;
  custom_values?: Record<string, unknown>;
  submit_on_create?: boolean;
};

export type UpdateInput = Partial<CreateInput> & { version: number; submit_on_update?: boolean };

export const youthRecordApi = {
  async list(params: ListParams = {}): Promise<{ data: YouthRecord[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.category_id) query.append('categoryId', params.category_id);
    if (params.barangay_id) query.append('barangayId', params.barangay_id);

    const res = await apiClient.request<{ data: YouthRecord[]; meta: any }>(`/youth-records?${query.toString()}`);
    return res;
  },

  async getById(id: string): Promise<{ data: YouthRecordDetail }> {
    return await apiClient.request<{ data: YouthRecordDetail }>(`/youth-records/${id}`);
  },

  async create(data: CreateInput): Promise<{ data: YouthRecord }> {
    return await apiClient.request<{ data: YouthRecord }>('/youth-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateInput): Promise<{ data: YouthRecord }> {
    return await apiClient.request<{ data: YouthRecord }>(`/youth-records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async submit(id: string): Promise<void> {
    await apiClient.request(`/youth-records/${id}/submit`, { method: 'POST' });
  },

  async returnRecord(id: string, reason: string): Promise<void> {
    await apiClient.request(`/youth-records/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async approve(id: string): Promise<void> {
    await apiClient.request(`/youth-records/${id}/approve`, { method: 'POST' });
  },

  async archive(id: string): Promise<void> {
    await apiClient.request(`/youth-records/${id}/archive`, { method: 'POST' });
  },

  async restore(id: string): Promise<void> {
    await apiClient.request(`/youth-records/${id}/restore`, { method: 'POST' });
  },

  async getHistory(id: string): Promise<{ data: AuditLog[] }> {
    return await apiClient.request<{ data: AuditLog[] }>(`/youth-records/${id}/history`);
  },
};
