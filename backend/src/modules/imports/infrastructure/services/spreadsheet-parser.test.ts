import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { spreadsheetParser } from './spreadsheet-parser';

const officialWorkbookBuffer = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('2026 KK PROFILING');
  sheet.getCell('A1').value = 'KATIPUNAN NG KABATAAN YOUTH PROFILE';
  sheet.getRow(10).values = ['No.', 'BARANGAY', 'NAME', 'BIRTHDAY', 'SEX ASSIGNED AT BIRTH'];
  sheet.getRow(11).values = [1, 'Tabi', 'DELA CRUZ, ANA', '01/15/2004', 'Female'];
  sheet.getRow(12).values = [2, 'Tabi'];
  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
};

describe('spreadsheetParser', () => {
  it('detects the real header row in an official KK workbook', async () => {
    const parsed = await spreadsheetParser.parse(
      await officialWorkbookBuffer(),
      'application/octet-stream',
      '2026 KATIPUNAN NG KABATAAN.xlsx',
    );

    expect(parsed.headerRowNumber).toBe(10);
    expect(parsed.sheetName).toBe('2026 KK PROFILING');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      rowNumber: 11,
      data: { BARANGAY: 'Tabi', NAME: 'DELA CRUZ, ANA' },
    });
  });

  it('rejects sheets without recognizable youth-profile headers', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Notes').addRow(['Instructions only']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);

    await expect(spreadsheetParser.parse(buffer, '', 'notes.xlsx')).rejects.toMatchObject({
      message: expect.stringContaining('header'),
    });
  });

  it('prefers specific month/day/year subheadings over repeated merged birthday headings', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Official');
    sheet.getRow(10).values = ['No.', 'BARANGAY', 'NAME', 'BIRTHDAY', 'BIRTHDAY', 'BIRTHDAY'];
    sheet.getRow(11).values = ['No.', 'BARANGAY', 'NAME', 'MONTH', 'DAY', 'YEAR'];
    sheet.getRow(12).values = [1, 'Tabi', 'Ana Cruz', 'January', 15, 2004];
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);

    const parsed = await spreadsheetParser.parse(buffer, '', 'official.xlsx');

    expect(parsed.headerRowNumber).toBe(11);
    expect(parsed.rows[0].data).toMatchObject({ MONTH: 'January', DAY: '15', YEAR: '2004' });
  });
});
