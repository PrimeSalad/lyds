import ExcelJS from 'exceljs';
import type { ImportRowResult } from '../../domain/entities/import-batch';
import { importRepository } from '../../infrastructure/repositories/import-repository';
import type { ImportAuthContext } from '../import-access';
import { getImportBatch } from './get-import-batch';

export const generateErrorFile = async (batchId: string, authContext: ImportAuthContext): Promise<Buffer> => {
  const batch = await getImportBatch(batchId, authContext);
  let page = 1;
  let invalidRows: ImportRowResult[] = [];
  while (true) {
    const { data } = await importRepository.listBatchRows(batchId, page, 500);
    if (data.length === 0) break;
    invalidRows = invalidRows.concat(data.filter((row) => !row.is_valid));
    page++;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Boac Local Youth Development Office';
  const worksheet = workbook.addWorksheet('Correction Report', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const rawHeaders = [...new Set(invalidRows.flatMap((row) => Object.keys(row.raw_data)))];
  const headers = ['Sheet Row', 'Result', 'Validation Details', ...rawHeaders];
  worksheet.mergeCells(1, 1, 1, Math.max(3, headers.length));
  worksheet.getCell('A1').value = `IMPORT CORRECTION REPORT — ${batch.barangay_name ?? 'Youth Records'}`;
  worksheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15 };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  worksheet.getRow(1).height = 30;
  worksheet.mergeCells(2, 1, 2, Math.max(3, headers.length));
  worksheet.getCell('A2').value = `${batch.file_name} · ${batch.category_name ?? 'Youth Profile'}${batch.filing_year ? ` (${batch.filing_year})` : ''} · ${invalidRows.length} skipped rows`;
  worksheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

  worksheet.getRow(4).values = headers;
  worksheet.getRow(4).height = 34;
  worksheet.getRow(4).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  invalidRows.forEach((row) => {
    const details = [...row.validation_errors, ...row.validation_warnings].join('; ');
    worksheet.addRow([
      row.row_number,
      row.is_duplicate ? 'Duplicate' : 'Invalid',
      details,
      ...rawHeaders.map((header) => row.raw_data[header] ?? ''),
    ]);
  });

  if (invalidRows.length === 0) {
    worksheet.addRow(['—', 'No skipped rows', 'This import has no invalid or duplicate rows.']);
  }

  worksheet.autoFilter = { from: 'A4', to: worksheet.getRow(4).getCell(headers.length).address };
  worksheet.getColumn(1).width = 12;
  worksheet.getColumn(2).width = 14;
  worksheet.getColumn(3).width = 60;
  rawHeaders.forEach((_header, index) => { worksheet.getColumn(index + 4).width = 22; });
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;
    row.alignment = { vertical: 'top', wrapText: true };
    row.height = 36;
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? 'FFFEF2F2' : 'FFFFFFFF' } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
