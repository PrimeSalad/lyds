import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());

vi.mock('../../../infrastructure/api-client', () => ({
  apiClient: { request },
}));

import { childLaborerApi } from './child-laborer-api';

describe('childLaborerApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the analytics summary synchronized with every report filter', async () => {
    request.mockResolvedValueOnce({
      data: {
        total_records: 0,
        attending_school: 0,
        not_attending_school: 0,
        active_cases: 0,
        closed_cases: 0,
      },
    });

    await childLaborerApi.summary({
      filingYear: 2026,
      barangayId: '11111111-1111-4111-8111-111111111111',
      status: 'VALIDATED',
      search: 'copra farming',
    });

    expect(request).toHaveBeenCalledWith(
      '/child-laborers/summary?filingYear=2026&barangayId=11111111-1111-4111-8111-111111111111&status=VALIDATED&search=copra+farming',
    );
  });

  it('keeps reports usable while an older API deployment is being replaced', async () => {
    request.mockResolvedValueOnce({
      data: {
        total_records: 60,
        attending_school: 32,
        not_attending_school: 28,
        active_cases: 60,
        closed_cases: 0,
      },
    });

    const result = await childLaborerApi.summary({ filingYear: 2026 });

    expect(result.data).toMatchObject({
      total_records: 60,
      status_counts: {},
      gender_distribution: [],
      age_distribution: [],
      barangay_distribution: [],
      work_distribution: [],
      data_quality: { completeness_percentage: 0 },
    });
  });
});
