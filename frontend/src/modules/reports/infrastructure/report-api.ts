import { apiClient } from '../../../infrastructure/api-client';

export type SummaryData = {
  totalRecords: number;
  draft: number;
  submitted: number;
  approved: number;
  returned: number;
  archived: number;
  thisMonth: number;
  totalBarangays: number;
  totalAccounts: number;
};

export type DemographicBreakdown = {
  label: string;
  count: number;
  percentage: number;
};

type BarangaySummary = {
  barangayId: string;
  barangayName: string;
  totalRecords: number;
  pendingReview: number;
  lastImportDate: string | null;
};

export const reportApi = {
  getSummary: (params?: { barangayId?: string; categoryId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.barangayId) searchParams.set('barangayId', params.barangayId);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient.request<{ data: SummaryData }>(`/reports/summary${qs ? `?${qs}` : ''}`);
  },
  getDemographics: (params?: { barangayId?: string; categoryId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.barangayId) searchParams.set('barangayId', params.barangayId);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient.request<{ data: { sex: DemographicBreakdown[]; civilStatus: DemographicBreakdown[]; youthClassification: DemographicBreakdown[]; youthAgeGroup: DemographicBreakdown[]; educationalAttainment: DemographicBreakdown[]; workStatus: DemographicBreakdown[]; } }>(`/reports/demographics${qs ? `?${qs}` : ''}`);
  },
  getByBarangay: () => apiClient.request<{ data: BarangaySummary[] }>('/reports/by-barangay'),
  exportRecords: (params: { format: 'csv' | 'xlsx'; barangayId?: string; categoryId?: string; status?: string }) => {
    const searchParams = new URLSearchParams({ format: params.format });
    if (params.barangayId) searchParams.set('barangayId', params.barangayId);
    if (params.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params.status) searchParams.set('status', params.status);
    return apiClient.request<Blob>(`/reports/export?${searchParams.toString()}`);
  },
};
