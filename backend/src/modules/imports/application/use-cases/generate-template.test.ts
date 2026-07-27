import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { spreadsheetParser } from '../../infrastructure/services/spreadsheet-parser';
import { generateTemplate } from './generate-template';

describe('generateTemplate', () => {
  it('creates a formatted workbook that the import parser accepts after filling a row', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await generateTemplate() as any);
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
});
