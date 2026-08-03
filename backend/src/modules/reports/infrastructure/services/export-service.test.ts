import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { rowValidator, type ValidationContext } from '../../../imports/infrastructure/services/row-validator';
import { spreadsheetParser } from '../../../imports/infrastructure/services/spreadsheet-parser';
import { exportService } from './export-service';

describe('exportService', () => {
  it('generates a real CSV with escaped values and formula protection', () => {
    const csv = exportService.generateCsv([{
      id: 'record-1',
      status: 'APPROVED',
      barangay: { name: 'Agot' },
      first_name: '=HYPERLINK("bad")',
      last_name: 'Dela, Cruz',
      is_registered_voter: true,
      voted_last_election: false,
      attended_kk_assembly: true,
      kk_assembly_count: 2,
    }], { filingYear: 2026 }).toString('utf8');

    expect(csv).toContain('"Registry","Filing Year","ID","Status","Barangay"');
    expect(csv).toContain('"YOUTH_PROFILE","2026"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Dela, Cruz"');
  });

  it('round-trips an exported Youth CSV through import validation', async () => {
    const csv = exportService.generateCsv([{
      id: 'record-1',
      status: 'APPROVED',
      barangay: { name: 'Tabi' },
      first_name: 'Ana',
      middle_name: 'M.',
      last_name: 'Dela Cruz',
      birth_date: '2000-01-15',
      sex: { label: 'Female' },
      civil_status: { label: 'Single' },
      youth_classification: { label: 'Out of School Youth' },
      youth_age_group: { label: 'Young Adult' },
      work_status: { label: 'Student' },
      educational_attainment: { label: 'College Level' },
      is_registered_voter: false,
      voted_last_election: false,
      attended_kk_assembly: false,
      kk_assembly_count: 0,
      custom_values: { referral_code: 'R-1' },
    }], { filingYear: 2026 });
    const parsed = await spreadsheetParser.parse(csv, 'text/csv', 'youth-2026.csv', 'YOUTH_PROFILE');
    const context: ValidationContext = {
      recordType: 'YOUTH_PROFILE',
      filingYear: 2026,
      barangayName: 'Tabi',
      categoryFields: [{ field_key: 'referral_code', label: 'Referral code', is_required: true, is_active: true }],
      referenceOptions: [
        { id: 'age-adult', group_code: 'YOUTH_AGE_GROUP', code: 'YOUNG_ADULT', label: 'Young Adult' },
        { id: 'sex-female', group_code: 'SEX_ASSIGNED_AT_BIRTH', code: 'FEMALE', label: 'Female' },
        { id: 'civil-single', group_code: 'CIVIL_STATUS', code: 'SINGLE', label: 'Single' },
        { id: 'class-osy', group_code: 'YOUTH_CLASSIFICATION', code: 'OUT_OF_SCHOOL', label: 'Out of School Youth' },
        { id: 'education-college', group_code: 'EDUCATIONAL_ATTAINMENT', code: 'COLLEGE', label: 'College Level' },
        { id: 'work-student', group_code: 'WORK_STATUS', code: 'STUDENT', label: 'Student' },
      ],
    };
    const result = rowValidator.validate(parsed.rows[0].data, context);

    expect(result.validationErrors).toEqual([]);
    expect(result.isValid).toBe(true);
    expect(result.normalizedData).toMatchObject({
      first_name: 'Ana',
      last_name: 'Dela Cruz',
      birth_date: '2000-01-15',
      custom_values: expect.objectContaining({ referral_code: 'R-1' }),
    });
  });

  it('preserves the OSY registry marker through CSV validation', async () => {
    const csv = exportService.generateCsv([{
      id: 'osy-record-1',
      status: 'SUBMITTED',
      barangay: { name: 'Agot' },
      first_name: 'Maria',
      last_name: 'Santos',
      birth_date: '2005-06-10',
      sex: { label: 'Female' },
      civil_status: { label: 'Single' },
      youth_classification: { label: 'Out of School Youth' },
      youth_age_group: { label: 'Core Youth' },
      work_status: { label: 'Unemployed' },
      educational_attainment: { label: 'High School Graduate' },
      is_registered_voter: true,
      voted_last_election: true,
      attended_kk_assembly: false,
      kk_assembly_count: 0,
    }], { filingYear: 2025, recordType: 'OUT_OF_SCHOOL_YOUTH' });
    const parsed = await spreadsheetParser.parse(csv, 'text/csv', 'osy-2025.csv', 'OUT_OF_SCHOOL_YOUTH');
    const result = rowValidator.validate(parsed.rows[0].data, {
      recordType: 'OUT_OF_SCHOOL_YOUTH',
      filingYear: 2025,
      barangayName: 'Agot',
      categoryFields: [],
      referenceOptions: [
        { id: 'age-core', group_code: 'YOUTH_AGE_GROUP', code: 'CORE_YOUTH', label: 'Core Youth' },
        { id: 'sex-female', group_code: 'SEX_ASSIGNED_AT_BIRTH', code: 'FEMALE', label: 'Female' },
        { id: 'civil-single', group_code: 'CIVIL_STATUS', code: 'SINGLE', label: 'Single' },
        { id: 'class-osy', group_code: 'YOUTH_CLASSIFICATION', code: 'OUT_OF_SCHOOL', label: 'Out of School Youth' },
        { id: 'education-high-school', group_code: 'EDUCATIONAL_ATTAINMENT', code: 'HIGH_SCHOOL_GRAD', label: 'High School Graduate' },
        { id: 'work-unemployed', group_code: 'WORK_STATUS', code: 'UNEMPLOYED', label: 'Unemployed' },
      ],
    });

    expect(csv.toString('utf8')).toContain('"OUT_OF_SCHOOL_YOUTH","2025"');
    expect(result.isValid).toBe(true);
    expect(result.validationErrors).toEqual([]);
  });

  it('generates the official filing-year XLSX layout with calculated age and protected text', async () => {
    const output = await exportService.generateXlsx([{
      id: 'record-1',
      status: 'DRAFT',
      display_name: '=Unsafe Youth',
      birth_date: '2010-07-04',
      age_at_submission: 14,
      contact_number: '09123456789',
      is_registered_voter: false,
      voted_last_election: false,
      attended_kk_assembly: true,
      kk_assembly_count: 2,
      barangay: { name: 'Agot', municipality: 'Boac', province: 'Marinduque' },
      sex: { label: 'Female' },
      civil_status: { label: 'Single' },
      youth_classification: { label: 'In-School Youth' },
      youth_age_group: { label: 'Child Youth' },
      educational_attainment: { label: 'Junior High School' },
      work_status: { label: 'Not Working' },
    }], { filingYear: 2025, generatedAt: new Date('2025-12-31T16:00:00.000Z') });

    expect(output.subarray(0, 2).toString()).toBe('PK');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(output as unknown as ExcelJS.Buffer);
    const worksheet = workbook.getWorksheet('KK Youth Profile 2025');

    expect(worksheet).toBeDefined();
    expect(worksheet?.getCell('A6').value).toBe('KATIPUNAN NG KABATAAN YOUTH PROFILE');
    expect(worksheet?.getCell('A7').value).toBe('FILING YEAR 2025');
    expect(worksheet?.getCell('H10').value).toBe('BIRTHDAY');
    expect(worksheet?.getCell('H11').value).toBe('MONTH');
    expect(worksheet?.getCell('F12').value).toBe("'=Unsafe Youth");
    expect(worksheet?.getCell('G12').value).toBe(15);
    expect(worksheet?.getCell('H12').value).toBe('July');
    expect(worksheet?.getCell('I12').value).toBe(4);
    expect(worksheet?.getCell('J12').value).toBe(2010);
    expect(worksheet?.getCell('P12').value).toBe('09123456789');
    expect(worksheet?.getCell('V12').value).toBe(2);
    expect(worksheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 11, showGridLines: false });
    expect(worksheet?.pageSetup.orientation).toBe('landscape');
  });

  it('keeps the print-ready structure when the selected year has no records', async () => {
    const output = await exportService.generateXlsx([], {
      filingYear: 2026,
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(output as unknown as ExcelJS.Buffer);
    const worksheet = workbook.getWorksheet('KK Youth Profile 2026');

    expect(worksheet?.getCell('A8').value).toContain('Total records: 0');
    expect(worksheet?.getCell('A12').value).toBe('No youth records found for filing year 2026.');
  });
});
