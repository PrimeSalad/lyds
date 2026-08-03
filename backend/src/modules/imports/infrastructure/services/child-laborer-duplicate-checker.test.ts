import { describe, expect, it, vi } from 'vitest';
import { findDuplicateChildLaborerRows } from './child-laborer-duplicate-checker';

vi.mock('../../../../config/supabase', () => ({ supabaseAdmin: {} }));

describe('findDuplicateChildLaborerRows', () => {
  it('detects existing and repeated child laborer rows without hiding clean rows', () => {
    const duplicates = findDuplicateChildLaborerRows(
      [{ id: 'existing-1', first_name: 'Ana', last_name: 'Dela Cruz', birth_date: '2012-01-15' }],
      [
        { row_number: 2, is_valid: true, normalized_data: { first_name: 'ANA', last_name: 'DELA CRUZ', birth_date: '2012-01-15' } },
        { row_number: 3, is_valid: true, normalized_data: { first_name: 'Ben', last_name: 'Santos', birth_date: '2011-05-02' } },
        { row_number: 4, is_valid: true, normalized_data: { first_name: 'Ben', last_name: 'Santos', birth_date: '2011-05-02' } },
      ],
    );

    expect(duplicates.get(0)?.matchId).toBe('existing-1');
    expect(duplicates.has(1)).toBe(false);
    expect(duplicates.get(2)?.message).toContain('source row 3');
  });
});
