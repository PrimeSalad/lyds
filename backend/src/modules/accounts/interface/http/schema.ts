import { z } from 'zod';

const strongPasswordSchema = z.string()
  .min(12)
  .max(72)
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.')
  .regex(/[!@#$%^&*]/, 'Password must include one of !@#$%^&*.');

export const createAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  temporary_password: strongPasswordSchema,
  full_name: z.string().trim().min(1).max(200),
  role: z.enum(['ADMIN', 'SK_OFFICIAL']),
  barangay_id: z.string().uuid().optional(),
  contact_number: z.string().max(50).optional(),
  position_title: z.string().max(200).optional(),
}).refine(
  (data) => {
    if (data.role === 'SK_OFFICIAL' && !data.barangay_id) return false;
    return true;
  },
  { message: 'Barangay assignment is required for SK officials.', path: ['barangay_id'] },
);

export const updateAccountSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  contact_number: z.string().max(50).optional(),
  position_title: z.string().max(200).optional(),
  temporary_password: strongPasswordSchema.optional(),
});

export const assignBarangaySchema = z.object({
  barangay_id: z.string().uuid(),
});
