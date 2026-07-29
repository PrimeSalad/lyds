import { describe, expect, it } from 'vitest';
import { childLaborerExportService, safeSpreadsheetValue } from './child-laborer-export-service';

describe('child laborer exports', () => {
  it('neutralizes spreadsheet formulas in user-entered fields', () => {
    expect(safeSpreadsheetValue('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")');
    expect(safeSpreadsheetValue('ordinary text')).toBe('ordinary text');
  });

  it('creates a UTF-8 CSV with the official consolidation columns', () => {
    const csv = childLaborerExportService.csv([]).toString('utf8');
    expect(csv).toContain('Date of Birth (MM/DD/YY)');
    expect(csv).toContain('Record Status');
  });
});
