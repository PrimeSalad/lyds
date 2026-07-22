export interface Profile {
  id: string;
  full_name: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  account_status: 'ACTIVE' | 'INACTIVE';
  position_title: string | null;
  contact_number: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BarangayAssignment {
  id: string;
  profile_id: string;
  barangay_id: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  assigned_by: string;
  created_at: string;
}

export interface ProfileWithAssignment extends Profile {
  barangay_id?: string | null;
  barangay_name?: string | null;
}

export interface CreateAccountInput {
  email: string;
  full_name: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  barangay_id?: string;
  contact_number?: string;
  position_title?: string;
}

export interface UpdateAccountInput {
  full_name?: string;
  contact_number?: string;
  position_title?: string;
}

export interface AssignBarangayInput {
  barangay_id: string;
}
