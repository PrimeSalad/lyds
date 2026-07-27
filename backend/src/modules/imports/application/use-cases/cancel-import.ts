import { importRepository } from '../../infrastructure/repositories/import-repository';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';
import { assertImportBatchAccess, type ImportAuthContext } from '../import-access';

export const cancelImport = async (id: string, authContext: ImportAuthContext): Promise<void> => {
  const batch = await importRepository.getBatchById(id);
  if (!batch) throw IMPORT_ERRORS.importBatchNotFound();
  assertImportBatchAccess(batch, authContext);
  
  if (['COMMITTING', 'COMMITTED'].includes(batch.status)) {
    throw IMPORT_ERRORS.importAlreadyCommitted();
  }
  
  await importRepository.updateBatchStatus(id, 'CANCELLED');
};
