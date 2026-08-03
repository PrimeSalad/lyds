import { describe, expect, it } from 'vitest';
import { childLaborerRowValidator } from '../../imports/infrastructure/services/child-laborer-row-validator';
import { spreadsheetParser } from '../../imports/infrastructure/services/spreadsheet-parser';
import { childLaborerExportService, safeSpreadsheetValue } from './child-laborer-export-service';

describe('child laborer exports', () => {
  it('neutralizes spreadsheet formulas in user-entered fields', () => {
    expect(safeSpreadsheetValue('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")');
    expect(safeSpreadsheetValue('ordinary text')).toBe('ordinary text');
  });

  it('creates a UTF-8 CSV with the official consolidation columns', () => {
    const csv = childLaborerExportService.csv([], 2026).toString('utf8');
    expect(csv).toContain('Registry');
    expect(csv).toContain('Filing Year');
    expect(csv).toContain('Date of Birth (MM/DD/YY)');
    expect(csv).toContain('Record Status');
  });

  it('round-trips an exported Child Laborer CSV through import validation', async () => {
    const csv = childLaborerExportService.csv([{
      barangay_name: 'Tabi',
      last_name: 'Dela Cruz',
      first_name: 'Ana',
      middle_name: 'M.',
      age: 14,
      gender: 'FEMALE',
      birth_date: '2012-01-15',
      attending_school: true,
      highest_grade_completed: 'Grade 8',
      nature_of_work: 'Street vending',
      father_name: 'Juan Dela Cruz',
      mother_name: 'Maria Dela Cruz',
      guardian_name: null,
      parent_guardian_occupation: 'Farmer',
      record_status: 'IDENTIFIED',
      remarks: 'For assessment',
      custom_values: { risk_level: 'HIGH' },
    }], 2026);

    const parsed = await spreadsheetParser.parse(csv, 'text/csv', 'child-laborers-2026.csv', 'CHILD_LABORER');
    const result = childLaborerRowValidator.validate(parsed.rows[0].data, {
      recordType: 'CHILD_LABORER',
      filingYear: 2026,
      barangayName: 'Tabi',
      categoryFields: [{ field_key: 'risk_level', label: 'Risk level', is_required: true, is_active: true }],
    });

    expect(result.isValid).toBe(true);
    expect(result.normalizedData).toMatchObject({
      first_name: 'Ana',
      last_name: 'Dela Cruz',
      birth_date: '2012-01-15',
      custom_values: { risk_level: 'HIGH' },
    });
  });
});
