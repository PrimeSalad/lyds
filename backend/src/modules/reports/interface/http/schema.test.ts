import { describe, expect, it } from 'vitest';
import { exportRecordsQuerySchema } from './schema';

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
