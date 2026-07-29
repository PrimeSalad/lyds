import ExcelJS from 'exceljs';

const flatHeaders = [
  'No.',
  'Barangay',
  'Surname',
  'First Name',
  'Middle Name',
  'Age',
  'Gender',
  'Date of Birth (MM/DD/YY)',
  'Attending School (Yes/No)',
  'Highest Grade Completed',
  'Nature of Work',
  'Father',
  'Mother',
  'Guardian',
  'Parent/Guardian Occupation',
  'Record Status',
  'Remarks',
];

const groupHeaders = [
  'NO.',
  'BARANGAY',
  'NAME OF THE CHILD',
  '',
  '',
  'AGE',
  'GENDER',
  'DATE OF BIRTH\n(MM/DD/YY)',
  'EDUCATIONAL STATUS:\nATTENDING SCHOOL (YES/NO)',
  'HIGHEST GRADE COMPLETED',
  'NATURE OF WORK',
  'NAME OF PARENT / GUARDIAN',
  '',
  '',
  'PARENT / GUARDIAN OCCUPATION',
  'RECORD STATUS',
  'REMARKS',
];

const subHeaders = [
  '', '', 'SURNAME', 'FIRST NAME', 'MIDDLE NAME', '', '', '', '', '', '',
  'FATHER', 'MOTHER', 'GUARDIAN', '', '', '',
];

const columnWidths = [7, 18, 18, 18, 18, 8, 13, 16, 18, 23, 25, 24, 24, 24, 26, 16, 32];

export const safeSpreadsheetValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

const dateLabel = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1].slice(2)}` : safeSpreadsheetValue(value);
};

const statusLabel = (status: unknown) => safeSpreadsheetValue(status).replaceAll('_', ' ');

const exportRow = (record: any, index: number) => [
  index + 1,
  safeSpreadsheetValue(record.barangay_name),
  safeSpreadsheetValue(record.last_name),
  safeSpreadsheetValue(record.first_name),
  safeSpreadsheetValue(record.middle_name),
  record.age,
  statusLabel(record.gender),
  dateLabel(record.birth_date),
  record.attending_school ? 'Yes' : 'No',
  safeSpreadsheetValue(record.highest_grade_completed),
  safeSpreadsheetValue(record.nature_of_work),
  safeSpreadsheetValue(record.father_name),
  safeSpreadsheetValue(record.mother_name),
  safeSpreadsheetValue(record.guardian_name),
  safeSpreadsheetValue(record.parent_guardian_occupation),
  statusLabel(record.record_status),
  safeSpreadsheetValue(record.remarks),
];

const styleHeaderRows = (worksheet: ExcelJS.Worksheet) => {
  worksheet.getRow(9).values = groupHeaders;
  worksheet.getRow(10).values = subHeaders;
  [1, 2, 6, 7, 8, 9, 10, 11, 15, 16, 17].forEach((column) => {
    worksheet.mergeCells(9, column, 10, column);
  });
  worksheet.mergeCells('C9:E9');
  worksheet.mergeCells('L9:N9');

  [9, 10].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    row.height = rowNumber === 9 ? 54 : 28;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F3D2E' } },
        left: { style: 'thin', color: { argb: 'FF0F3D2E' } },
        bottom: { style: 'thin', color: { argb: 'FF0F3D2E' } },
        right: { style: 'thin', color: { argb: 'FF0F3D2E' } },
      };
    });
  });
};

const styleDataRow = (row: ExcelJS.Row, index: number) => {
  row.height = 34;
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1F2937' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF0FDF4' },
    };
    cell.alignment = {
      horizontal: [3, 4, 5, 11, 12, 13, 14, 15, 17].includes(column) ? 'left' : 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFB7C9BD' } },
      left: { style: 'hair', color: { argb: 'FFB7C9BD' } },
      bottom: { style: 'hair', color: { argb: 'FFB7C9BD' } },
      right: { style: 'hair', color: { argb: 'FFB7C9BD' } },
    };
  });
};

export const childLaborerExportService = {
  async xlsx(records: any[], filingYear: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Local Youth Development Office - Boac';
    workbook.company = 'Municipality of Boac';
    const worksheet = workbook.addWorksheet(`Child Laborers ${filingYear}`, {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
      views: [{ state: 'frozen', ySplit: 10, activeCell: 'A11', showGridLines: false, zoomScale: 75 }],
    });
    worksheet.columns = columnWidths.map((width) => ({ width }));

    ['Republic of the Philippines', 'Province of Marinduque', 'Municipality of Boac'].forEach((title, index) => {
      const rowNumber = index + 1;
      worksheet.mergeCells(rowNumber, 1, rowNumber, 17);
      const cell = worksheet.getCell(rowNumber, 1);
      cell.value = title;
      cell.alignment = { horizontal: 'center' };
      cell.font = { name: 'Arial', size: 10, bold: index > 0 };
    });

    worksheet.mergeCells('A5:Q5');
    worksheet.getCell('A5').value = 'YEARLY LIST OF CHILD LABORERS';
    worksheet.getCell('A5').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF166534' } };
    worksheet.getCell('A5').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A6:Q6');
    worksheet.getCell('A6').value = `CONSOLIDATION FOR FILING YEAR ${filingYear}`;
    worksheet.getCell('A6').font = { name: 'Arial', size: 12, bold: true };
    worksheet.getCell('A6').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A7:Q7');
    worksheet.getCell('A7').value = `Total records: ${records.length.toLocaleString('en-PH')}`;
    worksheet.getCell('A7').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    worksheet.getCell('A7').alignment = { horizontal: 'center' };

    styleHeaderRows(worksheet);
    if (records.length === 0) {
      worksheet.mergeCells('A11:Q12');
      worksheet.getCell('A11').value = `No child laborer records found for filing year ${filingYear}.`;
      worksheet.getCell('A11').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('A11').font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    } else {
      records.forEach((record, index) => styleDataRow(worksheet.addRow(exportRow(record, index)), index));
    }

    worksheet.pageSetup.printTitlesRow = '1:10';
    worksheet.pageSetup.printArea = `A1:Q${Math.max(12, worksheet.rowCount)}`;
    worksheet.headerFooter.oddFooter = `&LBoac LYDO&CChild Laborers ${filingYear}&RPage &P of &N`;

    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  },

  csv(records: any[]): Buffer {
    const rows = [flatHeaders, ...records.map(exportRow)];
    const csv = rows.map((row) => row.map((value) => (
      `"${String(value ?? '').replace(/"/g, '""')}"`
    )).join(',')).join('\r\n');
    return Buffer.from(`\uFEFF${csv}`, 'utf8');
  },
};
