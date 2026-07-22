import { apiClient } from '../../../infrastructure/api-client';

export interface Barangay {
  id: string;
  code: string;
  name: string;
  municipality: string;
  province: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarangaySummary extends Barangay {
  account_count: number;
  record_count: number;
}

export const barangayApi = {
  async list(): Promise<Barangay[]> {
    const res = await apiClient.request<{ data: Barangay[] }>('/barangays');
    return res.data;
  },

  async getById(id: string): Promise<Barangay> {
    const res = await apiClient.request<{ data: Barangay }>(`/barangays/${id}`);
    return res.data;
  },

  async create(input: { code: string; name: string; municipality?: string; province?: string }): Promise<Barangay> {
    const res = await apiClient.request<{ data: Barangay }>('/barangays', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async update(id: string, input: { name?: string; municipality?: string; province?: string }): Promise<Barangay> {
    const res = await apiClient.request<{ data: Barangay }>(`/barangays/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async activate(id: string): Promise<Barangay> {
    const res = await apiClient.request<{ data: Barangay }>(`/barangays/${id}/activate`, {
      method: 'POST',
    });
    return res.data;
  },

  async deactivate(id: string): Promise<Barangay> {
    const res = await apiClient.request<{ data: Barangay }>(`/barangays/${id}/deactivate`, {
      method: 'POST',
    });
    return res.data;
  },

  async summary(id: string): Promise<BarangaySummary> {
    const res = await apiClient.request<{ data: BarangaySummary }>(`/barangays/${id}/summary`);
    return res.data;
  },
};
