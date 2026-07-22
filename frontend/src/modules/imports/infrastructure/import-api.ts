import { apiClient } from '../../../infrastructure/api-client';

export type ImportBatch = {
  id: string;
  category_id: string;
  barangay_id: string;
  file_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  status: string;
  created_at: string;
};

export type ImportRow = {
  id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  normalized_data: Record<string, unknown> | null;
  validation_errors: string[] | null;
  validation_warnings: string[] | null;
  is_valid: boolean;
  duplicate_match_id: string | null;
};

export const importApi = {
  validate: (data: { categoryId: string; barangayId?: string; fileData: string; fileName: string; fileType: string }) =>
    apiClient.request<{ data: ImportBatch }>('/imports/validate', { method: 'POST', body: JSON.stringify(data) }),
  getBatch: (batchId: string) => apiClient.request<{ data: ImportBatch }>(`/imports/${batchId}`),
  listRows: (batchId: string, page?: number) => apiClient.request<{ data: ImportRow[], meta: { page: number; totalItems: number; totalPages: number } }>(`/imports/${batchId}/rows?page=${page || 1}`),
  commit: (batchId: string) => apiClient.request<{ data: ImportBatch }>(`/imports/${batchId}/commit`, { method: 'POST' }),
  cancel: (batchId: string) => apiClient.request(`/imports/${batchId}/cancel`, { method: 'POST' }),
  downloadTemplate: () => apiClient.request<Blob>('/imports/template'),
  downloadErrorFile: (batchId: string) => apiClient.request<Blob>(`/imports/${batchId}/error-file`),
};
