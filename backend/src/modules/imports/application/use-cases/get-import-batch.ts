import { importRepository } from '../../infrastructure/repositories/import-repository';
import type { ImportBatch } from '../../domain/entities/import-batch';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';

export const getImportBatch = async (id: string): Promise<ImportBatch> => {
  const batch = await importRepository.getBatchById(id);
  if (!batch) throw IMPORT_ERRORS.importBatchNotFound();
  return batch;
};
