import { describe, expect, it } from 'vitest';
import {
  computeAge,
  computeAgeForFilingYear,
  filingYearCutoff,
  isEligibleForFilingYear,
} from './age-computation';

describe('youth age computation', () => {
  it('computes age against an explicit date instead of the server clock', () => {
    expect(computeAge('2000-07-28', new Date('2026-07-27T00:00:00Z'))).toBe(25);
    expect(computeAge('2000-07-27', new Date('2026-07-27T00:00:00Z'))).toBe(26);
  });

  it('uses December 31 as the annual filing cutoff', () => {
    expect(filingYearCutoff(2027)).toBe('2027-12-31');
    expect(computeAgeForFilingYear('2012-12-31', 2027)).toBe(15);
    expect(computeAgeForFilingYear('1997-01-01', 2027)).toBe(30);
  });

  it('keeps the inclusive 15 to 30 age boundary', () => {
    expect(isEligibleForFilingYear('2012-12-31', 2027)).toBe(true);
    expect(isEligibleForFilingYear('1997-01-01', 2027)).toBe(true);
    expect(isEligibleForFilingYear('2013-01-01', 2027)).toBe(false);
    expect(isEligibleForFilingYear('1996-12-31', 2027)).toBe(false);
  });
});
