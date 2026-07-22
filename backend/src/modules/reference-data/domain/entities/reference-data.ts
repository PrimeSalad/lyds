export interface ReferenceGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ReferenceOption {
  id: string;
  group_code: string;
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: any | null; // jsonb
  created_at: string;
}
