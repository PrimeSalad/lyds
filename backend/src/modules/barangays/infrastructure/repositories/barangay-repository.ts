import { supabaseAdmin } from '../../../../config/supabase';
import type { Barangay, CreateBarangayInput, UpdateBarangayInput } from '../../domain/entities/barangay';

const TABLE = 'barangays';
const BOAC_MUNICIPALITY = 'Boac';
const MARINDUQUE_PROVINCE = 'Marinduque';

export const barangayRepository = {
  async findAll(includeDeleted = false): Promise<Barangay[]> {
    let query = supabaseAdmin.from(TABLE).select('*');
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    query = query.eq('municipality', BOAC_MUNICIPALITY).eq('province', MARINDUQUE_PROVINCE);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data ?? [];
  },

  async findById(id: string): Promise<Barangay | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) return null;
    return data;
  },

  async findByCode(code: string): Promise<Barangay | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('code', code)
      .is('deleted_at', null)
      .single();
    if (error) return null;
    return data;
  },

  async findByNameAndMunicipality(name: string, municipality: string): Promise<Barangay | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('name', name)
      .eq('municipality', municipality)
      .is('deleted_at', null)
      .single();
    if (error) return null;
    return data;
  },

  async create(input: CreateBarangayInput): Promise<Barangay> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateBarangayInput): Promise<Barangay> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setActive(id: string, isActive: boolean): Promise<Barangay> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async countAssignedAccounts(barangayId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('account_barangay_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('barangay_id', barangayId)
      .eq('is_active', true);
    if (error) throw error;
    return count ?? 0;
  },

  async countYouthRecords(barangayId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('youth_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('barangay_id', barangayId)
      .is('deleted_at', null);
    if (error) throw error;
    return count ?? 0;
  },
};
