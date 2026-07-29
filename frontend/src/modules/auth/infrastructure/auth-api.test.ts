import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
  unenroll: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
}));

vi.mock('../../../infrastructure/supabase', () => ({
  supabase: {
    auth: {
      getSession: auth.getSession,
      mfa: {
        getAuthenticatorAssuranceLevel: auth.getAuthenticatorAssuranceLevel,
        listFactors: auth.listFactors,
        unenroll: auth.unenroll,
        enroll: auth.enroll,
        challengeAndVerify: auth.challengeAndVerify,
      },
    },
  },
}));

vi.mock('../../../infrastructure/api-client', () => ({
  apiClient: { request: vi.fn() },
}));

import { authApi } from './auth-api';

describe('authApi MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });
  });

  it('reports a signed-out browser before checking assurance', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(authApi.getMfaStatus()).resolves.toBe('signed_out');
    expect(auth.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
  });

  it.each([
    [{ currentLevel: 'aal1', nextLevel: 'aal1' }, 'setup_required'],
    [{ currentLevel: 'aal1', nextLevel: 'aal2' }, 'challenge_required'],
    [{ currentLevel: 'aal2', nextLevel: 'aal2' }, 'verified'],
  ])('maps assurance levels to the mandatory MFA state', async (levels, expected) => {
    auth.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: levels, error: null });
    await expect(authApi.getMfaStatus()).resolves.toBe(expected);
  });

  it('removes stale unverified factors before starting enrollment', async () => {
    auth.listFactors.mockResolvedValue({
      data: { totp: [], all: [{ id: 'stale-factor', status: 'unverified' }] },
      error: null,
    });
    auth.unenroll.mockResolvedValue({ error: null });
    auth.enroll.mockResolvedValue({
      data: {
        id: 'new-factor',
        totp: { qr_code: '<svg />', secret: 'ABC123', uri: 'otpauth://totp/example' },
      },
      error: null,
    });

    await expect(authApi.beginMfaEnrollment()).resolves.toEqual({
      factorId: 'new-factor',
      qrCode: '<svg />',
      secret: 'ABC123',
      uri: 'otpauth://totp/example',
    });
    expect(auth.unenroll).toHaveBeenCalledWith({ factorId: 'stale-factor' });
  });
});
