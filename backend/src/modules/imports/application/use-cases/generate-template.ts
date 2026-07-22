import ExcelJS from 'exceljs';

export const generateTemplate = async (): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');
  
  const headers = [
    'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'EXT NAME',
    'BIRTHDAY', 'SEX', 'CIVIL STATUS', 'YOUTH CLASSIFICATION',
    'AGE GROUP', 'WORK STATUS', 'EDUCATIONAL ATTAINMENT',
    'CONTACT NUMBER', 'EMAIL ADDRESS', 'PUROK',
    'REGISTERED SK VOTER?', 'REGISTERED NATIONAL VOTER?',
    'ATTENDED KK ASSEMBLY?', 'IF YES, HOW MANY TIMES?'
  ];
  
  worksheet.addRow(headers);
  
  // Basic formatting
  worksheet.getRow(1).font = { bold: true };
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
