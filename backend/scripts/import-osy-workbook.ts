import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../src/config/supabase';
import { rowValidator, type ImportReferenceOption } from '../src/modules/imports/infrastructure/services/row-validator';

const registryCode = 'OSY_2025';
const filingYear = 2025;
const masterSheetPrefix = '2025 OSY';
const statusSheetName = 'Sheet1';
const sourceTimestamp = '2025-12-31T16:00:00.000Z';
const batchSize = 200;

const columnHeaders = [
  'NO.', 'REGION', 'PROVINCE', 'CITY/MUNICIPALITY', 'BARANGAY', 'NAME', 'AGE',
  'MONTH', 'DAY', 'YEAR', 'SEX ASSIGNED AT BIRTH', 'CIVIL STATUS',
  'YOUTH CLASSIFICATION', 'YOUTH AGE GROUP', 'EMAIL ADDRESS', 'CONTACT NUMBER',
  'HOME ADDRESS', 'HIGHEST EDUCATIONAL ATTAINMENT', 'WORK STATUS',
  'REGISTERED VOTER?', 'VOTED LAST ELECTION?', 'ATTENDED KK ASSEMBLY?',
  'IF YES, HOW MANY TIMES?',
];

const cellText = (cell: ExcelJS.Cell): string => {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value && value.result !== null && value.result !== undefined) return String(value.result).trim();
    if ('text' in value && value.text !== null && value.text !== undefined) return String(value.text).trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
  }
  return String(value).trim();
};

const normalizedKey = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')
  .replace(/^IHATUIB$/, 'IHATUB')
  .replace(/^PUTTING BUHANGIN$/, 'PUTING BUHANGIN');

const deterministicUuid = (sourceRow: number) => {
  const hex = createHash('sha256').update(`${registryCode}|${masterSheetPrefix}|${sourceRow}`).digest('hex').slice(0, 32);
  const versioned = `${hex.slice(0, 12)}4${hex.slice(13, 16)}8${hex.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20)}`;
};

const chunks = <T>(items: T[], size: number) => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, (index + 1) * size),
);

