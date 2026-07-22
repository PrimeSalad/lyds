import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { canTransition } from '../../domain/rules/status-transitions';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';

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

  await auditService.log({
    actor_profile_id: authContext.profileId,
    actor_role: authContext.role,
    action: 'STATUS_CHANGE',
    entity_type: 'YOUTH_RECORD',
    entity_id: record.id,
    barangay_id: record.barangay_id,
    before_data: { status: record.status },
    after_data: { status: 'APPROVED' },
  });

  return updatedRecord;
};
