import { referenceDataRepository } from '../../infrastructure/repositories/reference-data-repository';
import type { ReferenceGroup } from '../../domain/entities/reference-data';

export const listReferenceGroups = async (): Promise<ReferenceGroup[]> => {
  return referenceDataRepository.listGroups();
};
