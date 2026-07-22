import { referenceDataRepository } from '../../infrastructure/repositories/reference-data-repository';
import { ReferenceDataErrors } from '../../domain/errors/reference-data-errors';
import type { ReferenceOption } from '../../domain/entities/reference-data';

export const listReferenceOptions = async (groupCode: string): Promise<ReferenceOption[]> => {
  const group = await referenceDataRepository.getGroupByCode(groupCode);
  if (!group) {
    throw ReferenceDataErrors.GROUP_NOT_FOUND;
  }
  return referenceDataRepository.listOptions(groupCode);
};
