import type { RequestHandler, Request } from 'express';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  authContext?: {
    authUserId: string;
    profileId: string;
    role: 'ADMIN' | 'SK_OFFICIAL';
    barangayId: string | null;
    accountStatus: 'ACTIVE' | 'INACTIVE';
  };
}

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

    // Load profile from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, account_status')
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
    };

    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token verification failed.' } });
  }
};
