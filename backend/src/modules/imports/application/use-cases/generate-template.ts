import ExcelJS from 'exceljs';

const headers = [
  'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'EXT NAME',
  'BIRTHDAY', 'SEX ASSIGNED AT BIRTH', 'CIVIL STATUS', 'YOUTH CLASSIFICATION',
  'YOUTH AGE GROUP', 'WORK STATUS', 'HIGHEST EDUCATIONAL ATTAINMENT',
  'CONTACT NO.', 'E-MAIL ADDRESS', 'PUROK',
  'REGISTERED SK VOTER?', 'REGISTERED NATIONAL VOTER?',
  'ATTENDED KK ASSEMBLY?', 'IF YES, HOW MANY TIMES?',
];

const addListValidation = (worksheet: ExcelJS.Worksheet, column: string, values: string[]) => {
  for (let row = 5; row <= 204; row++) {
    worksheet.getCell(`${column}${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${values.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Choose a listed value',
      error: 'Use one of the values in the dropdown.',
    };
  }
};

export const generateTemplate = async (): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Boac Local Youth Development Office';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Youth Records', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 21 },
  });

  worksheet.mergeCells(1, 1, 1, headers.length);
  worksheet.getCell('A1').value = 'KATIPUNAN NG KABATAAN — YOUTH RECORD IMPORT';
  worksheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells(2, 1, 2, headers.length);
  worksheet.getCell('A2').value = 'Enter one youth per row. Use MM/DD/YYYY for birthdays. Leave unknown optional values blank.';
  worksheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };
  worksheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };
  worksheet.getRow(2).height = 30;

  worksheet.getRow(4).values = headers;
  worksheet.getRow(4).height = 34;
  worksheet.getRow(4).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF166534' } },
      left: { style: 'thin', color: { argb: 'FF166534' } },
      bottom: { style: 'thin', color: { argb: 'FF166534' } },
      right: { style: 'thin', color: { argb: 'FF166534' } },
    };
  });
  worksheet.autoFilter = { from: 'A4', to: 'R204' };

  const widths = [20, 18, 20, 12, 15, 22, 16, 24, 19, 18, 28, 18, 27, 14, 22, 28, 24, 25];
  widths.forEach((width, index) => { worksheet.getColumn(index + 1).width = width; });
  for (let row = 5; row <= 204; row++) {
    const worksheetRow = worksheet.getRow(row);
    worksheetRow.height = 22;
    worksheetRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
      cell.alignment = { vertical: 'middle' };
    });
    worksheet.getCell(`E${row}`).numFmt = 'mm/dd/yyyy';
  }

  addListValidation(worksheet, 'F', ['Male', 'Female']);
  addListValidation(worksheet, 'G', ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']);
  addListValidation(worksheet, 'H', ['In School Youth', 'Out of School Youth', 'Working Youth', 'Youth with Disability']);
  addListValidation(worksheet, 'I', ['Child Youth (15-17)', 'Core Youth (18-24)', 'Young Adult (25-30)']);
  addListValidation(worksheet, 'J', ['Student', 'Employed', 'Self Employed', 'Unemployed', 'Non Working']);
  ['O', 'P', 'Q'].forEach((column) => addListValidation(worksheet, column, ['Yes', 'No']));

  const instructions = workbook.addWorksheet('Instructions');
  instructions.columns = [{ width: 24 }, { width: 90 }];
  instructions.addRow(['IMPORT GUIDE', '']);
  instructions.mergeCells('A1:B1');
  instructions.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15 };
  instructions.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  [
    ['Step 1', 'Choose the correct filing-year category and destination barangay in the system.'],
    ['Step 2', 'Fill the Youth Records sheet. Existing official KK Youth Profile workbooks are also accepted.'],
    ['Step 3', 'Upload and review ready, invalid, and duplicate rows before confirming.'],
    ['Age rule', 'Known birthdays must make the person 15 to 30 years old on December 31 of the chosen filing year.'],
    ['Duplicates', 'Repeated normalized names in the same barangay and filing year are skipped.'],
  ].forEach((values) => instructions.addRow(values));
  instructions.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) row.getCell(1).font = { bold: true, color: { argb: 'FF166534' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
