import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { canTransition } from '../../domain/rules/status-transitions';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export const restoreYouthRecord = async (id: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) throw YouthRecordErrors.NOT_FOUND;

  if (!canTransition(record.status, 'DRAFT', authContext.role)) {
    throw YouthRecordErrors.INVALID_STATUS_TRANSITION(record.status, 'DRAFT');
  }

  const updatedRecord = await youthRecordRepository.transitionStatus(id, 'DRAFT', authContext.profileId, {
    updated_by: authContext.profileId
  });

  return updatedRecord;
};
