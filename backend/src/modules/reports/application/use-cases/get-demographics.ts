import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getDemographics = async (filters: {
  barangayId?: string | null;
  categoryId?: string | null;
  status?: string | null;
}) => {
  return reportRepository.getDemographics(filters);
};
