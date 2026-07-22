import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import { BarangayErrors } from '../../domain/errors/barangay-errors';
import type { Barangay, UpdateBarangayInput } from '../../domain/entities/barangay';

export const updateBarangay = async (id: string, input: UpdateBarangayInput): Promise<Barangay> => {
  const existing = await barangayRepository.findById(id);
  if (!existing) {
    throw BarangayErrors.NOT_FOUND;
  }
  return barangayRepository.update(id, input);
};
