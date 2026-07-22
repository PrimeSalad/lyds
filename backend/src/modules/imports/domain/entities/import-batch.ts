export type ImportBatchStatus = 'UPLOADING' | 'VALIDATING' | 'VALIDATED' | 'COMMITTING' | 'COMMITTED' | 'FAILED' | 'CANCELLED';

export interface ImportBatch {
  id: string;
  barangay_id: string;
  category_id: string;
  uploaded_by: string;
  file_name: string;
  status: ImportBatchStatus;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportRowResult {
  id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, string>;
  normalized_data: any;
  is_valid: boolean;
  validation_errors: string[];
  validation_warnings: string[];
  duplicate_match_id?: string;
  created_at: string;
}
