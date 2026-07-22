import { z } from 'zod';

export const createBarangaySchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().min(1).max(200),
  municipality: z.string().max(200).optional().default('Boac'),
  province: z.string().max(200).optional().default('Marinduque'),
});

export const updateBarangaySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  municipality: z.string().max(200).optional(),
  province: z.string().max(200).optional(),
});
