import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();

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
