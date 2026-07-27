import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';

type ApproveSubmittedByBarangayInput = {
  actorId: string;
  actorRole: string;
  barangayId: string;
  filingYear?: number;
};

export const approveSubmittedYouthRecordsByBarangay = async ({
  actorId,
  actorRole,
  barangayId,
  filingYear,
}: ApproveSubmittedByBarangayInput) => {
  const approvedCount = await youthRecordRepository.approveSubmittedRecordsByBarangay(
    actorId,
    barangayId,
    filingYear,
  );

  try {
    await auditService.log({
      actor_profile_id: actorId,
      actor_role: actorRole,
      action: 'BULK_APPROVE_SUBMITTED_BY_BARANGAY',
      entity_type: 'YOUTH_RECORD',
      metadata: {
        barangay_id: barangayId,
        filing_year: filingYear ?? null,
        approved_count: approvedCount,
      },
    });
  } catch (error) {
    console.error('Barangay approval completed but audit logging failed.', error);
  }

  return { approved_count: approvedCount };
};
