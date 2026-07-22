import { importRepository } from '../../infrastructure/repositories/import-repository';
import type { ImportRowResult } from '../../domain/entities/import-batch';

export const listImportRows = async (batchId: string, page: number, pageSize: number): Promise<{ data: ImportRowResult[]; total: number }> => {
  return importRepository.listBatchRows(batchId, page, pageSize);
};
