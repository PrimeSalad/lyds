import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../src/config/supabase';
import { rowValidator, type ImportReferenceOption } from '../src/modules/imports/infrastructure/services/row-validator';

// Barangay KK profiling workbook: two header rows, data from row 7, no HOME ADDRESS column.
const firstDataRow = 7;
const batchSize = 200;

const columnHeaders = [
  'NO.', 'REGION', 'PROVINCE', 'CITY/MUNICIPALITY', 'BARANGAY', 'NAME', 'AGE',
  'MONTH', 'DAY', 'YEAR', 'SEX ASSIGNED AT BIRTH', 'CIVIL STATUS',
  'YOUTH CLASSIFICATION', 'YOUTH AGE GROUP', 'EMAIL ADDRESS', 'CONTACT NUMBER',
  'HIGHEST EDUCATIONAL ATTAINMENT', 'WORK STATUS',
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
  return String(value).trim().replace(/\s+/g, ' ');
};

const normalizedKey = (value: string) => value
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const deterministicUuid = (seed: string) => {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 32);
  const versioned = `${hex.slice(0, 12)}4${hex.slice(13, 16)}8${hex.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20)}`;
};

const chunks = <T>(items: T[], size: number) => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, (index + 1) * size),
);

const importKkProfileWorkbook = async (workbookPath: string, filingYear: number, apply: boolean) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Workbook has no worksheets.');
  const sourceFile = basename(workbookPath);
  const sourceTimestamp = new Date().toISOString();

  const [categoryResult, barangayResult, referenceResult, actorResult] = await Promise.all([
    supabaseAdmin.from('categories').select('id, code, name').eq('record_type', 'YOUTH_PROFILE').eq('filing_year', filingYear)
      .eq('status', 'PUBLISHED').is('deleted_at', null),
    supabaseAdmin.from('barangays').select('id, name').eq('is_active', true).is('deleted_at', null),
    supabaseAdmin.from('reference_options').select('id, group_code, category_code, code, label').eq('is_active', true),
    supabaseAdmin.from('profiles').select('id').eq('role', 'ADMIN').eq('account_status', 'ACTIVE').order('created_at').limit(1).maybeSingle(),
  ]);
  const errors = [categoryResult.error, barangayResult.error, referenceResult.error, actorResult.error].filter(Boolean);
  if (errors.length > 0) throw new Error(errors.map((error) => error?.message).join('; '));
  if (categoryResult.data?.length !== 1) {
    throw new Error(`Expected exactly one published YOUTH_PROFILE category for ${filingYear}, found ${categoryResult.data?.length ?? 0}.`);
  }
  const category = categoryResult.data[0];
  if (!actorResult.data) throw new Error('An active administrator profile is required for the source attribution.');

  const barangays = new Map((barangayResult.data ?? []).map((barangay) => [normalizedKey(barangay.name), barangay]));
  const referenceOptions = (referenceResult.data ?? []) as ImportReferenceOption[];
  const rows: Record<string, unknown>[] = [];
  const issues: { row: number; name: string; errors: unknown[] }[] = [];
  let warnings = 0;

  sheet.eachRow((worksheetRow, rowNumber) => {
    if (rowNumber < firstDataRow) return;
    const rawRow = Object.fromEntries(columnHeaders.map((header, index) => [header, cellText(worksheetRow.getCell(index + 1))]));
    if (!rawRow.NAME && !rawRow.BARANGAY) return;

    const barangay = barangays.get(normalizedKey(rawRow.BARANGAY));
    if (!barangay) throw new Error(`Source row ${rowNumber} has an unknown barangay "${rawRow.BARANGAY}".`);

    const validation = rowValidator.validate(rawRow, {
      recordType: 'YOUTH_PROFILE',
      filingYear,
      barangayName: barangay.name,
      categoryFields: [],
      referenceOptions,
    });
    const normalized = validation.normalizedData;
    warnings += validation.validationWarnings.length;
    if (validation.validationErrors.length > 0) {
      issues.push({ row: rowNumber, name: rawRow.NAME, errors: validation.validationErrors });
    }

    rows.push({
      id: deterministicUuid(`${category.code}|${sourceFile}|${rowNumber}`),
      category_id: category.id,
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
      youth_classification_id: normalized.youth_classification_id || null,
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
      status: 'APPROVED',
      youth_profile_status: 'APPROVED',
      submitted_by: actorResult.data.id,
      submitted_at: sourceTimestamp,
      approved_by: actorResult.data.id,
      approved_at: sourceTimestamp,
      created_by: actorResult.data.id,
      updated_by: actorResult.data.id,
      created_at: sourceTimestamp,
      updated_at: sourceTimestamp,
      deleted_at: null,
      custom_values: {
        ...(typeof normalized.custom_values === 'object' && normalized.custom_values ? normalized.custom_values : {}),
        source_file: sourceFile,
        source_row: rowNumber,
        import_validation_errors: validation.validationErrors,
        import_validation_warnings: validation.validationWarnings,
      },
    });
  });

  const barangayIds = [...new Set(rows.map((row) => row.barangay_id as string))];
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    category: `${category.code} (${category.name})`,
    sourceFile,
    sourceRecords: rows.length,
    barangays: barangayIds.map((id) => (barangayResult.data ?? []).find((barangay) => barangay.id === id)?.name),
    rowsWithValidationIssues: issues.length,
    normalizationWarnings: warnings,
    issues,
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
    .in('id', rows.map((row) => row.id as string))
    .is('deleted_at', null);
  if (countError) throw new Error(countError.message);
  if (count !== rows.length) throw new Error(`Post-import verification expected ${rows.length} records and found ${count ?? 0}.`);
  console.log(JSON.stringify({ ...summary, verifiedRecords: count }, null, 2));
  return summary;
};

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  const args = process.argv.slice(2);
  const workbookPath = args.find((argument) => !argument.startsWith('--'));
  const yearArgument = args.find((argument) => argument.startsWith('--year='));
  const filingYear = yearArgument ? Number(yearArgument.split('=')[1]) : new Date().getFullYear();
  if (!workbookPath || !Number.isInteger(filingYear)) {
    console.error('Usage: npm run import:kk -- <workbook.xlsx> [--year=YYYY] [--apply]');
    process.exitCode = 1;
  } else {
    importKkProfileWorkbook(resolve(workbookPath), filingYear, args.includes('--apply')).catch((error) => {
      console.error(error instanceof Error ? error.message : 'KK profile import failed.');
      process.exitCode = 1;
    });
  }
}

export { importKkProfileWorkbook };
