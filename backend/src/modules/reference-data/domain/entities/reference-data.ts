export const referenceRecordTypes = ['YOUTH_PROFILE', 'CHILD_LABORER'] as const;
export type ReferenceRecordType = typeof referenceRecordTypes[number];

export interface ReferenceGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  record_type: ReferenceRecordType;
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
