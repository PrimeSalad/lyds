import ExcelJS from 'exceljs';
import type { ReferenceOption } from '../../../reference-data/domain/entities/reference-data';

const FIRST_DATA_ROW = 5;
const LAST_DATA_ROW = 1004;

const templateGroups = [
  'SEX_ASSIGNED_AT_BIRTH',
  'CIVIL_STATUS',
  'YOUTH_CLASSIFICATION',
  'EDUCATIONAL_ATTAINMENT',
  'WORK_STATUS',
] as const;

type TemplateGroup = typeof templateGroups[number];
type TemplateReferenceOption = Pick<ReferenceOption, 'group_code' | 'label' | 'sort_order' | 'is_active'>;

type TemplateColumn = {
  header: string;
  width: number;
  required: boolean;
  guidance: string;
  example: string;
  validationName?: string;
  numberFormat?: string;
};

const columns: TemplateColumn[] = [
  { header: 'FIRST NAME', width: 20, required: true, guidance: 'Given name. Do not combine with the last name.', example: 'Ana' },
  { header: 'MIDDLE NAME', width: 18, required: false, guidance: 'Middle name or initial. Leave blank when unknown.', example: 'M.' },
  { header: 'LAST NAME', width: 20, required: true, guidance: 'Family name or surname.', example: 'Dela Cruz' },
  { header: 'EXT NAME', width: 13, required: false, guidance: 'Name suffix only, such as Jr., Sr., II, or III.', example: 'Jr.' },
  { header: 'BIRTHDAY', width: 16, required: false, guidance: 'Use MM/DD/YYYY. The system calculates age and youth age group for the selected filing year.', example: '01/15/2004', numberFormat: 'mm/dd/yyyy' },
  { header: 'SEX ASSIGNED AT BIRTH', width: 24, required: true, guidance: 'Choose a value from the dropdown.', example: 'Female', validationName: 'SexAssignedAtBirthOptions' },
  { header: 'CIVIL STATUS', width: 18, required: true, guidance: 'Choose a value from the dropdown.', example: 'Single', validationName: 'CivilStatusOptions' },
  { header: 'YOUTH CLASSIFICATION', width: 28, required: true, guidance: 'Choose a value from the dropdown.', example: 'In-School Youth', validationName: 'YouthClassificationOptions' },
  { header: 'HIGHEST EDUCATIONAL ATTAINMENT', width: 32, required: true, guidance: 'Choose the highest attained level from the dropdown.', example: 'College Level', validationName: 'EducationalAttainmentOptions' },
  { header: 'WORK STATUS', width: 20, required: true, guidance: 'Choose the current work status from the dropdown.', example: 'Student', validationName: 'WorkStatusOptions' },
  { header: 'CONTACT NO.', width: 18, required: false, guidance: 'Philippine mobile number. Use 09XXXXXXXXX or +639XXXXXXXXX.', example: '09171234567', numberFormat: '@' },
  { header: 'E-MAIL ADDRESS', width: 28, required: false, guidance: 'Enter a complete email address or leave blank.', example: 'ana@example.com' },
  { header: 'PUROK', width: 16, required: false, guidance: 'Purok, zone, or sitio within the selected barangay.', example: 'Purok 2' },
  { header: 'REGISTERED VOTER?', width: 22, required: false, guidance: 'Choose Yes or No. Leave blank when unanswered.', example: 'Yes', validationName: 'YesNoOptions' },
  { header: 'VOTED LAST ELECTION?', width: 24, required: false, guidance: 'Required when Registered Voter is Yes. Choose Yes or No.', example: 'Yes', validationName: 'YesNoOptions' },
  { header: 'ATTENDED KK ASSEMBLY?', width: 26, required: false, guidance: 'Choose Yes or No. Leave blank when unanswered.', example: 'Yes', validationName: 'YesNoOptions' },
  { header: 'IF YES, HOW MANY TIMES?', width: 25, required: false, guidance: 'Enter a whole number of 1 or more when assembly attendance is Yes.', example: '2' },
];

const validationLists: Array<{ group?: TemplateGroup; name: string; heading: string; fallback?: string[] }> = [
  { group: 'SEX_ASSIGNED_AT_BIRTH', name: 'SexAssignedAtBirthOptions', heading: 'Sex Assigned at Birth' },
  { group: 'CIVIL_STATUS', name: 'CivilStatusOptions', heading: 'Civil Status' },
  { group: 'YOUTH_CLASSIFICATION', name: 'YouthClassificationOptions', heading: 'Youth Classification' },
  { group: 'EDUCATIONAL_ATTAINMENT', name: 'EducationalAttainmentOptions', heading: 'Educational Attainment' },
  { group: 'WORK_STATUS', name: 'WorkStatusOptions', heading: 'Work Status' },
  { name: 'YesNoOptions', heading: 'Yes / No', fallback: ['Yes', 'No'] },
];

