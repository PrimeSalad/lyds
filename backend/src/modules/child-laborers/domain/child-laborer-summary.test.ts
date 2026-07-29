import { describe, expect, it } from 'vitest';
import { buildChildLaborerSummary, type ChildLaborerSummarySource } from './child-laborer-summary';

const source = (
  overrides: Partial<ChildLaborerSummarySource> = {},
): ChildLaborerSummarySource => ({
  filing_year: 2026,
  barangay_id: 'barangay-agot',
  birth_date: '2012-04-15',
  gender: 'FEMALE',
  attending_school: true,
  highest_grade_completed: 'Grade 8',
  nature_of_work: 'Seasonal farm work',
  parent_guardian_occupation: 'Farmer',
  record_status: 'VALIDATED',
  barangay: { name: 'Agot' },
  ...overrides,
});

describe('buildChildLaborerSummary', () => {
  it('builds complete report distributions from the filtered records', () => {
    const summary = buildChildLaborerSummary([
      source(),
      source({
        barangay_id: 'barangay-bamban',
        barangay: [{ name: 'Bamban' }],
        birth_date: '2009-01-10',
        gender: 'MALE',
        attending_school: false,
        record_status: 'MONITORED',
        nature_of_work: 'Fishing',
      }),
      source({
        birth_date: '2018-08-01',
        gender: 'NOT_SPECIFIED',
        record_status: 'CLOSED',
        highest_grade_completed: null,
        parent_guardian_occupation: null,
        nature_of_work: 'Not specified in source workbook',
      }),
    ]);

    expect(summary).toMatchObject({
      total_records: 3,
      attending_school: 2,
      not_attending_school: 1,
      active_cases: 2,
      closed_cases: 1,
      status_counts: { VALIDATED: 1, MONITORED: 1, CLOSED: 1 },
      data_quality: {
        completeness_percentage: 66.7,
        complete_records: 2,
        records_with_grade: 2,
        records_with_parent_occupation: 2,
        records_with_specified_work: 2,
      },
    });
    expect(summary.gender_distribution).toEqual([
      { key: 'MALE', label: 'Male', count: 1, percentage: 33.3 },
      { key: 'FEMALE', label: 'Female', count: 1, percentage: 33.3 },
      { key: 'NOT_SPECIFIED', label: 'Not specified', count: 1, percentage: 33.3 },
    ]);
    expect(summary.age_distribution.map((item) => item.count)).toEqual([1, 1, 1, 0]);
    expect(summary.barangay_distribution).toEqual([
      { key: 'barangay-agot', label: 'Agot', count: 2, percentage: 66.7 },
      { key: 'barangay-bamban', label: 'Bamban', count: 1, percentage: 33.3 },
    ]);
  });

  it('returns zero-safe analytics for an empty report', () => {
    const summary = buildChildLaborerSummary([]);

    expect(summary.total_records).toBe(0);
    expect(summary.gender_distribution.every((item) => item.percentage === 0)).toBe(true);
    expect(summary.data_quality.completeness_percentage).toBe(0);
    expect(summary.barangay_distribution).toEqual([]);
    expect(summary.work_distribution).toEqual([]);
  });

  it('groups work labels case-insensitively and combines the long tail', () => {
    const labels = [
      'Fishing',
      'fishing',
      'Farm work',
      'Vending',
      'Construction',
      'Domestic work',
      'Porter',
      'Car wash',
    ];
    const summary = buildChildLaborerSummary(labels.map((natureOfWork, index) => source({
      barangay_id: `barangay-${index}`,
      nature_of_work: natureOfWork,
    })));

    expect(summary.work_distribution).toHaveLength(6);
    expect(summary.work_distribution[0]).toMatchObject({ label: 'Fishing', count: 2 });
    expect(summary.work_distribution.at(-1)).toMatchObject({ label: 'Other reported work', count: 2 });
  });
});
