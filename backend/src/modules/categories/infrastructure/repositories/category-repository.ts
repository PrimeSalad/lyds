import { supabaseAdmin } from '../../../../config/supabase';
import type { Category, CategoryField, CategoryWithFields } from '../../domain/entities/category';

export const categoryRepository = {
  async listCategories(options?: { status?: string; permission_mode?: string }): Promise<Category[]> {
    let query = supabaseAdmin
      .from('categories')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.permission_mode) {
      query = query.eq('permission_mode', options.permission_mode);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getCategoryById(id: string): Promise<CategoryWithFields | null> {
    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error || !category) return null;

    const { data: fields } = await supabaseAdmin
      .from('category_fields')
      .select('*')
      .eq('category_id', id)
      .order('sort_order');

    return {
      ...category,
      fields: fields || [],
    };
  },

  async getCategoryByCode(code: string): Promise<Category | null> {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('code', code)
      .is('deleted_at', null)
      .single();
    if (error) return null;
    return data;
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const { data: result, error } = await supabaseAdmin
      .from('categories')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const { data: result, error } = await supabaseAdmin
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async listCategoryFields(categoryId: string): Promise<CategoryField[]> {
    const { data, error } = await supabaseAdmin
      .from('category_fields')
      .select('*')
      .eq('category_id', categoryId)
      .order('sort_order');
    if (error) throw error;
    return data;
  },
  
  async getCategoryFieldById(id: string): Promise<CategoryField | null> {
    const { data, error } = await supabaseAdmin
      .from('category_fields')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async getCategoryFieldByKey(categoryId: string, fieldKey: string): Promise<CategoryField | null> {
    const { data, error } = await supabaseAdmin
      .from('category_fields')
      .select('*')
      .eq('category_id', categoryId)
      .eq('field_key', fieldKey)
      .single();
    if (error) return null;
    return data;
  },

  async createCategoryField(data: Partial<CategoryField>): Promise<CategoryField> {
    const { data: result, error } = await supabaseAdmin
      .from('category_fields')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateCategoryField(id: string, data: Partial<CategoryField>): Promise<CategoryField> {
    const { data: result, error } = await supabaseAdmin
      .from('category_fields')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },
};
