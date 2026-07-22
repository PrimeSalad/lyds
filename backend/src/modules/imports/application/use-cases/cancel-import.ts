import { importRepository } from '../../infrastructure/repositories/import-repository';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';

export const cancelImport = async (id: string): Promise<void> => {
  const batch = await importRepository.getBatchById(id);
  if (!batch) throw IMPORT_ERRORS.importBatchNotFound();
  
  if (['COMMITTING', 'COMMITTED'].includes(batch.status)) {
    throw IMPORT_ERRORS.importAlreadyCommitted();
  }
  
  await importRepository.updateBatchStatus(id, 'CANCELLED');
};
