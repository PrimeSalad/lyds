import { supabaseAdmin } from '../../../../config/supabase';
import type { Profile, ProfileWithAssignment, BarangayAssignment } from '../../domain/entities/account';

const TABLE = 'profiles';

export const accountRepository = {
  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async findByEmail(email: string): Promise<Profile | null> {
    // Find by looking up auth user by email
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const authUser = authUsers.users.find((u: { email?: string }) => u.email === email);
    if (!authUser) return null;

    return this.findById(authUser.id);
  },

  async findAll(): Promise<ProfileWithAssignment[]> {
    const { data: profiles, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .order('full_name');
    if (error) throw error;

    // Get active barangay assignments for all profiles
    const { data: assignments } = await supabaseAdmin
      .from('account_barangay_assignments')
      .select('profile_id, barangay_id')
      .eq('is_active', true);

    // Get barangay names separately
    const barangayIds = [...new Set((assignments ?? []).map((a) => a.barangay_id))];
    const { data: barangays } = barangayIds.length > 0
      ? await supabaseAdmin.from('barangays').select('id, name').in('id', barangayIds)
      : { data: [] };

    const barangayMap = new Map<string, string>();
    for (const b of barangays ?? []) {
      barangayMap.set(b.id, b.name);
    }

    const assignmentMap = new Map<string, { barangay_id: string; barangay_name: string | null }>();
    for (const a of assignments ?? []) {
      assignmentMap.set(a.profile_id, {
        barangay_id: a.barangay_id,
        barangay_name: barangayMap.get(a.barangay_id) ?? null,
      });
    }

    return (profiles ?? []).map((p: Profile) => {
      const assignment = assignmentMap.get(p.id);
      return {
        ...p,
        barangay_id: assignment?.barangay_id ?? null,
        barangay_name: assignment?.barangay_name ?? null,
      };
    });
  },

  async create(input: { id: string; full_name: string; role: string; created_by?: string }): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        id: input.id,
        full_name: input.full_name,
        role: input.role,
        account_status: 'ACTIVE',
        created_by: input.created_by ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: { full_name?: string; contact_number?: string; position_title?: string }): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setActive(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ account_status: status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActiveAssignment(profileId: string): Promise<BarangayAssignment | null> {
    const { data, error } = await supabaseAdmin
      .from('account_barangay_assignments')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .single();
    if (error) return null;
    return data;
  },

  async endAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('account_barangay_assignments')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', assignmentId);
    if (error) throw error;
  },

  async createAssignment(input: {
    profile_id: string;
    barangay_id: string;
    assigned_by: string;
  }): Promise<BarangayAssignment> {
    const { data, error } = await supabaseAdmin
      .from('account_barangay_assignments')
      .insert({
        profile_id: input.profile_id,
        barangay_id: input.barangay_id,
        assigned_by: input.assigned_by,
        is_active: true,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async inviteUser(email: string): Promise<{ id: string }> {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
    return { id: data.user.id };
  },

  async resetPassword(_userId: string): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: '',
    });
    // Note: Supabase admin API doesn't have a direct "reset password" endpoint
    // The inviteUserByEmail approach or generateLink is used instead
    if (error) throw error;
  },
};
