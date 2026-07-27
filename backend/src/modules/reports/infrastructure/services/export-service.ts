import ExcelJS from 'exceljs';
import { computeAgeForFilingYear } from '../../../youth-records/domain/rules/age-computation';

const csvHeaders = [
  'ID', 'Status', 'Barangay', 'First Name', 'Middle Name', 'Last Name', 'Suffix',
  'Birth Date', 'Sex', 'Civil Status', 'Youth Classification', 'Age Group',
  'Work Status', 'Educational Attainment', 'Contact Number', 'Email',
  'Purok', 'Registered Voter', 'Voted Last Election',
  'Attended KK Assembly', 'KK Assembly Count', 'Created At',
];

const excelHeaderGroups = [
  'NO.', 'REGION', 'PROVINCE', 'CITY / MUNICIPALITY', 'BARANGAY', 'NAME', 'AGE',
  'BIRTHDAY', '', '', 'SEX ASSIGNED AT BIRTH', 'CIVIL STATUS', 'YOUTH CLASSIFICATION',
  'YOUTH AGE GROUP', 'E-MAIL ADDRESS', 'CONTACT NO.', 'HIGHEST EDUCATIONAL ATTAINMENT',
  'WORK STATUS', 'REGISTERED VOTER?', 'VOTED LAST ELECTION', 'ATTENDED KK ASSEMBLY?',
  'IF YES, HOW MANY TIMES?',
];

const excelSubheaders = [
  '', '', '', '', '', '', '', 'MONTH', 'DAY', 'YEAR', '', '', '', '', '', '', '', '', '', '', '', '',
];

const excelColumnWidths = [
  7, 12, 16, 19, 18, 30, 7, 13, 7, 9, 17, 15, 22, 18, 28, 16, 28, 20, 17, 17, 21, 14,
];

type ExportOptions = {
  filingYear?: number;
  generatedAt?: Date;
};

const sanitize = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  return /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
};

const relationValue = (relation: any, field: string): string => {
  const value = Array.isArray(relation) ? relation[0]?.[field] : relation?.[field];
  return sanitize(value);
};

const booleanLabel = (value: unknown) => (
  value === true ? 'Yes' : value === false ? 'No' : ''
);

const birthDateParts = (birthDate: unknown) => {
  const match = typeof birthDate === 'string'
    ? /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate)
    : null;
  if (!match) return { month: '', day: '', year: '' };

  const monthNumber = Number(match[2]);
  const month = new Intl.DateTimeFormat('en-PH', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, monthNumber - 1, 1)));
  return { month, day: Number(match[3]), year: Number(match[1]) };
};

const exportAge = (row: any, filingYear?: number): number | string => {
  if (!filingYear || typeof row.birth_date !== 'string') return row.age_at_submission ?? '';
  const age = computeAgeForFilingYear(row.birth_date, filingYear);
  return Number.isFinite(age) ? age : '';
};

const excelRow = (row: any, index: number, filingYear?: number) => {
  const birthday = birthDateParts(row.birth_date);
  const attendedAssembly = booleanLabel(row.attended_kk_assembly);

  return [
    index + 1,
    'IV-B',
    relationValue(row.barangay, 'province').toUpperCase() || 'MARINDUQUE',
    relationValue(row.barangay, 'municipality').toUpperCase() || 'BOAC',
    relationValue(row.barangay, 'name').toUpperCase(),
    sanitize(row.display_name),
    exportAge(row, filingYear),
    birthday.month,
    birthday.day,
    birthday.year,
    relationValue(row.sex, 'label'),
    relationValue(row.civil_status, 'label'),
    relationValue(row.youth_classification, 'label'),
    relationValue(row.youth_age_group, 'label'),
    sanitize(row.email),
    sanitize(row.contact_number),
    relationValue(row.educational_attainment, 'label'),
    relationValue(row.work_status, 'label'),
    booleanLabel(row.is_registered_voter),
    booleanLabel(row.voted_last_election),
    attendedAssembly,
    attendedAssembly === 'Yes' ? row.kk_assembly_count ?? 0 : attendedAssembly === 'No' ? 0 : '',
  ];
};

