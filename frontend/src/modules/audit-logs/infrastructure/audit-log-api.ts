import { apiClient } from '../../../infrastructure/api-client';

export interface AuditLog {
  id: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  barangay_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const auditLogApi = {
  async list(options: { page?: number; pageSize?: number; entity_type?: string; action?: string } = {}): Promise<AuditLogListResponse> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.entity_type) params.set('entity_type', options.entity_type);
    if (options.action) params.set('action', options.action);

    const query = params.toString();
    const path = `/audit-logs${query ? `?${query}` : ''}`;
    return apiClient.request<AuditLogListResponse>(path);
  },

  async getById(id: string): Promise<AuditLog> {
    const res = await apiClient.request<{ data: AuditLog }>(`/audit-logs/${id}`);
    return res.data;
  },
};
