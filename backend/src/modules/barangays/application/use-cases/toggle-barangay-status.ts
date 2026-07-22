import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import { BarangayErrors } from '../../domain/errors/barangay-errors';
import type { Barangay } from '../../domain/entities/barangay';

export const toggleBarangayStatus = async (id: string, activate: boolean): Promise<Barangay> => {
  const existing = await barangayRepository.findById(id);
  if (!existing) {
    throw BarangayErrors.NOT_FOUND;
  }
  return barangayRepository.setActive(id, activate);
};
