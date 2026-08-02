import { z } from 'zod';
import { referenceRecordTypes } from '../../domain/entities/reference-data';

export const listReferenceGroupsQuerySchema = z.object({
  recordType: z.enum(referenceRecordTypes).optional(),
});

export const createReferenceOptionSchema = z.object({
  code: z.string().trim().min(1).max(100).regex(/[a-zA-Z0-9]/).transform((value) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')),
  label: z.string().trim().min(1).max(200),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).max(10_000),
  is_active: z.boolean().optional().default(true),
  metadata: z.any().nullable().optional(),
});

export type CreateReferenceOptionInput = z.infer<typeof createReferenceOptionSchema>;

export const updateReferenceOptionSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  is_active: z.boolean().optional(),
  metadata: z.any().nullable().optional(),
});

export type UpdateReferenceOptionInput = z.infer<typeof updateReferenceOptionSchema>;
