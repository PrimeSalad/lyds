import { describe, expect, it } from 'vitest';
import { computeChildAgeForFilingYear } from './child-laborer-age';

describe('computeChildAgeForFilingYear', () => {
  it('uses December 31 of the filing year for reproducible annual ages', () => {
    expect(computeChildAgeForFilingYear('2012-12-31', 2026)).toBe(14);
    expect(computeChildAgeForFilingYear('2012-01-01', 2026)).toBe(14);
  });

  it('never returns a negative age', () => {
    expect(computeChildAgeForFilingYear('2030-01-01', 2026)).toBe(0);
  });
});
