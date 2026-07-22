import { referenceDataRepository } from '../../infrastructure/repositories/reference-data-repository';
import { ReferenceDataErrors } from '../../domain/errors/reference-data-errors';
import type { ReferenceOption } from '../../domain/entities/reference-data';
import type { CreateReferenceOptionInput } from '../../interface/http/schema';

export const createReferenceOption = async (groupCode: string, input: CreateReferenceOptionInput): Promise<ReferenceOption> => {
  const group = await referenceDataRepository.getGroupByCode(groupCode);
  if (!group) {
    throw ReferenceDataErrors.GROUP_NOT_FOUND;
  }

  const existing = await referenceDataRepository.getOptionByCode(groupCode, input.code);
  if (existing) {
    throw ReferenceDataErrors.OPTION_ALREADY_EXISTS;
  }

  return referenceDataRepository.createOption({
    ...input,
    group_code: groupCode,
    is_active: true,
  });
};
