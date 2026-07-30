import { apiClient } from '../../../infrastructure/api-client';
import type {
  DemographicBreakdown as GeneratedDemographicBreakdown,
  DemographicsReport,
  ReportSummary,
} from '../../../generated/api/api-types';

export type SummaryData = ReportSummary;
export type DemographicBreakdown = GeneratedDemographicBreakdown;

export type DashboardAnalytics = {
  summary: SummaryData;
  statusDistribution: Array<{
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED' | 'ARCHIVED';
    label: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    label: string;
    created: number;
    submitted: number;
    approved: number;
  }>;
  barangayCoverage: Array<{
    barangayId: string;
    barangayName: string;
    isActive: boolean;
    totalRecords: number;
    pendingReview: number;
    approved: number;
    lastActivityAt: string | null;
  }>;
  coverage: {
    barangaysWithRecords: number;
    totalBarangays: number;
    percentage: number;
  };
  dataQuality: {
    completeRecords: number;
    completionRate: number;
    missingContact: number;
    incompleteCore: number;
    duplicateCandidates: number;
    staleDrafts: number;
  };
  demographics: {
    ageGroups: DemographicBreakdown[];
    youthClassifications: DemographicBreakdown[];
  };
  recentRecords: Array<{
    id: string;
    displayName: string;
    barangayName: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED' | 'ARCHIVED';
    updatedAt: string;
  }>;
  generatedAt: string;
};

type BarangaySummary = {
  barangayId: string;
  barangayName: string;
  totalRecords: number;
  pendingReview: number;
  lastImportDate: string | null;
};

export const reportApi = {
  getDashboard: (params?: { filingYear?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.filingYear) searchParams.set('filingYear', params.filingYear.toString());
    const qs = searchParams.toString();
    return apiClient.request<{ data: DashboardAnalytics }>(`/reports/dashboard${qs ? `?${qs}` : ''}`);
  },
  getSummary: (params?: { barangayId?: string; categoryId?: string; status?: string; filingYear?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.barangayId) searchParams.set('barangayId', params.barangayId);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.filingYear) searchParams.set('filingYear', params.filingYear.toString());
    const qs = searchParams.toString();
    return apiClient.request<{ data: SummaryData }>(`/reports/summary${qs ? `?${qs}` : ''}`);
  },
  getDemographics: (params?: { barangayId?: string; categoryId?: string; status?: string; filingYear?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.barangayId) searchParams.set('barangayId', params.barangayId);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.filingYear) searchParams.set('filingYear', params.filingYear.toString());
    const qs = searchParams.toString();
    return apiClient.request<{ data: DemographicsReport }>(`/reports/demographics${qs ? `?${qs}` : ''}`);
  },
  getByBarangay: () => apiClient.request<{ data: BarangaySummary[] }>('/reports/by-barangay'),
  exportRecords: (params: { format: 'csv' | 'xlsx'; barangayId?: string; categoryId?: string; status?: string; filingYear?: number }) => {
    const searchParams = new URLSearchParams({ format: params.format });
    if (params.barangayId) searchParams.set('barangayId', params.barangayId);
    if (params.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params.status) searchParams.set('status', params.status);
    if (params.filingYear) searchParams.set('filingYear', params.filingYear.toString());
    return apiClient.request<Blob>(`/reports/export?${searchParams.toString()}`);
  },
};
