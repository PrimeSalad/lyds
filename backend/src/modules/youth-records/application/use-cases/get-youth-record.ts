import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export const getYouthRecord = async (id: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) {
    throw YouthRecordErrors.NOT_FOUND;
  }

  if (authContext.role === 'SK_OFFICIAL' && record.barangay_id !== authContext.barangayId) {
    throw YouthRecordErrors.BARANGAY_MISMATCH;
  }

  return record;
};
