import { describe, expect, it } from 'vitest';
import { buildDemographicReport, NO_RESPONSE_LABEL, type DemographicReportRow } from './demographic-breakdown';

const makeRow = (overrides: Partial<DemographicReportRow> = {}): DemographicReportRow => ({
  sex: 'Female',
  civilStatus: 'Single',
  youthClassification: 'In-School Youth',
  youthAgeGroup: 'Core Youth',
  educationalAttainment: 'College Level',
  workStatus: 'Not Working',
  registeredVoter: true,
  votedLastElection: false,
  attendedAssembly: true,
  ...overrides,
});

describe('buildDemographicReport', () => {
  it('counts unanswered imported fields against the full record total', () => {
    const report = buildDemographicReport([
      makeRow(),
      makeRow(),
      makeRow({ sex: null, civilStatus: '', registeredVoter: null }),
    ]);

    expect(report.totalRecords).toBe(3);
    expect(report.sex).toEqual([
      { label: 'Female', count: 2, percentage: 66.7 },
      { label: NO_RESPONSE_LABEL, count: 1, percentage: 33.3 },
    ]);
    expect(report.civilStatus.at(-1)).toEqual({ label: NO_RESPONSE_LABEL, count: 1, percentage: 33.3 });
    expect(report.registeredVoter).toEqual([
      { label: 'Yes', count: 2, percentage: 66.7 },
      { label: NO_RESPONSE_LABEL, count: 1, percentage: 33.3 },
    ]);
  });

  it('keeps explicit false answers as No instead of treating them as unanswered', () => {
    const report = buildDemographicReport([makeRow({ votedLastElection: false, attendedAssembly: false })]);
    expect(report.votedLastElection).toEqual([{ label: 'No', count: 1, percentage: 100 }]);
    expect(report.attendedAssembly).toEqual([{ label: 'No', count: 1, percentage: 100 }]);
  });

  it('returns empty breakdowns for an empty report scope', () => {
    const report = buildDemographicReport([]);
    expect(report.totalRecords).toBe(0);
    expect(report.sex).toEqual([]);
    expect(report.registeredVoter).toEqual([]);
  });
});