const csvRow = (row: any) => [
  sanitize(row.id),
  sanitize(row.status),
  relationValue(row.barangay, 'name'),
  sanitize(row.first_name),
  sanitize(row.middle_name),
  sanitize(row.last_name),
  sanitize(row.suffix),
  sanitize(row.birth_date),
  relationValue(row.sex, 'label'),
  relationValue(row.civil_status, 'label'),
  relationValue(row.youth_classification, 'label'),
  relationValue(row.youth_age_group, 'label'),
  relationValue(row.work_status, 'label'),
  relationValue(row.educational_attainment, 'label'),
  sanitize(row.contact_number),
  sanitize(row.email),
  sanitize(row.purok),
  booleanLabel(row.is_registered_voter),
  booleanLabel(row.voted_last_election),
  booleanLabel(row.attended_kk_assembly),
  sanitize(row.kk_assembly_count),
  sanitize(row.created_at),
];

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const applyWorkbookHeader = (
  worksheet: ExcelJS.Worksheet,
  filingYear: number | undefined,
  recordCount: number,
  generatedAt: Date,
) => {
  const titleRows = [
    'Republic of the Philippines',
    'MIMAROPA Region',
    'Province of Marinduque',
    'Municipality of Boac',
  ];

  titleRows.forEach((title, index) => {
    const rowNumber = index + 1;
    worksheet.mergeCells(rowNumber, 1, rowNumber, 22);
    const cell = worksheet.getCell(rowNumber, 1);
    cell.value = title;
    cell.font = { name: 'Arial', size: index === 0 ? 11 : 10, bold: index >= 2 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(rowNumber).height = 18;
  });

  worksheet.mergeCells('A6:V6');
  worksheet.getCell('A6').value = 'KATIPUNAN NG KABATAAN YOUTH PROFILE';
  worksheet.getCell('A6').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF166534' } };
  worksheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(6).height = 30;

  worksheet.mergeCells('A7:V7');
  worksheet.getCell('A7').value = filingYear ? `FILING YEAR ${filingYear}` : 'CONSOLIDATED YOUTH RECORDS';
  worksheet.getCell('A7').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF3F6212' } };
  worksheet.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A8:V8');
  worksheet.getCell('A8').value = `Total records: ${recordCount.toLocaleString('en-PH')}  |  Generated: ${new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'long',
    timeZone: 'Asia/Manila',
  }).format(generatedAt)}`;
  worksheet.getCell('A8').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  worksheet.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' };
};

const applyTableHeader = (worksheet: ExcelJS.Worksheet) => {
  worksheet.getRow(10).values = excelHeaderGroups;
  worksheet.getRow(11).values = excelSubheaders;

  [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].forEach((column) => {
    worksheet.mergeCells(10, column, 11, column);
  });
  worksheet.mergeCells('H10:J10');

  [10, 11].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    row.height = rowNumber === 10 ? 44 : 28;
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

const applyDataRowStyle = (row: ExcelJS.Row, index: number) => {
  row.height = 26;
  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1F2937' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF0FDF4' },
    };
    cell.alignment = {
      horizontal: [6, 15, 17, 18].includes(columnNumber) ? 'left' : 'center',
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

export const exportService = {
  async generateXlsx(data: any[], options: ExportOptions = {}): Promise<Buffer> {
    const generatedAt = options.generatedAt ?? new Date();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Local Youth Development Office - Boac';
    workbook.company = 'Municipality of Boac';
    workbook.created = generatedAt;
    workbook.modified = generatedAt;

    const worksheetName = options.filingYear
      ? `KK Youth Profile ${options.filingYear}`
      : 'KK Youth Profiles';
    const worksheet = workbook.addWorksheet(worksheetName, {
      properties: { defaultRowHeight: 20 },
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      },
      views: [{ state: 'frozen', ySplit: 11, activeCell: 'A12', showGridLines: false, zoomScale: 80 }],
    });

    worksheet.columns = excelColumnWidths.map((width) => ({ width }));
    applyWorkbookHeader(worksheet, options.filingYear, data.length, generatedAt);
    applyTableHeader(worksheet);

    if (data.length === 0) {
      worksheet.mergeCells('A12:V13');
      const emptyCell = worksheet.getCell('A12');
      emptyCell.value = options.filingYear
        ? `No youth records found for filing year ${options.filingYear}.`
        : 'No youth records found for this export.';
      emptyCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
      emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      data.forEach((record, index) => {
        const row = worksheet.addRow(excelRow(record, index, options.filingYear));
        applyDataRowStyle(row, index);
      });
    }

    worksheet.pageSetup.printTitlesRow = '1:11';
    worksheet.pageSetup.printArea = `A1:V${Math.max(13, worksheet.rowCount)}`;
    worksheet.headerFooter.oddFooter = `&LLocal Youth Development Office - Boac&C${worksheetName}&RPage &P of &N`;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  },

  generateCsv(data: any[]): Buffer {
    const rows = [csvHeaders, ...data.map(csvRow)];
    const csv = rows.map((row) => row.map((value) => csvCell(String(value))).join(',')).join('\r\n');
    return Buffer.from(`\uFEFF${csv}`, 'utf8');
  },
};
