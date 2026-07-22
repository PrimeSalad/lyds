import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(4000),
  audience: z.enum(['ALL', 'ADMIN', 'SK_OFFICIAL']),
  barangay_id: z.string().uuid().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  status: z.enum(['PUBLISHED', 'ARCHIVED']).optional(),
});
