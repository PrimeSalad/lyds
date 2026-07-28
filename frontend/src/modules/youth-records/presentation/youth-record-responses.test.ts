import { describe, expect, it } from 'vitest';
import { answerToBoolean, booleanToAnswer } from './youth-record-responses';

describe('youth record yes/no responses', () => {
  it('keeps unanswered values distinct from no', () => {
    expect(booleanToAnswer(null)).toBe('');
    expect(booleanToAnswer(undefined)).toBe('');
    expect(answerToBoolean('')).toBeNull();
  });

  it('round-trips explicit yes and no answers', () => {
    expect(answerToBoolean(booleanToAnswer(true))).toBe(true);
    expect(answerToBoolean(booleanToAnswer(false))).toBe(false);
  });
});
