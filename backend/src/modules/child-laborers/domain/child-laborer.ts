export const childLaborerStatuses = [
  'IDENTIFIED',
  'VALIDATED',
  'REFERRED',
  'MONITORED',
  'CLOSED',
  'ARCHIVED',
] as const;

export type ChildLaborerStatus = typeof childLaborerStatuses[number];

export const childLaborerGenders = ['MALE', 'FEMALE', 'NOT_SPECIFIED'] as const;
export type ChildLaborerGender = typeof childLaborerGenders[number];

export type ChildLaborerRecord = {
  id: string;
  filing_year: number;
  barangay_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birth_date: string;
  gender: ChildLaborerGender;
  attending_school: boolean;
  highest_grade_completed: string | null;
  nature_of_work: string;
  father_name: string | null;
  mother_name: string | null;
  guardian_name: string | null;
  parent_guardian_occupation: string | null;
  record_status: ChildLaborerStatus;
  remarks: string | null;
  created_by: string;
  updated_by: string;
  version: number;
  created_at: string;
  updated_at: string;
};

export type ChildLaborerWriteInput = Omit<
  ChildLaborerRecord,
  'id' | 'created_by' | 'updated_by' | 'version' | 'created_at' | 'updated_at'
>;
