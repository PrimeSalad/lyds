import { apiClient } from '../../../infrastructure/api-client';

export type AnnouncementStatus = 'PUBLISHED' | 'ARCHIVED';
export type AnnouncementAudience = 'ALL' | 'ADMIN' | 'SK_OFFICIAL';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  barangay_id: string | null;
  status: AnnouncementStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  barangay_id?: string | null;
  expires_at?: string | null;
}

export const announcementApi = {
  async list(): Promise<Announcement[]> {
    const res = await apiClient.request<{ data: Announcement[] }>('/announcements');
    return res.data;
  },

  async create(input: CreateAnnouncementInput): Promise<Announcement> {
    const res = await apiClient.request<{ data: Announcement }>('/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async archive(id: string): Promise<Announcement> {
    const res = await apiClient.request<{ data: Announcement }>(`/announcements/${id}/archive`, {
      method: 'POST',
    });
    return res.data;
  },
};
