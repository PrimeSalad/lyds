import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from './auth';

/**
 * Middleware that verifies the requested barangayId matches the
 * authenticated SK official's assignment. Admins pass through.
 */
export const requireBarangayAccess: RequestHandler = (req, res, next) => {
  const ctx = (req as AuthenticatedRequest).authContext;

  if (!ctx) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  // Admins can access any barangay
  if (ctx.role === 'ADMIN') {
    next();
    return;
  }

  // SK officials must have an assigned barangay
  if (!ctx.barangayId) {
    res.status(403).json({
      error: {
        code: 'NO_BARANGAY_ASSIGNMENT',
        message: 'No active barangay assignment.',
      },
    });
    return;
  }

  // Check barangayId from params or query
  const requestedBarangayId =
    (req.params.barangayId as string) ||
    (req.query.barangayId as string);

  // If no specific barangay is requested, use the assigned one
  if (!requestedBarangayId) {
    next();
    return;
  }

  // Verify the requested barangay matches the assignment
  if (requestedBarangayId !== ctx.barangayId) {
    res.status(403).json({
      error: {
        code: 'BARANGAY_ACCESS_DENIED',
        message: 'Access to this barangay is denied.',
      },
    });
    return;
  }

  next();
};
