import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { spreadsheetParser } from '../../infrastructure/services/spreadsheet-parser';
import { generateTemplate } from './generate-template';

const referenceOptions = [
  { group_code: 'SEX_ASSIGNED_AT_BIRTH', label: 'Male', sort_order: 1, is_active: true },
  { group_code: 'SEX_ASSIGNED_AT_BIRTH', label: 'Female', sort_order: 2, is_active: true },
  { group_code: 'CIVIL_STATUS', label: 'Single', sort_order: 1, is_active: true },
  { group_code: 'CIVIL_STATUS', label: 'Married', sort_order: 2, is_active: true },
  { group_code: 'YOUTH_CLASSIFICATION', label: 'In-School Youth', sort_order: 1, is_active: true },
  { group_code: 'YOUTH_CLASSIFICATION', label: 'Out-of-School Youth', sort_order: 2, is_active: true },
  { group_code: 'EDUCATIONAL_ATTAINMENT', label: 'College Level', sort_order: 1, is_active: true },
  { group_code: 'EDUCATIONAL_ATTAINMENT', label: 'Inactive Legacy Value', sort_order: 2, is_active: false },
  { group_code: 'WORK_STATUS', label: 'Student', sort_order: 1, is_active: true },
  { group_code: 'WORK_STATUS', label: 'Employed', sort_order: 2, is_active: true },
];

describe('generateTemplate', () => {
  it('creates a formatted workbook that the import parser accepts after filling a row', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await generateTemplate(referenceOptions) as any);
    const worksheet = workbook.getWorksheet('Youth Records');
    expect(worksheet).toBeDefined();
    worksheet!.getRow(5).values = [
      'Ana', 'M.', 'Cruz', '', '01/15/2004', 'Female', 'Single',
    ];
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);

    const parsed = await spreadsheetParser.parse(buffer, '', 'youth-record-import-template.xlsx');

    expect(parsed.headerRowNumber).toBe(4);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].data).toMatchObject({
      'FIRST NAME': 'Ana',
      'LAST NAME': 'Cruz',
      BIRTHDAY: '01/15/2004',
    });
  });

  it('uses current active Youth Record choices for every guided dropdown', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await generateTemplate(referenceOptions) as any);
    const worksheet = workbook.getWorksheet('Youth Records')!;
    const lists = workbook.getWorksheet('Lists')!;

    expect(worksheet.getRow(4).values).toEqual([
      undefined,
      'FIRST NAME',
      'MIDDLE NAME',
      'LAST NAME',
      'EXT NAME',
      'BIRTHDAY',
      'SEX ASSIGNED AT BIRTH',
      'CIVIL STATUS',
      'YOUTH CLASSIFICATION',
      'HIGHEST EDUCATIONAL ATTAINMENT',
      'WORK STATUS',
      'CONTACT NO.',
      'E-MAIL ADDRESS',
      'PUROK',
      'REGISTERED VOTER?',
      'VOTED LAST ELECTION?',
      'ATTENDED KK ASSEMBLY?',
      'IF YES, HOW MANY TIMES?',
    ]);
    expect(worksheet.getCell('F5').dataValidation.formulae).toEqual(['SexAssignedAtBirthOptions']);
    expect(worksheet.getCell('I5').dataValidation.formulae).toEqual(['EducationalAttainmentOptions']);
    expect(worksheet.getCell('N5').dataValidation.formulae).toEqual(['YesNoOptions']);
    expect(lists.state).toBe('veryHidden');
    expect(lists.getColumn(4).values).toEqual([undefined, 'Educational Attainment', 'College Level']);
    expect(workbook.getWorksheet('Instructions')?.getCell('A1').value).toContain('ACCURATE YOUTH RECORD IMPORT');
  });
});
