import type { ImportBatch, ImportBatchStatus } from '../../domain/entities/import-batch';
import { importRepository } from '../../infrastructure/repositories/import-repository';
import type { ImportAuthContext } from '../import-access';

export type ListImportBatchesQuery = {
  page: number;
  pageSize: number;
  status?: ImportBatchStatus;
  barangayId?: string;
};

export const listImportBatches = async (
  query: ListImportBatchesQuery,
  authContext: ImportAuthContext,
): Promise<{
  data: ImportBatch[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}> => {
  const barangayId = authContext.role === 'SK_OFFICIAL'
    ? authContext.barangayId
    : query.barangayId;
  const { data, total } = await importRepository.listBatches({
    barangayId,
    status: query.status,
    page: query.page,
    pageSize: query.pageSize,
  });

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
};