const loadReferenceOptions = async (): Promise<TemplateReferenceOption[]> => {
  const { referenceDataRepository } = await import(
    '../../../reference-data/infrastructure/repositories/reference-data-repository'
  );
  return (
    await Promise.all(templateGroups.map((groupCode) => referenceDataRepository.listOptions(groupCode)))
  ).flat();
};

const optionsForGroup = (referenceOptions: TemplateReferenceOption[], groupCode: TemplateGroup) => referenceOptions
  .filter((option) => option.group_code === groupCode && option.is_active)
  .sort((a, b) => a.sort_order - b.sort_order)
  .map((option) => option.label);

const addValidationLists = (
  workbook: ExcelJS.Workbook,
  referenceOptions: TemplateReferenceOption[],
) => {
  const listsWorksheet = workbook.addWorksheet('Lists');
  validationLists.forEach((list, index) => {
    const values = list.group ? optionsForGroup(referenceOptions, list.group) : list.fallback ?? [];
    if (values.length === 0) throw new Error(`${list.heading} has no active choices configured.`);

    const columnNumber = index + 1;
    listsWorksheet.getCell(1, columnNumber).value = list.heading;
    values.forEach((value, valueIndex) => {
      listsWorksheet.getCell(valueIndex + 2, columnNumber).value = value;
    });
    const columnLetter = listsWorksheet.getColumn(columnNumber).letter;
    workbook.definedNames.add(
      `Lists!$${columnLetter}$2:$${columnLetter}$${values.length + 1}`,
      list.name,
    );
  });
  listsWorksheet.state = 'veryHidden';
};

const addListValidation = (worksheet: ExcelJS.Worksheet, columnNumber: number, validationName: string) => {
  for (let row = FIRST_DATA_ROW; row <= LAST_DATA_ROW; row += 1) {
    worksheet.getCell(row, columnNumber).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [validationName],
      showInputMessage: true,
      promptTitle: 'Choose from the list',
      prompt: 'Use the dropdown so the value matches the Youth Record form.',
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Choose a listed value',
      error: 'Use one of the values available in the dropdown.',
    };
  }
};

const styleYouthRecordsSheet = (worksheet: ExcelJS.Worksheet) => {
  worksheet.mergeCells(1, 1, 1, columns.length);
  worksheet.getCell('A1').value = 'KATIPUNAN NG KABATAAN — GUIDED YOUTH RECORD IMPORT';
  worksheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  worksheet.getRow(1).height = 34;

  worksheet.mergeCells(2, 1, 2, columns.length);
  worksheet.getCell('A2').value = 'One youth per row • Green headers are required • Use dropdown cells where available • Do not rename or reorder headers';
  worksheet.getCell('A2').font = { italic: true, color: { argb: 'FF334155' } };
  worksheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };
  worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
  worksheet.getRow(2).height = 30;

  worksheet.mergeCells('A3:B3');
  worksheet.getCell('A3').value = 'REQUIRED FIELD';
  worksheet.getCell('A3').font = { bold: true, color: { argb: 'FF166534' }, size: 10 };
  worksheet.mergeCells('C3:D3');
  worksheet.getCell('C3').value = 'OPTIONAL FIELD';
  worksheet.getCell('C3').font = { bold: true, color: { argb: 'FF475569' }, size: 10 };
  worksheet.mergeCells(3, 5, 3, columns.length);
  worksheet.getCell('E3').value = 'Birthday determines age eligibility (15–30) and youth age group after upload.';
  worksheet.getCell('E3').font = { color: { argb: 'FF475569' }, size: 10 };
  worksheet.getCell('E3').alignment = { horizontal: 'right' };

  worksheet.getRow(4).values = columns.map((column) => column.header);
  worksheet.getRow(4).height = 42;
  worksheet.getRow(4).eachCell((cell, columnNumber) => {
    const column = columns[columnNumber - 1];
    const fillColor = column.required ? 'FF15803D' : 'FF475569';
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: fillColor } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: fillColor } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
    cell.note = `${column.required ? 'Required' : 'Optional'} — ${column.guidance}`;
  });

  columns.forEach((column, index) => {
    const worksheetColumn = worksheet.getColumn(index + 1);
    worksheetColumn.width = column.width;
    if (column.numberFormat) worksheetColumn.numFmt = column.numberFormat;
    if (column.validationName) addListValidation(worksheet, index + 1, column.validationName);
  });

  for (let row = FIRST_DATA_ROW; row <= LAST_DATA_ROW; row += 1) {
    const worksheetRow = worksheet.getRow(row);
    worksheetRow.height = 23;
    worksheetRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const column = columns[columnNumber - 1];
      const baseColor = row % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      const requiredColor = row % 2 === 0 ? 'FFF0FDF4' : 'FFF7FEE7';
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: column.required ? requiredColor : baseColor },
      };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
      cell.alignment = { vertical: 'middle' };
    });
  }

  for (let row = FIRST_DATA_ROW; row <= LAST_DATA_ROW; row += 1) {
    worksheet.getCell(row, columns.length).dataValidation = {
      type: 'whole',
      operator: 'between',
      allowBlank: true,
      formulae: [1, 999],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Enter a whole number',
      error: 'Use 1 or more when Attended KK Assembly is Yes; otherwise leave this blank.',
    };
  }

  worksheet.autoFilter = { from: 'A4', to: `${worksheet.getColumn(columns.length).letter}${LAST_DATA_ROW}` };
  worksheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  worksheet.headerFooter.oddFooter = 'Page &P of &N';
};

