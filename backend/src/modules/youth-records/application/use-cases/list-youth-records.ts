import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';

export const listYouthRecords = async (filters: any, authContext: any) => {
  const finalFilters = { ...filters };
  if (authContext.role === 'SK_OFFICIAL') {
    finalFilters.barangayId = authContext.barangayId;
  }
  return await youthRecordRepository.listRecords(finalFilters);
};
