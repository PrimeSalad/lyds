import { supabase } from '../../../infrastructure/supabase';
import { apiClient } from '../../../infrastructure/api-client';

export interface UserProfile {
  profileId: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  barangayId: string | null;
  accountStatus: 'ACTIVE' | 'INACTIVE';
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

  async signOut() {
    const { error } = await supabase.auth.signOut();
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

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },
};
