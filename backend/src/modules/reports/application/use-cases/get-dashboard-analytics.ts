import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getDashboardAnalytics = async (barangayId?: string | null) => {
  return reportRepository.getDashboardAnalytics(barangayId);
};
