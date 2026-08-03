import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getDemographics = async (filters: {
  barangayId?: string | null;
  categoryId?: string | null;
  status?: string | null;
  filingYear: number;
  recordType?: 'YOUTH_PROFILE' | 'OUT_OF_SCHOOL_YOUTH';
}) => {
  return reportRepository.getDemographics(filters);
};
