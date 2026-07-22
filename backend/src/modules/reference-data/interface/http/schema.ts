import { z } from 'zod';

export const createReferenceOptionSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number(),
  metadata: z.any().nullable().optional(),
});

export type CreateReferenceOptionInput = z.infer<typeof createReferenceOptionSchema>;

export const updateReferenceOptionSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
  metadata: z.any().nullable().optional(),
});

export type UpdateReferenceOptionInput = z.infer<typeof updateReferenceOptionSchema>;
