import { supabase } from '../../../infrastructure/supabase';
import { apiClient } from '../../../infrastructure/api-client';

export interface UserProfile {
  profileId: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  barangayId: string | null;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  mfaVerified: true;
  mustChangePassword: boolean;
}

export type MfaStatus = 'signed_out' | 'setup_required' | 'challenge_required' | 'verified';

export interface MfaEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface AccountSettingsProfile {
  id: string;
  full_name: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  account_status: 'ACTIVE' | 'INACTIVE';
  position_title: string | null;
  contact_number: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut(scope: 'global' | 'local' | 'others' = 'global') {
    const { error } = await supabase.auth.signOut({ scope });
    if (error) throw error;
  },

  async getMfaStatus(): Promise<MfaStatus> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return 'signed_out';

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (data.currentLevel === 'aal2') return 'verified';
    return data.nextLevel === 'aal2' ? 'challenge_required' : 'setup_required';
  },

  async beginMfaEnrollment(): Promise<MfaEnrollment> {
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    if (factors.totp.length > 0) {
      throw new Error('An authenticator is already enrolled. Enter its current code instead.');
    }

    for (const factor of factors.all.filter((item) => item.status === 'unverified')) {
      const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (cleanupError) throw cleanupError;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Boac LYDS Authenticator',
    });
    if (error) throw error;

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  },

  async verifyMfaEnrollment(factorId: string, code: string): Promise<void> {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw error;
  },

  async verifyMfaChallenge(code: string): Promise<void> {
    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const factor = data.totp[0];
    if (!factor) throw new Error('No verified authenticator was found. Ask an administrator to reset 2FA.');

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) throw error;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const res = await apiClient.request<{ data: UserProfile }>('/auth/me');
    return res.data;
  },

  async getAccountSettings(): Promise<{ profile: AccountSettingsProfile; email: string }> {
    const response = await apiClient.request<{
      data: { profile: AccountSettingsProfile; email: string };
    }>('/auth/profile');
    return response.data;
  },

  async updateAccountSettings(input: {
    full_name: string;
    contact_number?: string;
    position_title?: string;
  }): Promise<AccountSettingsProfile> {
    const response = await apiClient.request<{ data: AccountSettingsProfile }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async updatePassword(currentPassword: string, password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      current_password: currentPassword,
      password,
    });
    if (error) throw error;
  },

  async confirmPasswordChanged(): Promise<void> {
    await apiClient.request('/auth/password-change-completed', { method: 'POST' });
  },
};
