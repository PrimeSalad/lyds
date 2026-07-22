import { supabaseAdmin } from '../../../../config/supabase';
import type {
  Announcement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '../../domain/entities/announcement';

export const announcementRepository = {
  async listForViewer(input: { role: string; barangayId: string | null }): Promise<Announcement[]> {
    let query = supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (input.role === 'SK_OFFICIAL') {
      query = query.in('audience', ['ALL', 'SK_OFFICIAL']);
      if (input.barangayId) {
        query = query.or(`barangay_id.is.null,barangay_id.eq.${input.barangayId}`);
      } else {
        query = query.is('barangay_id', null);
      }
    } else if (input.role === 'ADMIN') {
      query = query.in('audience', ['ALL', 'ADMIN']);
    }

    const { data, error } = await query;
    if (error) throw error;

    const now = new Date().toISOString();
    return (data ?? []).filter((announcement) => !announcement.expires_at || announcement.expires_at >= now);
  },

  async listForAdmin(): Promise<Announcement[]> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateAnnouncementInput & { created_by: string }): Promise<Announcement> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateAnnouncementInput): Promise<Announcement> {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
