import { describe, expect, it } from 'vitest';
import { dashboardQuerySchema, exportRecordsQuerySchema } from './schema';

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
