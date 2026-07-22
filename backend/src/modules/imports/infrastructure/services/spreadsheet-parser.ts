import ExcelJS from 'exceljs';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';
import stream from 'stream';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 5000;

export const spreadsheetParser = {
  async parse(fileBuffer: Buffer, fileType: string): Promise<{ headers: string[], rows: Record<string, string>[] }> {
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw IMPORT_ERRORS.fileTooLarge();
    }

    const workbook = new ExcelJS.Workbook();
    let worksheet: ExcelJS.Worksheet | undefined;

    if (fileType.includes('spreadsheetml') || fileType.includes('xlsx')) {
      await workbook.xlsx.load(fileBuffer as any);
      worksheet = workbook.worksheets[0];
    } else if (fileType.includes('csv')) {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);
      worksheet = await workbook.csv.read(bufferStream);
    } else {
      throw IMPORT_ERRORS.invalidFileType();
    }

    if (!worksheet) {
      throw IMPORT_ERRORS.invalidFileType();
    }

    const headers: string[] = [];
    const rows: Record<string, string>[] = [];
    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber - 1] = cell.text.trim();
        });
      } else {
        rowCount++;
        if (rowCount > MAX_ROWS) {
          throw IMPORT_ERRORS.tooManyRows();
        }

        const rowData: Record<string, string> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.text.trim();
          }
        });
        rows.push(rowData);
      }
    });

    return { headers: headers.filter(Boolean), rows };
  }
};
