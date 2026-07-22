import { importRepository } from '../../infrastructure/repositories/import-repository';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';
import { auditService } from '../../../../modules/audit-logs/infrastructure/audit-service';
import type { ImportRowResult } from '../../domain/entities/import-batch';

export const commitImport = async (batchId: string, actorId: string, actorRole: string): Promise<void> => {
  const batch = await importRepository.getBatchById(batchId);
  if (!batch) throw IMPORT_ERRORS.importBatchNotFound();
  
  if (['COMMITTING', 'COMMITTED', 'CANCELLED', 'FAILED'].includes(batch.status)) {
    throw IMPORT_ERRORS.importAlreadyCommitted();
  }
  
  await importRepository.updateBatchStatus(batchId, 'COMMITTING');
  
  try {
    // Fetch all valid rows
    let page = 1;
    let allRows: ImportRowResult[] = [];
    while (true) {
      const { data } = await importRepository.listBatchRows(batchId, page, 500);
      if (data.length === 0) break;
      allRows = allRows.concat(data);
      page++;
    }

    const validRows = allRows.filter(r => r.is_valid).map(r => ({
      ...r.normalized_data,
      barangay_id: batch.barangay_id,
      youth_profile_status: 'SUBMITTED' // default status for imported
    }));

    if (validRows.length > 0) {
      await importRepository.commitBatchRows(batchId, validRows, actorId);
      
      await auditService.log({
        actor_profile_id: actorId,
        actor_role: actorRole,
        action: 'IMPORT_COMMITTED',
        entity_type: 'IMPORT_BATCH',
        entity_id: batchId,
        barangay_id: batch.barangay_id,
        metadata: { imported_count: validRows.length }
      });
    } else {
      await importRepository.updateBatchStatus(batchId, 'COMMITTED');
    }
  } catch (err: any) {
    await importRepository.updateBatchStatus(batchId, 'FAILED', { error_message: err.message || 'Error committing batch' });
    throw err;
  }
};
