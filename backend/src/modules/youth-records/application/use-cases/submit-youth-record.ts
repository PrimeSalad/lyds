import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { canTransition } from '../../domain/rules/status-transitions';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';

export const submitYouthRecord = async (id: string, authContext: any) => {
  const record = await youthRecordRepository.getRecordById(id);
  if (!record) throw YouthRecordErrors.NOT_FOUND;

  if (authContext.role === 'SK_OFFICIAL' && record.barangay_id !== authContext.barangayId) {
    throw YouthRecordErrors.BARANGAY_MISMATCH;
  }

  if (!canTransition(record.status, 'SUBMITTED', authContext.role)) {
    throw YouthRecordErrors.INVALID_STATUS_TRANSITION(record.status, 'SUBMITTED');
  }

  const updatedRecord = await youthRecordRepository.transitionStatus(id, 'SUBMITTED', authContext.profileId, {
    submitted_by: authContext.profileId,
    submitted_at: new Date().toISOString(),
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
    after_data: { status: 'SUBMITTED' },
  });

  return updatedRecord;
};
