import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { canTransition } from '../../domain/rules/status-transitions';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export const approveYouthRecord = async (id: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) throw YouthRecordErrors.NOT_FOUND;

  if (!canTransition(record.status, 'APPROVED', authContext.role)) {
    throw YouthRecordErrors.INVALID_STATUS_TRANSITION(record.status, 'APPROVED');
  }

  const updatedRecord = await youthRecordRepository.transitionStatus(id, 'APPROVED', authContext.profileId, {
    approved_by: authContext.profileId,
    approved_at: new Date().toISOString(),
    updated_by: authContext.profileId
  });

  return updatedRecord;
};
