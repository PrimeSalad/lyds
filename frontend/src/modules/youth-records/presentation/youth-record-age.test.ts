import { describe, expect, it } from 'vitest';
import { computeYouthRecordAge } from './youth-record-age';

describe('computeYouthRecordAge', () => {
  it('uses December 31 of the filing year for historical profiles', () => {
    expect(computeYouthRecordAge('1995-12-31', 2025)).toBe(30);
    expect(computeYouthRecordAge('1995-01-01', 2025)).toBe(30);
  });

  it('keeps the annual eligibility boundaries inclusive', () => {
    expect(computeYouthRecordAge('2010-12-31', 2025)).toBe(15);
    expect(computeYouthRecordAge('1994-12-31', 2025)).toBe(31);
  });
});
