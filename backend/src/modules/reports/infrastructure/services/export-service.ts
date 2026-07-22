import ExcelJS from 'exceljs';

export const exportService = {
  async generateExport(data: any[], _title: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Data');
    
    const headers = [
      'ID', 'Status', 'Barangay', 'First Name', 'Middle Name', 'Last Name', 'Ext Name',
      'Birth Date', 'Sex', 'Civil Status', 'Youth Classification', 'Age Group',
      'Work Status', 'Educational Attainment', 'Contact Number', 'Email',
      'Purok', 'Registered SK Voter', 'Registered National Voter',
      'Attended KK Assembly', 'KK Assembly Count', 'Created At'
    ];
    
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    
    const sanitize = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (/^[=+\-@]/.test(str)) {
        return `'${str}`; // Formula injection protection
      }
      return str;
    };
    
    for (const row of data) {
      worksheet.addRow([
        sanitize(row.id),
        sanitize(row.youth_profile_status),
        sanitize(row.barangay?.name),
        sanitize(row.first_name),
        sanitize(row.middle_name),
        sanitize(row.last_name),
        sanitize(row.ext_name),
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
        row.is_registered_sk_voter ? 'Yes' : 'No',
        row.is_registered_national_voter ? 'Yes' : 'No',
        row.attended_kk_assembly ? 'Yes' : 'No',
        sanitize(row.kk_assembly_count),
        sanitize(row.created_at)
      ]);
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
};