const addInstructionsSheet = (workbook: ExcelJS.Workbook, referenceOptions: TemplateReferenceOption[]) => {
  const instructions = workbook.addWorksheet('Instructions', {
    views: [{ state: 'frozen', ySplit: 10 }],
    properties: { defaultRowHeight: 22 },
  });
  instructions.columns = [{ width: 34 }, { width: 14 }, { width: 62 }, { width: 48 }];
  instructions.mergeCells('A1:D1');
  instructions.getCell('A1').value = 'HOW TO PREPARE AN ACCURATE YOUTH RECORD IMPORT';
  instructions.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15 };
  instructions.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  instructions.getRow(1).height = 32;

  [
    ['1. Set destination', 'In the system, choose the correct Youth Registry category/filing year and barangay.'],
    ['2. Enter data', 'Fill the Youth Records sheet. Keep one youth per row and use the provided dropdowns.'],
    ['3. Check identity', 'Confirm spelling of first and last names. Duplicate names in the same barangay and filing year are skipped.'],
    ['4. Check birthday', 'Use MM/DD/YYYY. Known birthdays must make the youth 15 to 30 years old on December 31 of the selected filing year.'],
    ['5. Review first', 'Upload the file, correct every invalid row, and confirm the ready-row count before importing.'],
    ['Important', 'Do not rename, reorder, merge, or delete columns in the Youth Records sheet. Blank optional answers stay recorded as No response.'],
  ].forEach(([label, value], index) => {
    const row = index + 3;
    instructions.mergeCells(row, 2, row, 4);
    instructions.getCell(row, 1).value = label;
    instructions.getCell(row, 1).font = { bold: true, color: { argb: 'FF166534' } };
    instructions.getCell(row, 2).value = value;
    instructions.getCell(row, 2).alignment = { wrapText: true, vertical: 'top' };
  });

  const headerRow = 10;
  instructions.getRow(headerRow).values = ['FIELD', 'REQUIRED?', 'WHAT TO ENTER', 'EXAMPLE / AVAILABLE CHOICES'];
  instructions.getRow(headerRow).height = 30;
  instructions.getRow(headerRow).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  columns.forEach((column, index) => {
    const row = instructions.getRow(headerRow + index + 1);
    const list = validationLists.find((item) => item.name === column.validationName);
    const choices = list?.group
      ? optionsForGroup(referenceOptions, list.group).join(' • ')
      : list?.fallback?.join(' • ');
    row.values = [
      column.header,
      column.required ? 'Yes' : 'No',
      column.guidance,
      choices || column.example,
    ];
    row.alignment = { vertical: 'top', wrapText: true };
    row.height = choices && choices.length > 70 ? 45 : 32;
    row.getCell(1).font = { bold: true, color: { argb: column.required ? 'FF166534' : 'FF334155' } };
    row.getCell(2).font = { bold: true, color: { argb: column.required ? 'FF166534' : 'FF64748B' } };
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
    });
  });
};

export const generateTemplate = async (
  providedReferenceOptions?: TemplateReferenceOption[],
): Promise<Buffer> => {
  const referenceOptions = providedReferenceOptions ?? await loadReferenceOptions();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Boac Local Youth Development Office';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Youth Records', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4, topLeftCell: 'D5', activeCell: 'A5' }],
    properties: { defaultRowHeight: 21, tabColor: { argb: 'FF15803D' } },
  });

  addValidationLists(workbook, referenceOptions);
  styleYouthRecordsSheet(worksheet);
  addInstructionsSheet(workbook, referenceOptions);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
