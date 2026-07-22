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

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput> & {
  status?: AnnouncementStatus;
};
