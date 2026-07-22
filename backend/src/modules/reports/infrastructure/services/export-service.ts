import ExcelJS from 'exceljs';

const headers = [
  'ID', 'Status', 'Barangay', 'First Name', 'Middle Name', 'Last Name', 'Suffix',
  'Birth Date', 'Sex', 'Civil Status', 'Youth Classification', 'Age Group',
  'Work Status', 'Educational Attainment', 'Contact Number', 'Email',
  'Purok', 'Registered Voter', 'Voted Last Election',
  'Attended KK Assembly', 'KK Assembly Count', 'Created At',
];

const sanitize = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  return /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
};

const exportRow = (row: any) => [
  sanitize(row.id),
  sanitize(row.status),
  sanitize(row.barangay?.name),
  sanitize(row.first_name),
  sanitize(row.middle_name),
  sanitize(row.last_name),
  sanitize(row.suffix),
  sanitize(row.birth_date),
  sanitize(row.sex?.label),
  sanitize(row.civil_status?.label),
  sanitize(row.youth_classification?.label),
  sanitize(row.youth_age_group?.label),
  sanitize(row.work_status?.label),
  sanitize(row.educational_attainment?.label),
  sanitize(row.contact_number),
  sanitize(row.email),
  sanitize(row.purok),
  row.is_registered_voter ? 'Yes' : 'No',
  row.voted_last_election ? 'Yes' : 'No',
  row.attended_kk_assembly ? 'Yes' : 'No',
  sanitize(row.kk_assembly_count),
  sanitize(row.created_at),
];

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export const exportService = {
  async generateXlsx(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Youth Profiles');
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    data.forEach((row) => worksheet.addRow(exportRow(row)));
    worksheet.columns.forEach((column) => {
      const values = Array.from(column.values ?? []).slice(1);
      column.width = Math.min(32, Math.max(12, ...values.map((value) => String(value ?? '').length + 2)));
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  },

  generateCsv(data: any[]): Buffer {
    const rows = [headers, ...data.map(exportRow)];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    return Buffer.from(`\uFEFF${csv}`, 'utf8');
  },
};
