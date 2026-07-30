import { z } from 'zod';

const reportScopeFields = {
  barangayId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'ARCHIVED']).optional(),
};

export const dashboardQuerySchema = z.object({
  filingYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const reportQuerySchema = z.object({
  ...reportScopeFields,
  filingYear: z.coerce.number().int().min(2000).max(2100),
});

export const exportRecordsQuerySchema = z.object({
  ...reportScopeFields,
  format: z.enum(['csv', 'xlsx']).default('xlsx'),
  filingYear: z.coerce.number().int().min(2000).max(2100).optional(),
});