const importOsyWorkbook = async (workbookPath: string, apply: boolean) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const masterSheet = workbook.worksheets.find((sheet) => sheet.name.trim().startsWith(masterSheetPrefix));
  const statusSheet = workbook.getWorksheet(statusSheetName);
  if (!masterSheet) throw new Error(`Workbook is missing a sheet beginning with "${masterSheetPrefix}".`);
  if (!statusSheet) throw new Error(`Workbook is missing the "${statusSheetName}" validation summary sheet.`);

  const [categoryResult, barangayResult, referenceResult, actorResult] = await Promise.all([
    supabaseAdmin.from('categories').select('id, record_type, filing_year').eq('code', registryCode).is('deleted_at', null).maybeSingle(),
    supabaseAdmin.from('barangays').select('id, name').eq('is_active', true).is('deleted_at', null),
    supabaseAdmin.from('reference_options').select('id, group_code, category_code, code, label').eq('is_active', true),
    supabaseAdmin.from('profiles').select('id').eq('role', 'ADMIN').eq('account_status', 'ACTIVE').order('created_at').limit(1).maybeSingle(),
  ]);
  const errors = [categoryResult.error, barangayResult.error, referenceResult.error, actorResult.error].filter(Boolean);
  if (errors.length > 0) throw new Error(errors.map((error) => error?.message).join('; '));
  if (!categoryResult.data || categoryResult.data.record_type !== 'OUT_OF_SCHOOL_YOUTH' || categoryResult.data.filing_year !== filingYear) {
    throw new Error(`Run migration 032 first; category ${registryCode} is not ready.`);
  }
  if (!actorResult.data) throw new Error('An active administrator profile is required for the source attribution.');

  const barangays = new Map((barangayResult.data ?? []).map((barangay) => [normalizedKey(barangay.name), barangay]));
  const validationStatus = new Map<string, 'V' | 'NV'>();
  statusSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const barangayName = normalizedKey(cellText(row.getCell(1)));
    const status = cellText(row.getCell(3)).toUpperCase();
    if (barangayName && (status === 'V' || status === 'NV')) validationStatus.set(barangayName, status);
  });

  const referenceOptions = (referenceResult.data ?? []) as ImportReferenceOption[];
  const osyOption = referenceOptions.find((option) => (
    (option.group_code ?? option.category_code) === 'YOUTH_CLASSIFICATION' && option.code === 'OUT_OF_SCHOOL'
  ));
  if (!osyOption) throw new Error('The OUT_OF_SCHOOL youth classification reference option is missing.');

  const rows: Record<string, unknown>[] = [];
  const audit = { approved: 0, submitted: 0, warnings: 0, validationIssues: 0 };
  masterSheet.eachRow((worksheetRow, rowNumber) => {
    if (rowNumber < 8) return;
    const rawRow = Object.fromEntries(columnHeaders.map((header, index) => [header, cellText(worksheetRow.getCell(index + 1))]));
    if (!rawRow.NAME.trim() && !rawRow.BARANGAY.trim()) return;

    const sourceBarangay = normalizedKey(rawRow.BARANGAY);
    const barangay = barangays.get(sourceBarangay);
    if (!barangay) throw new Error(`Source row ${rowNumber} has an unknown barangay.`);
    const sourceClassification = rawRow['YOUTH CLASSIFICATION'];
    rawRow['YOUTH CLASSIFICATION'] = 'OUT OF SCHOOL YOUTH';

    const validation = rowValidator.validate(rawRow, {
      recordType: 'OUT_OF_SCHOOL_YOUTH',
      filingYear,
      barangayName: barangay.name,
      categoryFields: [],
      referenceOptions,
    });
    const normalized = validation.normalizedData;
    const status = validationStatus.get(sourceBarangay) === 'V' ? 'APPROVED' : 'SUBMITTED';
    if (status === 'APPROVED') audit.approved += 1;
    else audit.submitted += 1;
    audit.warnings += validation.validationWarnings.length;
    audit.validationIssues += validation.validationErrors.length;

    rows.push({
      id: deterministicUuid(rowNumber),
      category_id: categoryResult.data.id,
      barangay_id: barangay.id,
      display_name: normalized.display_name,
      first_name: normalized.first_name || null,
      middle_name: normalized.middle_name || null,
      last_name: normalized.last_name || null,
      suffix: normalized.suffix || null,
      ext_name: normalized.suffix || null,
      birth_date: normalized.birth_date || null,
      age_at_submission: normalized.age_at_submission ?? null,
      sex_assigned_at_birth_id: normalized.sex_assigned_at_birth_id || null,
      sex_id: normalized.sex_assigned_at_birth_id || null,
      civil_status_id: normalized.civil_status_id || null,
      youth_classification_id: osyOption.id,
      youth_age_group_id: normalized.youth_age_group_id || null,
      educational_attainment_id: normalized.educational_attainment_id || null,
      work_status_id: normalized.work_status_id || null,
      email: normalized.email || null,
      contact_number: normalized.contact_number || null,
      purok: normalized.purok || null,
      is_registered_voter: normalized.is_registered_voter ?? null,
      is_registered_sk_voter: normalized.is_registered_sk_voter ?? null,
      is_registered_national_voter: normalized.is_registered_national_voter ?? null,
      voted_last_election: normalized.voted_last_election ?? null,
      attended_kk_assembly: normalized.attended_kk_assembly ?? null,
      kk_assembly_count: normalized.kk_assembly_count ?? 0,
      status,
      youth_profile_status: status,
      submitted_by: actorResult.data.id,
      submitted_at: sourceTimestamp,
      approved_by: status === 'APPROVED' ? actorResult.data.id : null,
      approved_at: status === 'APPROVED' ? sourceTimestamp : null,
      created_by: actorResult.data.id,
      updated_by: actorResult.data.id,
      created_at: sourceTimestamp,
      updated_at: sourceTimestamp,
      deleted_at: null,
      custom_values: {
        ...(typeof normalized.custom_values === 'object' && normalized.custom_values ? normalized.custom_values : {}),
        source_registry: registryCode,
        source_sheet: masterSheet.name.trim(),
        source_row: rowNumber,
        source_classification: sourceClassification || null,
        workbook_validation_status: validationStatus.get(sourceBarangay) ?? 'NV',
        import_validation_errors: validation.validationErrors,
        import_validation_warnings: validation.validationWarnings,
      },
    });
  });

  if (rows.length !== 653) throw new Error(`Expected 653 OSY source records, found ${rows.length}.`);
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    registry: registryCode,
    sourceRecords: rows.length,
    barangaysRepresented: new Set(rows.map((row) => row.barangay_id)).size,
    approved: audit.approved,
    pendingValidation: audit.submitted,
    validationIssuesPreserved: audit.validationIssues,
    normalizationWarningsPreserved: audit.warnings,
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  for (const batch of chunks(rows, batchSize)) {
    const { error } = await supabaseAdmin.from('youth_profiles').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  const { count, error: countError } = await supabaseAdmin
    .from('youth_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryResult.data.id)
    .is('deleted_at', null);
  if (countError) throw new Error(countError.message);
  if (count !== rows.length) throw new Error(`Post-import verification expected ${rows.length} records and found ${count ?? 0}.`);
  console.log(JSON.stringify({ ...summary, verifiedRecords: count }, null, 2));
  return summary;
};

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  const workbookPath = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
  if (!workbookPath) {
    console.error('Usage: npm run import:osy -- <workbook.xlsx> [--apply]');
    process.exitCode = 1;
  } else {
    importOsyWorkbook(resolve(workbookPath), process.argv.includes('--apply')).catch((error) => {
      console.error(error instanceof Error ? error.message : 'OSY import failed.');
      process.exitCode = 1;
    });
  }
}

export { importOsyWorkbook };
