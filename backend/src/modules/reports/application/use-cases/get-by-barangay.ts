import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getByBarangay = async () => {
  return reportRepository.getByBarangay();
};
