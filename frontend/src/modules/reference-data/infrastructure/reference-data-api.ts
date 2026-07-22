import { apiClient } from '../../../infrastructure/api-client';

export interface ReferenceGroup {
  code: string;
  name: string;
  description: string;
}

export interface ReferenceOption {
  id: string;
  group_code: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface CreateOptionInput {
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export type UpdateOptionInput = Partial<CreateOptionInput>;

export const referenceDataApi = {
  listGroups: () => apiClient.request<{ data: ReferenceGroup[] }>('/reference-data'),
  listOptions: (groupCode: string) => apiClient.request<{ data: ReferenceOption[] }>(`/reference-data/${groupCode}/options`),
  createOption: (groupCode: string, data: CreateOptionInput) => apiClient.request<{ data: ReferenceOption }>(`/reference-data/${groupCode}/options`, { method: 'POST', body: JSON.stringify(data) }),
  updateOption: (groupCode: string, optionId: string, data: UpdateOptionInput) => apiClient.request<{ data: ReferenceOption }>(`/reference-data/${groupCode}/options/${optionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
