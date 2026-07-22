export type CategoryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CategoryPermissionMode = 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT';

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  record_type: string;
  status: CategoryStatus;
  permission_mode: CategoryPermissionMode;
  allow_sk_export: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CategoryField {
  id: string;
  category_id: string;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  is_required: boolean;
  help_text: string | null;
  options: any | null; // jsonb
  sort_order: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithFields extends Category {
  fields: CategoryField[];
}
