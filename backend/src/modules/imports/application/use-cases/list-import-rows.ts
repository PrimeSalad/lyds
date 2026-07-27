import { importRepository } from '../../infrastructure/repositories/import-repository';
import type { ImportRowResult } from '../../domain/entities/import-batch';
import { getImportBatch } from './get-import-batch';
import type { ImportAuthContext } from '../import-access';

export const listImportRows = async (
  batchId: string,
  page: number,
  pageSize: number,
  authContext: ImportAuthContext,
): Promise<{
  data: ImportRowResult[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}> => {
  await getImportBatch(batchId, authContext);
  const { data, total } = await importRepository.listBatchRows(batchId, page, pageSize);
  return {
    data,
    meta: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
};
