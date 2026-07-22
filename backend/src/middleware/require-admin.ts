import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from './auth';

export const requireAdmin: RequestHandler = (req, res, next) => {
  const ctx = (req as AuthenticatedRequest).authContext;

  if (!ctx || ctx.role !== 'ADMIN') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator access required.',
      },
    });
    return;
  }

  next();
};
