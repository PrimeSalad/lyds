import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { getAccount } from '../modules/accounts/application/use-cases/get-account';
import { updateAccount } from '../modules/accounts/application/use-cases/update-account';
import { supabaseAdmin } from '../config/supabase';

export const authRouter = Router();

const updateOwnProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  contact_number: z.string().trim().max(50).optional(),
  position_title: z.string().trim().max(200).optional(),
});

authRouter.get('/me', requireAuth, (req, res) => {
  const ctx = (req as AuthenticatedRequest).authContext;

  res.json({
    data: {
      profileId: ctx!.profileId,
      role: ctx!.role,
      barangayId: ctx!.barangayId,
      accountStatus: ctx!.accountStatus,
    },
  });
});

authRouter.get('/profile', requireAuth, async (req, res) => {
  const ctx = (req as AuthenticatedRequest).authContext!;
  const [profile, authUserResult] = await Promise.all([
    getAccount(ctx.profileId),
    supabaseAdmin.auth.admin.getUserById(ctx.profileId),
  ]);
  if (authUserResult.error) throw authUserResult.error;
  res.json({
    data: {
      profile,
      email: authUserResult.data.user.email ?? '',
    },
  });
});

authRouter.patch('/profile', requireAuth, async (req, res) => {
  const ctx = (req as AuthenticatedRequest).authContext!;
  const input = updateOwnProfileSchema.parse(req.body);
  const profile = await updateAccount(ctx.profileId, input);
  res.json({ data: profile });
});
