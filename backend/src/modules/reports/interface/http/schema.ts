import { z } from 'zod';

export const exportSchema = z.object({
  barangayId: z.string().optional()
});
