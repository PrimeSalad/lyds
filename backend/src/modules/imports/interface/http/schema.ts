import { z } from 'zod';

export const validateImportSchema = z.object({
  categoryId: z.string().uuid(),
  barangayId: z.string().uuid().optional(),
  fileData: z.string().min(1).max(14_500_000),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().max(150).default('application/octet-stream'),
});

export const listRowsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const listBatchesSchema = listRowsSchema.extend({
  status: z.enum(['UPLOADING', 'VALIDATING', 'VALIDATED', 'COMMITTING', 'COMMITTED', 'FAILED', 'CANCELLED']).optional(),
  barangayId: z.string().uuid().optional(),
});
