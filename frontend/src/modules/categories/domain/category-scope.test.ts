import { describe, expect, it } from 'vitest';
import {
  availableCategoryYears,
  categoriesForRegistry,
  categoriesForYear,
  preferredCategoryYear,
} from './category-scope';

const categories = [
  { id: 'youth-2026', name: 'KK Youth Profile 2026', record_type: 'YOUTH_PROFILE' as const, filing_year: 2026, record_count: 0 },
  { id: 'youth-2025', name: 'KK Youth Profile 2025', record_type: 'YOUTH_PROFILE' as const, filing_year: 2025, record_count: 40 },
  { id: 'osy-2026', name: 'Out-of-School Youth 2026', record_type: 'OUT_OF_SCHOOL_YOUTH' as const, filing_year: 2026, record_count: 0 },
  { id: 'osy-2025', name: 'Out-of-School Youth 2025', record_type: 'OUT_OF_SCHOOL_YOUTH' as const, filing_year: 2025, record_count: 653 },
  { id: 'child-2025-b', name: 'Child Monitoring B', record_type: 'CHILD_LABORER' as const, filing_year: 2025, record_count: 0 },
  { id: 'child-2025-a', name: 'Child Monitoring A', record_type: 'CHILD_LABORER' as const, filing_year: 2025, record_count: 2 },
];

describe('category registry scope', () => {
  it('keeps Youth, OSY, and Child Laborer categories separate', () => {
    expect(categoriesForRegistry(categories, 'YOUTH_PROFILE').map((category) => category.id)).toEqual([
      'youth-2026',
      'youth-2025',
    ]);
    expect(categoriesForRegistry(categories, 'CHILD_LABORER').map((category) => category.id)).toEqual([
      'child-2025-b',
      'child-2025-a',
    ]);
    expect(categoriesForRegistry(categories, 'OUT_OF_SCHOOL_YOUTH').map((category) => category.id)).toEqual([
      'osy-2026',
      'osy-2025',
    ]);
  });

  it('derives years and categories only from the scoped registry', () => {
    const youthCategories = categoriesForRegistry(categories, 'YOUTH_PROFILE');
    const osyCategories = categoriesForRegistry(categories, 'OUT_OF_SCHOOL_YOUTH');
    const childCategories = categoriesForRegistry(categories, 'CHILD_LABORER');

    expect(availableCategoryYears(youthCategories)).toEqual([2026, 2025]);
    expect(availableCategoryYears(osyCategories)).toEqual([2026, 2025]);
    expect(availableCategoryYears(childCategories)).toEqual([2025]);
    expect(categoriesForYear(childCategories, 2025).map((category) => category.name)).toEqual([
      'Child Monitoring A',
      'Child Monitoring B',
    ]);
  });

  it('prefers the newest year that already contains records', () => {
    expect(preferredCategoryYear(categoriesForRegistry(categories, 'YOUTH_PROFILE'))).toBe(2025);
    expect(preferredCategoryYear(categoriesForRegistry(categories, 'OUT_OF_SCHOOL_YOUTH'))).toBe(2025);
    expect(preferredCategoryYear(categoriesForRegistry(categories, 'CHILD_LABORER'))).toBe(2025);
  });
});
