import { API_ERRORS } from '../../../../config/api-error';
import { supabaseAdmin } from '../../../../config/supabase';
import { barangayRepository } from '../../../barangays/infrastructure/repositories/barangay-repository';
import { categoryRepository } from '../../../categories/infrastructure/repositories/category-repository';
import type { ImportBatch, ImportRowResult } from '../../domain/entities/import-batch';
import { importRepository } from '../../infrastructure/repositories/import-repository';
import { duplicateChecker } from '../../infrastructure/services/duplicate-checker';
import { rowValidator } from '../../infrastructure/services/row-validator';
import { spreadsheetParser } from '../../infrastructure/services/spreadsheet-parser';

export type ValidateImportInput = {
  categoryId: string;
  barangayId: string;
  fileData: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  actorRole: 'ADMIN' | 'SK_OFFICIAL';
};

export const validateImport = async (input: ValidateImportInput): Promise<ImportBatch> => {
  const [category, barangay] = await Promise.all([
    categoryRepository.getCategoryById(input.categoryId),
    barangayRepository.findById(input.barangayId),
  ]);
  if (!category || category.status !== 'PUBLISHED' || category.record_type !== 'YOUTH_PROFILE') {
    throw API_ERRORS.validation('Select a published youth profile category.');
  }
  if (input.actorRole === 'SK_OFFICIAL' && !['SK_FILLABLE', 'PUBLIC'].includes(category.permission_mode)) {
    throw API_ERRORS.forbidden('This category does not allow SK spreadsheet imports.');
  }
  if (!barangay?.is_active) throw API_ERRORS.validation('Select an active barangay.');

  const batch = await importRepository.createBatch({
    barangay_id: input.barangayId,
    category_id: input.categoryId,
    uploaded_by: input.uploadedBy,
    file_name: input.fileName,
    status: 'VALIDATING',
    total_rows: 0,
    valid_rows: 0,
    invalid_rows: 0,
    duplicate_rows: 0,
  });

  try {
    const fileBuffer = Buffer.from(input.fileData, 'base64');
    const parsed = await spreadsheetParser.parse(fileBuffer, input.fileType, input.fileName);
    const { data: referenceOptions, error: referenceError } = await supabaseAdmin
      .from('reference_options')
      .select('id, group_code, category_code, code, label')
      .eq('is_active', true);
    if (referenceError) throw referenceError;

    const validationContext = {
      referenceOptions: referenceOptions ?? [],
      filingYear: category.filing_year,
      barangayName: barangay.name,
    };
    const validatedRows: Omit<ImportRowResult, 'id' | 'created_at'>[] = parsed.rows.map((sourceRow) => {
      const result = rowValidator.validate(sourceRow.data, validationContext);
      const existingCustomValues = result.normalizedData.custom_values;
      result.normalizedData.custom_values = {
        ...(existingCustomValues && typeof existingCustomValues === 'object' ? existingCustomValues : {}),
        source_sheet: parsed.sheetName,
        source_row: sourceRow.rowNumber,
      };
      return {
        batch_id: batch.id,
        row_number: sourceRow.rowNumber,
        raw_data: sourceRow.data,
        normalized_data: result.normalizedData,
        is_valid: result.isValid,
        is_duplicate: false,
        validation_errors: result.validationErrors,
        validation_warnings: result.validationWarnings,
      };
    });

    const duplicates = await duplicateChecker.checkDuplicates(
      input.barangayId,
      input.categoryId,
      validatedRows,
    );
    for (const [index, duplicate] of duplicates.entries()) {
      validatedRows[index].is_valid = false;
      validatedRows[index].is_duplicate = true;
      validatedRows[index].validation_errors.push(duplicate.message);
      validatedRows[index].duplicate_match_id = duplicate.matchId;
    }

    await importRepository.saveRowResults(validatedRows);

    const validCount = validatedRows.filter((row) => row.is_valid).length;
    const duplicateCount = validatedRows.filter((row) => row.is_duplicate).length;
    const invalidCount = validatedRows.filter((row) => !row.is_valid && !row.is_duplicate).length;
    await importRepository.updateBatchStatus(batch.id, 'VALIDATED', {
      total_rows: validatedRows.length,
      valid_rows: validCount,
      invalid_rows: invalidCount,
      duplicate_rows: duplicateCount,
      error_message: null,
    });

    const validatedBatch = await importRepository.getBatchById(batch.id);
    if (!validatedBatch) throw new Error('Validated import batch could not be reloaded.');
    return validatedBatch;
  } catch (error: any) {
    await importRepository.updateBatchStatus(batch.id, 'FAILED', {
      error_message: error?.message || 'Unknown error during spreadsheet validation.',
    });
    throw error;
  }
};
