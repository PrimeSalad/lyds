import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../config/supabase', () => ({ supabaseAdmin: {} }));

import { findDuplicateYouthRows } from './duplicate-checker';

describe('findDuplicateYouthRows', () => {
  it('matches existing names despite punctuation and casing', () => {
    const matches = findDuplicateYouthRows(
      [{ id: 'existing-1', display_name: 'Ana M. Dela Cruz' }],
      [{ is_valid: true, normalized_data: { display_name: 'ANA M DELA-CRUZ' }, row_number: 11 }],
    );

    expect(matches.get(0)?.matchId).toBe('existing-1');
  });

  it('keeps the first upload row and marks a repeated name', () => {
    const matches = findDuplicateYouthRows([], [
      { is_valid: true, normalized_data: { display_name: 'Juan Santos' }, row_number: 11 },
      { is_valid: true, normalized_data: { display_name: 'JUAN  SANTOS' }, row_number: 18 },
    ]);

    expect(matches.has(0)).toBe(false);
    expect(matches.get(1)?.message).toContain('source row 11');
  });

  it('does not duplicate-check rows that are already invalid', () => {
    const matches = findDuplicateYouthRows(
      [{ id: 'existing-1', display_name: 'Juan Santos' }],
      [{ is_valid: false, normalized_data: { display_name: 'Juan Santos' }, row_number: 11 }],
    );

    expect(matches.size).toBe(0);
  });
});
