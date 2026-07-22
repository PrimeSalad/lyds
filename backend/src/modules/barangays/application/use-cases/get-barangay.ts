import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import { BarangayErrors } from '../../domain/errors/barangay-errors';
import type { Barangay } from '../../domain/entities/barangay';

export const getBarangay = async (id: string): Promise<Barangay> => {
  const barangay = await barangayRepository.findById(id);
  if (!barangay) {
    throw BarangayErrors.NOT_FOUND;
  }
  return barangay;
};
