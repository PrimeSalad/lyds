import { describe, expect, it } from 'vitest';
import { canTransition } from './status-transitions';

describe('canTransition', () => {
  it('lets an admin approve a draft record', () => {
    expect(canTransition('DRAFT', 'APPROVED', 'ADMIN')).toBe(true);
  });

  it('keeps SK officials from approving drafts directly', () => {
    expect(canTransition('DRAFT', 'APPROVED', 'SK_OFFICIAL')).toBe(false);
  });
});
