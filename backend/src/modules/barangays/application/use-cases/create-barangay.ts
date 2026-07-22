import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import { BarangayErrors } from '../../domain/errors/barangay-errors';
import type { Barangay, CreateBarangayInput } from '../../domain/entities/barangay';

const BOAC_MUNICIPALITY = 'Boac';
const MARINDUQUE_PROVINCE = 'Marinduque';

const toBarangayCode = (name: string) =>
  `BOAC-${name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

export const createBarangay = async (input: CreateBarangayInput): Promise<Barangay> => {
  const normalizedInput = {
    ...input,
    code: input.code?.trim() || toBarangayCode(input.name),
    name: input.name.trim(),
    municipality: input.municipality?.trim() || BOAC_MUNICIPALITY,
    province: input.province?.trim() || MARINDUQUE_PROVINCE,
  };

  const existing = await barangayRepository.findByCode(normalizedInput.code);
  if (existing) {
    throw BarangayErrors.ALREADY_EXISTS;
  }

  const existingName = await barangayRepository.findByNameAndMunicipality(
    normalizedInput.name,
    normalizedInput.municipality,
  );
  if (existingName) {
    throw BarangayErrors.NAME_ALREADY_EXISTS;
  }

  return barangayRepository.create(normalizedInput);
};
