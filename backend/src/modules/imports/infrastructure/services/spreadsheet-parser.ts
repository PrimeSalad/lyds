import ExcelJS from 'exceljs';
import stream from 'stream';
import type { CategoryRecordType } from '../../../categories/domain/entities/category';
import { IMPORT_ERRORS } from '../../domain/errors/import-errors';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 5000;
const HEADER_SCAN_LIMIT = 50;

const knownHeaders = new Set([
  'registry',
  'filing year',
  'name',
  'first name',
  'middle name',
  'last name',
  'surname',
  'birthday',
  'birthday mm dd yy',
  'birth date',
  'dob',
  'month',
  'day',
  'year',
  'barangay',
  'sex',
  'sex assigned at birth',
  'civil status',
  'youth classification',
  'youth age group',
  'work status',
  'educational attainment',
  'highest educational attainment',
  'email address',
  'contact number',
  'contact no',
  'gender',
  'date of birth mm dd yy',
  'attending school yes no',
  'highest grade completed',
  'nature of work',
  'father',
  'mother',
  'guardian',
  'parent guardian occupation',
  'record status',
  'remarks',
]);

const youthDataHeaders = new Set([
  'name',
  'full name',
  'first name',
  'last name',
  'birthday',
  'birthday mm dd yy',
  'birth date',
  'dob',
  'month',
  'day',
  'year',
  'age',
  'sex',
  'sex assigned at birth',
  'civil status',
  'youth classification',
  'youth age group',
  'work status',
  'educational attainment',
  'highest educational attainment',
  'email',
  'email address',
  'e mail address',
  'contact',
  'contact number',
  'contact no',
  'registered voter',
  'voted last election',
  'attended kk assembly',
]);

const childLaborerDataHeaders = new Set([
  'name',
  'full name',
  'first name',
  'middle name',
  'last name',
  'surname',
  'birthday',
  'birth date',
  'date of birth mm dd yy',
  'gender',
  'sex',
  'attending school yes no',
  'attending school',
  'highest grade completed',
  'nature of work',
  'father',
  'mother',
  'guardian',
  'parent guardian occupation',
]);

export const normalizeSpreadsheetHeader = (value: string) => value
  .replace(/^\uFEFF/, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const cellText = (cell: ExcelJS.Cell) => {
  try {
    return String(cell.text ?? '');
  } catch {
    // Some official workbooks contain merged placeholder cells whose master
    // value is null; ExcelJS throws while reading their computed text.
    return '';
  }
};

const headerScore = (row: ExcelJS.Row) => {
  const matches = new Set<string>();
  row.eachCell({ includeEmpty: false }, (cell) => {
    const header = normalizeSpreadsheetHeader(cellText(cell));
    if (knownHeaders.has(header)) matches.add(header);
  });
  return matches.size;
};

const findHeader = (workbook: ExcelJS.Workbook) => {
  let best: { worksheet: ExcelJS.Worksheet; rowNumber: number; score: number } | null = null;

  for (const worksheet of workbook.worksheets) {
    const lastRow = Math.min(Math.max(worksheet.actualRowCount, worksheet.rowCount), HEADER_SCAN_LIMIT);
    for (let rowNumber = 1; rowNumber <= lastRow; rowNumber++) {
      const score = headerScore(worksheet.getRow(rowNumber));
      if (!best || score > best.score) best = { worksheet, rowNumber, score };
    }
  }

  if (!best || best.score < 2) throw IMPORT_ERRORS.missingHeaders();
  return best;
};

const isXlsx = (fileType: string, fileName: string) => (
  fileType.toLowerCase().includes('spreadsheetml') || fileName.toLowerCase().endsWith('.xlsx')
);

const isCsv = (fileType: string, fileName: string) => (
  fileType.toLowerCase().includes('csv') || fileName.toLowerCase().endsWith('.csv')
);

const hasRecordData = (data: Record<string, string>, recordType: CategoryRecordType) => {
  const dataHeaders = recordType === 'CHILD_LABORER' ? childLaborerDataHeaders : youthDataHeaders;
  return Object.entries(data).some(([header, value]) => (
    value !== '' && dataHeaders.has(normalizeSpreadsheetHeader(header))
  ));
};

export type ParsedSpreadsheetRow = {
  rowNumber: number;
  data: Record<string, string>;
};

export type ParsedSpreadsheet = {
  headers: string[];
  rows: ParsedSpreadsheetRow[];
  sheetName: string;
  headerRowNumber: number;
};

export const spreadsheetParser = {
  parse: async (
    fileBuffer: Buffer,
    fileType: string,
    fileName: string,
    recordType: CategoryRecordType = 'YOUTH_PROFILE',
  ): Promise<ParsedSpreadsheet> => {
    if (fileBuffer.length > MAX_FILE_SIZE) throw IMPORT_ERRORS.fileTooLarge();

    const workbook = new ExcelJS.Workbook();
    if (isXlsx(fileType, fileName)) {
      await workbook.xlsx.load(fileBuffer as any);
    } else if (isCsv(fileType, fileName)) {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);
      await workbook.csv.read(bufferStream);
    } else {
      throw IMPORT_ERRORS.invalidFileType();
    }

    const { worksheet, rowNumber: headerRowNumber } = findHeader(workbook);
    const headers: string[] = [];
    worksheet.getRow(headerRowNumber).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      headers[columnNumber - 1] = cellText(cell).replace(/\s+/g, ' ').trim();
    });

    const rows: ParsedSpreadsheetRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;

      const data: Record<string, string> = {};
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        const header = headers[columnNumber - 1];
        if (header) data[header] = cellText(cell).trim();
      });

      if (!Object.values(data).some((value) => value !== '')) return;
      // Official templates often pre-number hundreds of unused rows. Structural
      // values such as No./region/barangay alone are not youth records.
      if (!hasRecordData(data, recordType)) return;
      if (rows.length >= MAX_ROWS) throw IMPORT_ERRORS.tooManyRows();
      rows.push({ rowNumber, data });
    });

    if (rows.length === 0) throw IMPORT_ERRORS.noDataRows();

    return {
      headers: headers.filter(Boolean),
      rows,
      sheetName: worksheet.name,
      headerRowNumber,
    };
  },
};
