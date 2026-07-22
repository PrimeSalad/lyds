import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import type { Barangay } from '../../domain/entities/barangay';

export const listBarangays = async (): Promise<Barangay[]> => {
  return barangayRepository.findAll();
};
