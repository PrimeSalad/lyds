import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());

vi.mock('../../../infrastructure/api-client', () => ({
  apiClient: { request },
}));

import { childLaborerApi } from './child-laborer-api';

const record = {
  id: 'child-laborer-1',
  filing_year: 2026,
  barangay_id: '11111111-1111-4111-8111-111111111111',
  barangay_name: 'Amoingon',
  first_name: 'Maria',
  middle_name: null,
  last_name: 'Dela Cruz',
  child_name: 'Dela Cruz, Maria',
  birth_date: '2011-01-01',
  age: 15,
  gender: 'FEMALE',
  attending_school: true,
  highest_grade_completed: 'Grade 9',
  nature_of_work: 'Copra Farming',
  father_name: null,
  mother_name: 'Ana Dela Cruz',
  guardian_name: null,
  parent_guardian_occupation: 'Farmer',
  record_status: 'VALIDATED',
  remarks: 'Confirmed',
  version: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

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
        status_counts: {},
        gender_distribution: [],
        age_distribution: [],
        barangay_distribution: [],
        work_distribution: [],
        data_quality: {
          completeness_percentage: 0,
          complete_records: 0,
          records_with_grade: 0,
          records_with_parent_occupation: 0,
          records_with_specified_work: 0,
        },
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

  it('rebuilds missing chart data while an older API deployment is being replaced', async () => {
    request
      .mockResolvedValueOnce({
        data: {
          total_records: 60,
          attending_school: 32,
          not_attending_school: 28,
          active_cases: 60,
          closed_cases: 0,
        },
      })
      .mockResolvedValueOnce({
        data: [record],
        meta: {
          page: 1,
          pageSize: 100,
          totalItems: 1,
          totalPages: 1,
        },
      });

    const result = await childLaborerApi.summary({ filingYear: 2026 });

    expect(request).toHaveBeenNthCalledWith(
      2,
      '/child-laborers?filingYear=2026&page=1&pageSize=100&sortField=barangay_name&sortDir=asc',
    );
    expect(result.data).toMatchObject({
      total_records: 1,
      status_counts: { VALIDATED: 1 },
      gender_distribution: [
        { key: 'MALE', count: 0 },
        { key: 'FEMALE', count: 1 },
        { key: 'NOT_SPECIFIED', count: 0 },
      ],
      age_distribution: [
        { key: 'UNDER_10', count: 0 },
        { key: 'AGE_10_14', count: 0 },
        { key: 'AGE_15_17', count: 1 },
        { key: 'AGE_18_PLUS', count: 0 },
      ],
      barangay_distribution: [
        { label: 'Amoingon', count: 1 },
      ],
      work_distribution: [
        { label: 'Copra Farming', count: 1 },
      ],
      data_quality: { completeness_percentage: 100 },
    });
  });
});
