import { apiClient } from '../../../infrastructure/api-client';

export interface Profile {
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

export interface ProfileWithAssignment extends Profile {
  barangay_id: string | null;
  barangay_name: string | null;
}

export const accountApi = {
  async list(): Promise<ProfileWithAssignment[]> {
    const res = await apiClient.request<{ data: ProfileWithAssignment[] }>('/accounts');
    return res.data;
  },

  async getById(id: string): Promise<Profile> {
    const res = await apiClient.request<{ data: Profile }>(`/accounts/${id}`);
    return res.data;
  },

  async create(input: {
    email: string;
    full_name: string;
    role: 'ADMIN' | 'SK_OFFICIAL';
    barangay_id?: string;
    contact_number?: string;
    position_title?: string;
  }): Promise<Profile> {
    const res = await apiClient.request<{ data: Profile }>('/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async update(id: string, input: {
    full_name?: string;
    contact_number?: string;
    position_title?: string;
  }): Promise<Profile> {
    const res = await apiClient.request<{ data: Profile }>(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async activate(id: string): Promise<Profile> {
    const res = await apiClient.request<{ data: Profile }>(`/accounts/${id}/activate`, {
      method: 'POST',
    });
    return res.data;
  },

  async deactivate(id: string): Promise<Profile> {
    const res = await apiClient.request<{ data: Profile }>(`/accounts/${id}/deactivate`, {
      method: 'POST',
    });
    return res.data;
  },

  async assignBarangay(id: string, barangayId: string): Promise<{ profile: Profile; assignment: unknown }> {
    const res = await apiClient.request<{ data: { profile: Profile; assignment: unknown } }>(
      `/accounts/${id}/assign-barangay`,
      {
        method: 'POST',
        body: JSON.stringify({ barangay_id: barangayId }),
      },
    );
    return res.data;
  },
};
