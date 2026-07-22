export interface Barangay {
  id: string;
  code: string;
  name: string;
  municipality: string;
  province: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateBarangayInput {
  code: string;
  name: string;
  municipality?: string;
  province?: string;
}

export interface UpdateBarangayInput {
  name?: string;
  municipality?: string;
  province?: string;
}
