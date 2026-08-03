import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());

vi.mock('../../../infrastructure/api-client', () => ({
  apiClient: { request },
}));

import { youthRecordApi } from './youth-record-api';

describe('youthRecordApi exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports an import-compatible CSV within one category and barangay scope', async () => {
    request.mockResolvedValueOnce(new Blob());

    await youthRecordApi.exportFilingYear(2026, 'csv', {
      categoryId: '22222222-2222-4222-8222-222222222222',
      barangayId: '11111111-1111-4111-8111-111111111111',
      status: 'APPROVED',
    });

    expect(request).toHaveBeenCalledWith(
      '/reports/export?format=csv&filingYear=2026&categoryId=22222222-2222-4222-8222-222222222222&barangayId=11111111-1111-4111-8111-111111111111&status=APPROVED',
    );
  });

  it.each(['csv', 'xlsx'] as const)('exports OSY filing years as %s', async (format) => {
    request.mockResolvedValueOnce(new Blob());

    await youthRecordApi.exportFilingYear(2026, format, {
      categoryId: '33333333-3333-4333-8333-333333333333',
      recordType: 'OUT_OF_SCHOOL_YOUTH',
    });

    expect(request).toHaveBeenCalledWith(
      `/reports/export?format=${format}&filingYear=2026&categoryId=33333333-3333-4333-8333-333333333333&recordType=OUT_OF_SCHOOL_YOUTH`,
    );
  });
});
