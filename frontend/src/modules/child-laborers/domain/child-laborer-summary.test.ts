import { describe, expect, it } from 'vitest';
import type { ChildLaborerRecord } from '../../../generated/api/api-types';
import { buildChildLaborerSummary } from './child-laborer-summary';

const record = (input: Partial<ChildLaborerRecord> = {}): ChildLaborerRecord => ({
  id: crypto.randomUUID(),
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
  ...input,
});

describe('buildChildLaborerSummary', () => {
  it('rebuilds every chart distribution from current list records', () => {
    const summary = buildChildLaborerSummary([
      record(),
      record({
        id: crypto.randomUUID(),
        barangay_id: '22222222-2222-4222-8222-222222222222',
        barangay_name: 'Binunga',
        age: 13,
        gender: 'MALE',
        attending_school: false,
        nature_of_work: 'Artisanal Fishing',
        record_status: 'IDENTIFIED',
        remarks: null,
      }),
    ]);

    expect(summary.status_counts).toMatchObject({ IDENTIFIED: 1, VALIDATED: 1 });
    expect(summary.gender_distribution.map((item) => item.count)).toEqual([1, 1, 0]);
    expect(summary.age_distribution.map((item) => item.count)).toEqual([0, 1, 1, 0]);
    expect(summary.barangay_distribution).toHaveLength(2);
    expect(summary.work_distribution.map((item) => item.label)).toEqual(['Artisanal Fishing', 'Copra Farming']);
  });

  it('keeps the canonical Not Reported label out of completed work information', () => {
    const summary = buildChildLaborerSummary([record({ nature_of_work: 'Not Reported' })]);

    expect(summary.data_quality).toMatchObject({
      completeness_percentage: 66.7,
      complete_records: 0,
      records_with_specified_work: 0,
    });
  });
});
