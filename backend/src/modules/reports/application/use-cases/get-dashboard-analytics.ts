import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getDashboardAnalytics = async (filters: { barangayId?: string | null; filingYear?: number | null } = {}) => {
  return reportRepository.getDashboardAnalytics(filters);
};
