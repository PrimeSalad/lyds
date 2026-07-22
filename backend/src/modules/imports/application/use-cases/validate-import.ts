import { importRepository } from '../../infrastructure/repositories/import-repository';
import { spreadsheetParser } from '../../infrastructure/services/spreadsheet-parser';
import { rowValidator } from '../../infrastructure/services/row-validator';
import { duplicateChecker } from '../../infrastructure/services/duplicate-checker';
import { supabaseAdmin } from '../../../../config/supabase';
import type { ImportBatch } from '../../domain/entities/import-batch';

export const validateImport = async (input: { categoryId: string; barangayId: string; fileData: string; fileName: string; fileType: string; uploadedBy: string }): Promise<ImportBatch> => {
  // Decode base64
  const fileBuffer = Buffer.from(input.fileData, 'base64');
  
  const batch = await importRepository.createBatch({
    barangay_id: input.barangayId,
    category_id: input.categoryId,
    uploaded_by: input.uploadedBy,
    file_name: input.fileName,
    status: 'VALIDATING',
    total_rows: 0,
    valid_rows: 0,
    invalid_rows: 0
  });

  try {
    const { headers, rows } = await spreadsheetParser.parse(fileBuffer, input.fileType);
    
    // Get reference options
    const { data: referenceOptions } = await supabaseAdmin.from('reference_options').select('id, category_code, label').eq('is_active', true);
    const ctx = { referenceOptions: referenceOptions ?? [] };

    const validatedRows = rows.map((rawRow, i) => {
      const { isValid, normalizedData, validationErrors, validationWarnings } = rowValidator.validate(rawRow, ctx);
      return {
        batch_id: batch.id,
        row_number: i + 1,
        raw_data: rawRow,
        normalized_data: normalizedData,
        is_valid: isValid,
        validation_errors: validationErrors,
        validation_warnings: validationWarnings
      };
    });

    // Duplicate check
    const duplicates = await duplicateChecker.checkDuplicates(input.barangayId, validatedRows);
    
    for (const [index, duplicateId] of duplicates.entries()) {
      validatedRows[index].is_valid = false;
      validatedRows[index].validation_errors.push('Potential duplicate record found in this barangay.');
      validatedRows[index].duplicate_match_id = duplicateId;
    }

    // Save rows
    await importRepository.saveRowResults(validatedRows);

    const validCount = validatedRows.filter(r => r.is_valid).length;
    const invalidCount = validatedRows.length - validCount;

    await importRepository.updateBatchStatus(batch.id, 'VALIDATED', {
      total_rows: validatedRows.length,
      valid_rows: validCount,
      invalid_rows: invalidCount
    });

    return importRepository.getBatchById(batch.id) as Promise<ImportBatch>;
  } catch (err: any) {
    await importRepository.updateBatchStatus(batch.id, 'FAILED', { error_message: err.message || 'Unknown error during parsing' });
    throw err;
  }
};
