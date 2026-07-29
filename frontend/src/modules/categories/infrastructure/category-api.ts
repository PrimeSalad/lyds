import { apiClient } from '../../../infrastructure/api-client';
import type { CategoryListResponse, CategoryRecordType, CategorySummary } from '../../../generated/api/api-types';

export type Category = Omit<CategorySummary, 'record_count' | 'field_count'> & {
  record_count?: number;
  field_count?: number;
};

export type CategoryWithFields = Category & { fields: CategoryField[] };
export type { CategoryRecordType };

export interface CreateCategoryInput {
  code: string;
  name: string;
  description: string | null;
  record_type: CategoryRecordType;
  filing_year: number;
  permission_mode: string;
  allow_sk_export: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface CategoryField {
  id: string;
  category_id: string;
  field_key: string;
  label: string;
  field_type: 'TEXT' | 'SHORT_TEXT' | 'LONG_TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'YES_NO' | 'SELECT' | 'SINGLE_SELECT' | 'MULTI_SELECT';
  is_required: boolean;
  is_active?: boolean;
  help_text: string;
  options?: unknown;
  sort_order: number;
}

export interface CreateFieldInput {
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  help_text: string;
  options?: unknown;
  sort_order: number;
}

export type UpdateFieldInput = Partial<CreateFieldInput>;

export const categoryApi = {
  list: (recordType?: CategoryRecordType) => {
    const query = recordType ? `?recordType=${recordType}` : '';
    return apiClient.request<CategoryListResponse>(`/categories${query}`);
  },
  getById: (id: string) => apiClient.request<{ data: CategoryWithFields }>(`/categories/${id}`),
  create: (data: CreateCategoryInput) => apiClient.request<{ data: Category }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateCategoryInput) => apiClient.request<{ data: Category }>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publish: (id: string) => apiClient.request(`/categories/${id}/publish`, { method: 'POST' }),
  archive: (id: string) => apiClient.request(`/categories/${id}/archive`, { method: 'POST' }),
  delete: (id: string) => apiClient.request(`/categories/${id}`, { method: 'DELETE' }),
  listFields: (id: string) => apiClient.request<{ data: CategoryField[] }>(`/categories/${id}/fields`),
  createField: (id: string, data: CreateFieldInput) => apiClient.request<{ data: CategoryField }>(`/categories/${id}/fields`, { method: 'POST', body: JSON.stringify(data) }),
  updateField: (categoryId: string, fieldId: string, data: UpdateFieldInput) => apiClient.request<{ data: CategoryField }>(`/categories/${categoryId}/fields/${fieldId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
