import { referenceDataRepository } from '../../infrastructure/repositories/reference-data-repository';
import { ReferenceDataErrors } from '../../domain/errors/reference-data-errors';
import type { ReferenceOption } from '../../domain/entities/reference-data';
import type { UpdateReferenceOptionInput } from '../../interface/http/schema';

export const updateReferenceOption = async (groupCode: string, optionId: string, input: UpdateReferenceOptionInput): Promise<ReferenceOption> => {
  const group = await referenceDataRepository.getGroupByCode(groupCode);
  if (!group) {
    throw ReferenceDataErrors.GROUP_NOT_FOUND;
  }

  const option = await referenceDataRepository.getOptionById(optionId);
  if (!option || option.group_code !== groupCode) {
    throw ReferenceDataErrors.OPTION_NOT_FOUND;
  }

  return referenceDataRepository.updateOption(optionId, input);
};
