import { z } from 'zod';

export const createCategorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  record_type: z.string().min(1),
  permission_mode: z.enum(['SK_FILLABLE', 'SK_VIEW_ONLY', 'ADMIN_ONLY', 'PUBLIC', 'RESTRICTED', 'PRIVATE']),
  allow_sk_export: z.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  permission_mode: z.enum(['SK_FILLABLE', 'SK_VIEW_ONLY', 'ADMIN_ONLY', 'PUBLIC', 'RESTRICTED', 'PRIVATE']).optional(),
  allow_sk_export: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createCategoryFieldSchema = z.object({
  field_key: z.string().min(1),
  label: z.string().min(1),
  field_type: z.enum(['TEXT', 'SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'YES_NO', 'SELECT', 'SINGLE_SELECT', 'MULTI_SELECT']),
  is_required: z.boolean(),
  help_text: z.string().nullable().optional(),
  options: z.any().nullable().optional(),
  sort_order: z.number(),
});

export type CreateCategoryFieldInput = z.infer<typeof createCategoryFieldSchema>;

export const updateCategoryFieldSchema = z.object({
  label: z.string().min(1).optional(),
  field_type: z.enum(['TEXT', 'SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'YES_NO', 'SELECT', 'SINGLE_SELECT', 'MULTI_SELECT']).optional(),
  is_required: z.boolean().optional(),
  help_text: z.string().nullable().optional(),
  options: z.any().nullable().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCategoryFieldInput = z.infer<typeof updateCategoryFieldSchema>;
