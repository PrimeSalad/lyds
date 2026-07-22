import { apiClient } from '../../../infrastructure/api-client';

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  record_type: string;
  permission_mode: 'SK_FILLABLE' | 'SK_VIEW_ONLY' | 'ADMIN_ONLY';
  allow_sk_export: boolean;
  is_active: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  record_count?: number;
  field_count?: number;
}

export type CategoryWithFields = Category & { fields: CategoryField[] };

export interface CreateCategoryInput {
  code: string;
  name: string;
  description: string;
  record_type: string;
  permission_mode: string;
  allow_sk_export: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface CategoryField {
  id: string;
  category_id: string;
  field_key: string;
  label: string;
  field_type: 'SHORT_TEXT' | 'LONG_TEXT' | 'NUMBER' | 'DATE' | 'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT';
  is_required: boolean;
  help_text: string;
  sort_order: number;
}

export interface CreateFieldInput {
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  help_text: string;
  sort_order: number;
}

export type UpdateFieldInput = Partial<CreateFieldInput>;

export const categoryApi = {
  list: () => apiClient.request<{ data: Category[] }>('/categories'),
  getById: (id: string) => apiClient.request<{ data: CategoryWithFields }>(`/categories/${id}`),
  create: (data: CreateCategoryInput) => apiClient.request<{ data: Category }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateCategoryInput) => apiClient.request<{ data: Category }>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  publish: (id: string) => apiClient.request(`/categories/${id}/publish`, { method: 'POST' }),
  archive: (id: string) => apiClient.request(`/categories/${id}/archive`, { method: 'POST' }),
  listFields: (id: string) => apiClient.request<{ data: CategoryField[] }>(`/categories/${id}/fields`),
  createField: (id: string, data: CreateFieldInput) => apiClient.request<{ data: CategoryField }>(`/categories/${id}/fields`, { method: 'POST', body: JSON.stringify(data) }),
  updateField: (categoryId: string, fieldId: string, data: UpdateFieldInput) => apiClient.request<{ data: CategoryField }>(`/categories/${categoryId}/fields/${fieldId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
