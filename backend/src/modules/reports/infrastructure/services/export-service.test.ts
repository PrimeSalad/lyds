import { describe, expect, it } from 'vitest';
import { exportService } from './export-service';

describe('exportService', () => {
  it('generates a real CSV with escaped values and formula protection', () => {
    const csv = exportService.generateCsv([{
      id: 'record-1',
      status: 'APPROVED',
      barangay: { name: 'Agot' },
      first_name: '=HYPERLINK("bad")',
      last_name: 'Dela, Cruz',
      is_registered_voter: true,
      voted_last_election: false,
      attended_kk_assembly: true,
      kk_assembly_count: 2,
    }]).toString('utf8');

    expect(csv).toContain('"ID","Status","Barangay"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Dela, Cruz"');
  });

  it('generates an XLSX workbook buffer', async () => {
    const output = await exportService.generateXlsx([{ id: 'record-1', status: 'DRAFT' }]);
    expect(output.subarray(0, 2).toString()).toBe('PK');
  });
});
