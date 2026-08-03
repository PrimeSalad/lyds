import { describe, expect, it } from 'vitest';
import { createCategorySchema, listCategoriesQuerySchema } from './schema';

describe('category HTTP schemas', () => {
  it('accepts either supported registry as a category scope', () => {
    expect(listCategoriesQuerySchema.parse({ recordType: 'YOUTH_PROFILE' })).toEqual({
      recordType: 'YOUTH_PROFILE',
    });
    expect(listCategoriesQuerySchema.parse({ recordType: 'CHILD_LABORER' })).toEqual({
      recordType: 'CHILD_LABORER',
    });
    expect(listCategoriesQuerySchema.parse({ recordType: 'OUT_OF_SCHOOL_YOUTH' })).toEqual({
      recordType: 'OUT_OF_SCHOOL_YOUTH',
    });
  });

  it('rejects unsupported record types when creating categories', () => {
    const base = {
      code: 'CHILD_LABORER_2026',
      name: 'Child Laborer Records 2026',
      filing_year: 2026,
      permission_mode: 'SK_FILLABLE' as const,
      allow_sk_export: false,
    };

    expect(createCategorySchema.safeParse({ ...base, record_type: 'CHILD_LABORER' }).success).toBe(true);
    expect(createCategorySchema.safeParse({ ...base, record_type: 'OUT_OF_SCHOOL_YOUTH' }).success).toBe(true);
    expect(createCategorySchema.safeParse({ ...base, record_type: 'UNSUPPORTED' }).success).toBe(false);
  });
});
