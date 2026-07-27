import { describe, expect, it } from 'vitest';
import { assertImportBatchAccess, resolveImportBarangayId } from './import-access';

const batch = { barangay_id: 'barangay-a' } as any;

describe('import access', () => {
  it('requires an administrator to choose a barangay', () => {
    expect(() => resolveImportBarangayId(undefined, {
      profileId: 'admin', role: 'ADMIN', barangayId: null,
    })).toThrow('Select a barangay');
  });

  it('forces an SK import to the assigned barangay', () => {
    expect(resolveImportBarangayId(undefined, {
      profileId: 'sk', role: 'SK_OFFICIAL', barangayId: 'barangay-a',
    })).toBe('barangay-a');
  });

  it('rejects cross-barangay batch access for an SK official', () => {
    expect(() => assertImportBatchAccess(batch, {
      profileId: 'sk', role: 'SK_OFFICIAL', barangayId: 'barangay-b',
    })).toThrow('access to this import batch');
  });
});
