import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { canTransition } from '../../domain/rules/status-transitions';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export const returnYouthRecord = async (id: string, returnReason: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) throw YouthRecordErrors.NOT_FOUND;

  if (!canTransition(record.status, 'RETURNED', authContext.role)) {
    throw YouthRecordErrors.INVALID_STATUS_TRANSITION(record.status, 'RETURNED');
  }

  const updatedRecord = await youthRecordRepository.transitionStatus(id, 'RETURNED', authContext.profileId, {
    return_reason: returnReason,
    updated_by: authContext.profileId
  });

  return updatedRecord;
};
