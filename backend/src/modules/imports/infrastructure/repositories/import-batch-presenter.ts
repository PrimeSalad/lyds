import type { ImportBatch } from '../../domain/entities/import-batch';

const relationField = (relation: any, field: string) => Array.isArray(relation)
  ? relation[0]?.[field] ?? null
  : relation?.[field] ?? null;

export const toImportBatchPresentation = (batch: any): ImportBatch => ({
  ...batch,
  duplicate_rows: batch.duplicate_rows ?? 0,
  barangay_name: relationField(batch.barangay, 'name'),
  category_name: relationField(batch.category, 'name'),
  filing_year: relationField(batch.category, 'filing_year'),
  uploaded_by_name: relationField(batch.uploader, 'full_name'),
});
