import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';

export const approveDraftYouthRecords = async (actorId: string, actorRole: string) => {
  const approvedCount = await youthRecordRepository.approveDraftRecords(actorId);

  try {
    await auditService.log({
      actor_profile_id: actorId,
      actor_role: actorRole,
      action: 'BULK_APPROVE_DRAFTS',
      entity_type: 'YOUTH_RECORD',
      metadata: { approved_count: approvedCount },
    });
  } catch (error) {
    console.error('Bulk draft approval completed but audit logging failed.', error);
  }

  return { approved_count: approvedCount };
};
