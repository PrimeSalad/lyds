import type { RequestHandler, Request } from 'express';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  authContext?: {
    authUserId: string;
    profileId: string;
    role: 'ADMIN' | 'SK_OFFICIAL';
    barangayId: string | null;
    accountStatus: 'ACTIVE' | 'INACTIVE';
    mfaVerified: true;
    mustChangePassword: boolean;
  };
}

const getAuthenticatorAssuranceLevel = (token: string): string | null => {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    aal?: unknown;
  };
  return typeof claims.aal === 'string' ? claims.aal : null;
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header.' } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' } });
      return;
    }

    // getUser() has already verified the token signature and expiry, so the
    // assurance claim can now be trusted for this same token.
    if (getAuthenticatorAssuranceLevel(token) !== 'aal2') {
      res.status(403).json({
        error: {
          code: 'MFA_REQUIRED',
          message: 'Complete two-factor authentication to continue.',
        },
      });
      return;
    }

    // Load profile from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, account_status, must_change_password')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Profile not found.' } });
      return;
    }

    if (profile.account_status !== 'ACTIVE') {
      res.status(403).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive.' } });
      return;
    }

    // Load active barangay assignment
    let barangayId: string | null = null;
    if (profile.role === 'SK_OFFICIAL') {
      const { data: assignment } = await supabaseAdmin
        .from('account_barangay_assignments')
        .select('barangay_id')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .single();

      barangayId = assignment?.barangay_id ?? null;
    }

    (req as AuthenticatedRequest).authContext = {
      authUserId: user.id,
      profileId: profile.id,
      role: profile.role,
      barangayId,
      accountStatus: profile.account_status,
      mfaVerified: true,
      mustChangePassword: profile.must_change_password,
    };

    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token verification failed.' } });
  }
};
