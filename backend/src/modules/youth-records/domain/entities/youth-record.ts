export type RecordStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'ARCHIVED';

export interface YouthRecord {
  id: string;
  category_id: string;
  barangay_id: string;
  submission_batch_id: string | null;
  display_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  birth_date: string;
  age_at_submission: number;
  sex_assigned_at_birth_id: string | null;
  civil_status_id: string | null;
  youth_classification_id: string | null;
  youth_age_group_id: string | null;
  educational_attainment_id: string | null;
  work_status_id: string | null;
  email: string | null;
  contact_number: string | null;
  is_registered_voter: boolean;
  voted_last_election: boolean;
  attended_kk_assembly: boolean;
  kk_assembly_count: number;
  status: RecordStatus;
  return_reason: string | null;
  created_by: string;
  updated_by: string;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
