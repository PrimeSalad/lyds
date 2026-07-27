import { apiClient } from '../../../infrastructure/api-client';
import type {
  CommitImportResponse,
  ImportBatchListResponse,
  ImportBatchResponse,
  ImportBatchStatus,
  ImportRowListResponse,
  ValidateImportInput,
} from '../../../generated/api/api-types';

export type {
  CommitImportResult,
  ImportBatch,
  ImportBatchStatus,
  ImportRow,
  PaginationMeta,
} from '../../../generated/api/api-types';

export const importApi = {
  list: (query: { page?: number; pageSize?: number; status?: ImportBatchStatus; barangayId?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.status) params.set('status', query.status);
    if (query.barangayId) params.set('barangayId', query.barangayId);
    return apiClient.request<ImportBatchListResponse>(`/imports?${params.toString()}`);
  },
  validate: (data: ValidateImportInput) => (
    apiClient.request<ImportBatchResponse>('/imports/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  ),
  getBatch: (batchId: string) => apiClient.request<ImportBatchResponse>(`/imports/${batchId}`),
  listRows: (batchId: string, page = 1, pageSize = 25) => (
    apiClient.request<ImportRowListResponse>(
      `/imports/${batchId}/rows?page=${page}&pageSize=${pageSize}`,
    )
  ),
  commit: (batchId: string) => (
    apiClient.request<CommitImportResponse>(`/imports/${batchId}/commit`, { method: 'POST' })
  ),
  cancel: (batchId: string) => apiClient.request<{ data: { success: boolean } }>(
    `/imports/${batchId}/cancel`,
    { method: 'POST' },
  ),
  downloadTemplate: () => apiClient.request<Blob>('/imports/template'),
  downloadErrorFile: (batchId: string) => apiClient.request<Blob>(`/imports/${batchId}/error-file`),
};
