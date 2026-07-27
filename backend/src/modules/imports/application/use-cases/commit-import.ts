import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import type { CommitImportResult } from '../../domain/entities/import-batch';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';
import { importRepository } from '../../infrastructure/repositories/import-repository';
import { assertImportBatchAccess, type ImportAuthContext } from '../import-access';

export const commitImport = async (
  batchId: string,
  authContext: ImportAuthContext,
): Promise<CommitImportResult> => {
  const batch = await importRepository.getBatchById(batchId);
  if (!batch) throw IMPORT_ERRORS.importBatchNotFound();
  assertImportBatchAccess(batch, authContext);
  if (batch.status !== 'VALIDATED') throw IMPORT_ERRORS.importAlreadyCommitted();
  if (batch.valid_rows < 1) throw IMPORT_ERRORS.noValidRows();

  const result = await importRepository.commitBatchRows(batchId, authContext.profileId);

  try {
    await auditService.log({
      actor_profile_id: authContext.profileId,
      actor_role: authContext.role,
      action: 'IMPORT_COMMITTED',
      entity_type: 'IMPORT_BATCH',
      entity_id: batchId,
      barangay_id: batch.barangay_id,
      metadata: {
        imported_count: result.imported_count,
        invalid_rows: result.invalid_rows,
        duplicate_rows: result.duplicate_rows,
        filing_year: batch.filing_year,
      },
    });
  } catch (error) {
    console.error('Import committed but its audit event could not be recorded.', error);
  }

  return result;
};
