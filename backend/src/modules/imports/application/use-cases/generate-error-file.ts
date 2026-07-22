import ExcelJS from 'exceljs';
import { importRepository } from '../../infrastructure/repositories/import-repository';

export const generateErrorFile = async (batchId: string): Promise<Buffer> => {
  let page = 1;
  let invalidRows: any[] = [];
  while (true) {
    const { data } = await importRepository.listBatchRows(batchId, page, 500);
    if (data.length === 0) break;
    invalidRows = invalidRows.concat(data.filter(r => !r.is_valid));
    page++;
  }
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Errors');
  
  if (invalidRows.length > 0) {
    const headers = ['Row Number', 'Errors', ...Object.keys(invalidRows[0].raw_data)];
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    
    for (const r of invalidRows) {
      worksheet.addRow([
        r.row_number,
        r.validation_errors.join('; '),
        ...Object.values(r.raw_data)
      ]);
    }
  } else {
    worksheet.addRow(['No errors found in this batch.']);
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
