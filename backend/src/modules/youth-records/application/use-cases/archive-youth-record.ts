import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { canTransition } from '../../domain/rules/status-transitions';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';

export const archiveYouthRecord = async (id: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) throw YouthRecordErrors.NOT_FOUND;

  if (!canTransition(record.status, 'ARCHIVED', authContext.role)) {
    throw YouthRecordErrors.INVALID_STATUS_TRANSITION(record.status, 'ARCHIVED');
  }

  const updatedRecord = await youthRecordRepository.transitionStatus(id, 'ARCHIVED', authContext.profileId, {
    updated_by: authContext.profileId
  });

  await auditService.log({
    action: 'STATUS_CHANGE',
    entity_type: 'YOUTH_RECORD',
    entity_id: record.id,
    actor_id: authContext.profileId,
    old_data: { status: record.status },
    new_data: { status: 'ARCHIVED' },
  });

  return updatedRecord;
};
