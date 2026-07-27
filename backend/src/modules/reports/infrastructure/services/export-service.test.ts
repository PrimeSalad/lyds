import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
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
    }]).toString('utf8');

    expect(csv).toContain('"ID","Status","Barangay"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Dela, Cruz"');
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
