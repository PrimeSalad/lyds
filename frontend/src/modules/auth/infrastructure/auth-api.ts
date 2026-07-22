import { supabase } from '../../../infrastructure/supabase';
import { apiClient } from '../../../infrastructure/api-client';

export interface UserProfile {
  profileId: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  barangayId: string | null;
  accountStatus: 'ACTIVE' | 'INACTIVE';
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
};
