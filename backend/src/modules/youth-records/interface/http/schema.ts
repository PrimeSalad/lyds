import { z } from 'zod';

export const createYouthRecordSchema = z.object({
  category_id: z.string().uuid(),
  barangay_id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(255).optional(),
  first_name: z.string().min(1).max(100).optional(),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  suffix: z.string().max(20).optional(),
  birth_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  sex_assigned_at_birth_id: z.string().uuid().optional(),
  civil_status_id: z.string().uuid().optional(),
  youth_classification_id: z.string().uuid().optional(),
  educational_attainment_id: z.string().uuid().optional(),
  work_status_id: z.string().uuid().optional(),
  email: z.string().email().optional().or(z.literal('')),
  contact_number: z.string().max(50).optional(),
  is_registered_voter: z.boolean().default(false),
  voted_last_election: z.boolean().default(false),
  attended_kk_assembly: z.boolean().default(false),
  kk_assembly_count: z.number().int().min(0).default(0),
  custom_values: z.record(z.string(), z.unknown()).optional().default({}),
  submit_on_create: z.boolean().optional().default(false),
});

export const updateYouthRecordSchema = createYouthRecordSchema.partial().extend({
  version: z.number().int(),
  submit_on_update: z.boolean().optional().default(false),
});

export const returnYouthRecordSchema = z.object({
  return_reason: z.string().min(1, 'Return reason is required.'),
});

export const listYouthRecordsQuerySchema = z.object({
  barangayId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
  filingYear: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortField: z.enum(['created_at', 'display_name', 'birth_date', 'status', 'barangay_name']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const copyYouthRecordsSchema = z.object({
  source_category_id: z.string().uuid(),
  target_category_id: z.string().uuid(),
});
