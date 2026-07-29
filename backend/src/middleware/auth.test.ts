import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const supabase = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: supabase.getUser },
    from: supabase.from,
  },
}));

import { requireAuth, type AuthenticatedRequest } from './auth';

const tokenWithAal = (aal: 'aal1' | 'aal2') => [
  Buffer.from('{}').toString('base64url'),
  Buffer.from(JSON.stringify({ aal })).toString('base64url'),
  'signature',
].join('.');

const createResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
};

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.getUser.mockResolvedValue({ data: { user: { id: 'profile-1' } }, error: null });
  });

  it('rejects requests without a bearer token', async () => {
    const req = { headers: {} } as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a verified password session that has not completed MFA', async () => {
    const req = { headers: { authorization: `Bearer ${tokenWithAal('aal1')}` } } as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'MFA_REQUIRED', message: 'Complete two-factor authentication to continue.' },
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('adds an MFA-verified context for an active AAL2 account', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'profile-1', role: 'ADMIN', account_status: 'ACTIVE', must_change_password: false },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    const req = { headers: { authorization: `Bearer ${tokenWithAal('aal2')}` } } as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect((req as AuthenticatedRequest).authContext).toEqual({
      authUserId: 'profile-1',
      profileId: 'profile-1',
      role: 'ADMIN',
      barangayId: null,
      accountStatus: 'ACTIVE',
      mfaVerified: true,
      mustChangePassword: false,
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
