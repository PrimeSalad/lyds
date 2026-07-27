import { importRepository } from '../../infrastructure/repositories/import-repository';
import type { ImportBatch } from '../../domain/entities/import-batch';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';
import { assertImportBatchAccess, type ImportAuthContext } from '../import-access';

export const getImportBatch = async (id: string, authContext: ImportAuthContext): Promise<ImportBatch> => {
  const batch = await importRepository.getBatchById(id);
  if (!batch) throw IMPORT_ERRORS.importBatchNotFound();
  assertImportBatchAccess(batch, authContext);
  return batch;
};
