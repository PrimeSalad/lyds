import { describe, expect, it } from 'vitest';
import { importValueLookup, validateRegistryMetadata } from './registry-import-metadata';

describe('validateRegistryMetadata', () => {
  it('rejects a CSV whose registry or filing year does not match the selected category', () => {
    const errors: string[] = [];

    validateRegistryMetadata(importValueLookup({
      Registry: 'YOUTH_PROFILE',
      'Filing Year': '2025',
    }), {
      recordType: 'CHILD_LABORER',
      filingYear: 2026,
      barangayName: 'Tabi',
      categoryFields: [],
    }, errors);

    expect(errors).toEqual([
      'This CSV is for YOUTH_PROFILE; select a matching Child Laborer category.',
      'CSV filing year "2025" does not match selected filing year 2026.',
    ]);
  });

  it('preserves exported custom values and enforces required category fields', () => {
    const errors: string[] = [];
    const customValues = validateRegistryMetadata(importValueLookup({
      Registry: 'CHILD_LABORER',
      'Filing Year': '2026',
      'Custom Values JSON': '{"risk_level":"HIGH"}',
    }), {
      recordType: 'CHILD_LABORER',
      filingYear: 2026,
      barangayName: 'Tabi',
      categoryFields: [{ field_key: 'risk_level', label: 'Risk level', is_required: true, is_active: true }],
    }, errors);

    expect(errors).toEqual([]);
    expect(customValues).toEqual({ risk_level: 'HIGH' });
  });
});
