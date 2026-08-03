import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getDashboardAnalytics = async (filters: {
  barangayId?: string | null;
  filingYear?: number | null;
  recordType?: 'YOUTH_PROFILE' | 'OUT_OF_SCHOOL_YOUTH';
} = {}) => {
  return reportRepository.getDashboardAnalytics(filters);
};
