import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import { BarangayErrors } from '../../domain/errors/barangay-errors';
import type { Barangay, CreateBarangayInput } from '../../domain/entities/barangay';

export const createBarangay = async (input: CreateBarangayInput): Promise<Barangay> => {
  const existing = await barangayRepository.findByCode(input.code);
  if (existing) {
    throw BarangayErrors.ALREADY_EXISTS;
  }
  return barangayRepository.create(input);
};
