import { z } from 'zod';

export const validateImportSchema = z.object({
  categoryId: z.string(),
  barangayId: z.string(),
  fileData: z.string(),
  fileName: z.string(),
  fileType: z.string()
});

export const listRowsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(50)
});
