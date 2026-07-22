import { supabaseAdmin } from '../../../../config/supabase';
import type { ReferenceGroup, ReferenceOption } from '../../domain/entities/reference-data';

export const referenceDataRepository = {
  async listGroups(): Promise<ReferenceGroup[]> {
    const { data, error } = await supabaseAdmin
      .from('reference_groups')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async getGroupByCode(code: string): Promise<ReferenceGroup | null> {
    const { data, error } = await supabaseAdmin
      .from('reference_groups')
      .select('*')
      .eq('code', code)
      .single();
    if (error) return null;
    return data;
  },

  async listOptions(groupCode: string): Promise<ReferenceOption[]> {
    const { data, error } = await supabaseAdmin
      .from('reference_options')
      .select('*')
      .eq('group_code', groupCode)
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async getOptionByCode(groupCode: string, code: string): Promise<ReferenceOption | null> {
    const { data, error } = await supabaseAdmin
      .from('reference_options')
      .select('*')
      .eq('group_code', groupCode)
      .eq('code', code)
      .single();
    if (error) return null;
    return data;
  },

  async getOptionById(id: string): Promise<ReferenceOption | null> {
    const { data, error } = await supabaseAdmin
      .from('reference_options')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async createOption(data: Partial<ReferenceOption>): Promise<ReferenceOption> {
    const { data: result, error } = await supabaseAdmin
      .from('reference_options')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateOption(id: string, data: Partial<ReferenceOption>): Promise<ReferenceOption> {
    const { data: result, error } = await supabaseAdmin
      .from('reference_options')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },
};
