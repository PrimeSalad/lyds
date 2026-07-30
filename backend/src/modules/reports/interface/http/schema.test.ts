import { describe, expect, it } from 'vitest';
import { dashboardQuerySchema, exportRecordsQuerySchema, reportQuerySchema } from './schema';

describe('dashboardQuerySchema', () => {
  it('coerces a valid coverage filing year', () => {
    expect(dashboardQuerySchema.parse({ filingYear: '2025' })).toEqual({ filingYear: 2025 });
  });

  it('rejects a filing year outside the supported range', () => {
    expect(() => dashboardQuerySchema.parse({ filingYear: '1999' })).toThrow();
  });
});

describe('exportRecordsQuerySchema', () => {
  it('coerces a filing year and defaults to XLSX', () => {
    expect(exportRecordsQuerySchema.parse({ filingYear: '2026' })).toEqual({
      filingYear: 2026,
      format: 'xlsx',
    });
  });

  it('rejects unsupported years and formats', () => {
    expect(() => exportRecordsQuerySchema.parse({ filingYear: '1999' })).toThrow();
    expect(() => exportRecordsQuerySchema.parse({ format: 'pdf' })).toThrow();
  });
});

describe('reportQuerySchema', () => {
  it('coerces the filing year used by summary and demographic reports', () => {
    expect(reportQuerySchema.parse({ filingYear: '2025', status: 'APPROVED' })).toEqual({
      filingYear: 2025,
      status: 'APPROVED',
    });
  });

  it('rejects invalid report years and statuses', () => {
    expect(() => reportQuerySchema.parse({})).toThrow();
    expect(() => reportQuerySchema.parse({ filingYear: '1999' })).toThrow();
    expect(() => reportQuerySchema.parse({ status: 'VALIDATED' })).toThrow();
  });
});
