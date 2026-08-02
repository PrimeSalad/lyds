import { referenceDataRepository } from '../../infrastructure/repositories/reference-data-repository';
import type { ReferenceGroup, ReferenceRecordType } from '../../domain/entities/reference-data';

export const listReferenceGroups = async (recordType?: ReferenceRecordType): Promise<ReferenceGroup[]> => {
  return referenceDataRepository.listGroups(recordType);
};
