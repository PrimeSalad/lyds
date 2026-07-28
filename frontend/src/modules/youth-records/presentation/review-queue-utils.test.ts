import { describe, expect, it } from 'vitest';
import { filterReviewBarangays, formatReviewSubmittedAt, getReviewPageRange } from './review-queue-utils';

describe('review queue utilities', () => {
  const barangays = [
    { barangayName: 'Amoingon', pendingReview: 2 },
    { barangayName: 'Bantad', pendingReview: 4 },
  ];

  it('filters barangays without case sensitivity or surrounding spaces', () => {
    expect(filterReviewBarangays(barangays, '  BANT  ')).toEqual([
      { barangayName: 'Bantad', pendingReview: 4 },
    ]);
  });

  it('returns a safe label for malformed submission dates', () => {
    expect(formatReviewSubmittedAt('not-a-date')).toBe('Submission date unavailable');
  });

  it('calculates the visible record range on the last page', () => {
    expect(getReviewPageRange(3, 10, 24)).toEqual({ start: 21, end: 24 });
    expect(getReviewPageRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
  });
});
