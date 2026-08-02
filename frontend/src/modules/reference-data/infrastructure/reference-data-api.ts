import { apiClient } from '../../../infrastructure/api-client';
import type {
  CategoryRecordType,
  CreateReferenceOptionInput,
  ReferenceGroup,
  ReferenceOption,
  UpdateReferenceOptionInput,
} from '../../../generated/api/api-types';

export type ReferenceRecordType = CategoryRecordType;
export type CreateOptionInput = CreateReferenceOptionInput;
export type UpdateOptionInput = UpdateReferenceOptionInput;
export type { ReferenceGroup, ReferenceOption };

export const referenceDataApi = {
  listGroups: (recordType?: ReferenceRecordType) => apiClient.request<{ data: ReferenceGroup[] }>(
    `/reference-data${recordType ? `?recordType=${recordType}` : ''}`,
  ),
  listOptions: (groupCode: string) => apiClient.request<{ data: ReferenceOption[] }>(`/reference-data/${groupCode}/options`),
  createOption: (groupCode: string, data: CreateOptionInput) => apiClient.request<{ data: ReferenceOption }>(`/reference-data/${groupCode}/options`, { method: 'POST', body: JSON.stringify(data) }),
  updateOption: (groupCode: string, optionId: string, data: UpdateOptionInput) => apiClient.request<{ data: ReferenceOption }>(`/reference-data/${groupCode}/options/${optionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
