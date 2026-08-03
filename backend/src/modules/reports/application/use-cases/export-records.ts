import { reportRepository } from '../../infrastructure/repositories/report-repository';
import { exportService } from '../../infrastructure/services/export-service';
import { auditService } from '../../../../modules/audit-logs/infrastructure/audit-service';

type ExportRecordsInput = {
  barangayId: string | null;
  categoryId?: string | null;
  status?: string | null;
  filingYear?: number | null;
  actorId: string;
  actorRole: string;
  format: 'csv' | 'xlsx';
};

export const exportRecords = async ({
  barangayId,
  categoryId,
  status,
  filingYear,
  actorId,
  actorRole,
  format,
}: ExportRecordsInput): Promise<Buffer> => {
  const data = await reportRepository.getExportData({ barangayId, categoryId, status, filingYear });
  const buffer = format === 'csv'
    ? exportService.generateCsv(data, { filingYear: filingYear ?? undefined })
    : await exportService.generateXlsx(data, { filingYear: filingYear ?? undefined });
  
  await auditService.log({
    actor_profile_id: actorId,
    actor_role: actorRole,
    action: 'EXPORT_RECORDS',
    entity_type: 'REPORT',
    barangay_id: barangayId ?? undefined,
    metadata: { record_count: data.length, category_id: categoryId, filing_year: filingYear, status, format }
  });
  
  return buffer;
};
