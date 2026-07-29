import { describe, expect, it } from 'vitest';
import { CHILD_LABORER_SELECT, childLaborerOrderClauses } from './child-laborer-query';

describe('child laborer list query', () => {
  it('uses an inner barangay relation for sortable barangay names', () => {
    expect(CHILD_LABORER_SELECT).toContain('barangay:barangays!barangay_id!inner');
  });

  it('sorts child names by surname then first name', () => {
    expect(childLaborerOrderClauses({ field: 'child_name', direction: 'asc' })).toEqual([
      { column: 'last_name', ascending: true },
      { column: 'first_name', ascending: true },
      { column: 'id', ascending: true },
    ]);
  });
});
