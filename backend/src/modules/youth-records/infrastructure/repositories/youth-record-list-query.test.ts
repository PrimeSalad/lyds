import { describe, expect, it } from 'vitest';
import {
  getYouthRecordOrderClauses,
  YOUTH_RECORD_LIST_SELECT,
} from './youth-record-list-query';

describe('youth record list query', () => {
  it('uses an inner many-to-one barangay relation so it can order parent youth rows', () => {
    expect(YOUTH_RECORD_LIST_SELECT).toContain('barangay:barangays!barangay_id!inner');
  });

  it('orders records by barangay then youth name for an A-Z barangay sort', () => {
    expect(getYouthRecordOrderClauses({ field: 'barangay_name', direction: 'asc' })).toEqual([
      { column: 'barangay(name)', ascending: true },
      { column: 'display_name', ascending: true },
      { column: 'id', ascending: true },
    ]);
  });

  it('reverses only the barangay groups for a Z-A barangay sort', () => {
    expect(getYouthRecordOrderClauses({ field: 'barangay_name', direction: 'desc' })).toEqual([
      { column: 'barangay(name)', ascending: false },
      { column: 'display_name', ascending: true },
      { column: 'id', ascending: true },
    ]);
  });

  it('keeps ordinary field sorting stable across pages', () => {
    expect(getYouthRecordOrderClauses({ field: 'display_name', direction: 'desc' })).toEqual([
      { column: 'display_name', ascending: false },
      { column: 'id', ascending: true },
    ]);
  });
});
