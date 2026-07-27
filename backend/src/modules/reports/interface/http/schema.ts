import { z } from 'zod';

export const exportRecordsQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('xlsx'),
  barangayId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'ARCHIVED']).optional(),
  filingYear: z.coerce.number().int().min(2000).max(2100).optional(),
});
