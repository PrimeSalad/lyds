import { reportRepository } from '../../infrastructure/repositories/report-repository';
import { exportService } from '../../infrastructure/services/export-service';
import { auditService } from '../../../../modules/audit-logs/infrastructure/audit-service';

type ExportRecordsInput = {
  barangayId: string | null;
  categoryId?: string | null;
  status?: string | null;
  actorId: string;
  actorRole: string;
};

export const exportRecords = async ({
  barangayId,
  categoryId,
  status,
  actorId,
  actorRole,
}: ExportRecordsInput): Promise<Buffer> => {
  const data = await reportRepository.getExportData({ barangayId, categoryId, status });
  const buffer = await exportService.generateExport(data, 'Youth Profiles Export');
  
  await auditService.log({
    actor_profile_id: actorId,
    actor_role: actorRole,
    action: 'EXPORT_RECORDS',
    entity_type: 'REPORT',
    barangay_id: barangayId ?? undefined,
    metadata: { record_count: data.length, category_id: categoryId, status }
  });
  
  return buffer;
};
