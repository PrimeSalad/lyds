import { describe, expect, it } from 'vitest';
import {
  childLaborerSummaryQuerySchema,
  createChildLaborerSchema,
  listChildLaborersQuerySchema,
} from './schema';

const validInput = {
  category_id: '22222222-2222-4222-8222-222222222222',
  filing_year: 2026,
  barangay_id: '11111111-1111-4111-8111-111111111111',
  first_name: 'Maria',
  last_name: 'Dela Cruz',
  birth_date: '2012-04-15',
  gender: 'FEMALE' as const,
  attending_school: true,
  nature_of_work: 'Seasonal farm work',
  mother_name: 'Ana Dela Cruz',
};

describe('child laborer HTTP schemas', () => {
  it('accepts a complete annual child laborer record', () => {
    expect(createChildLaborerSchema.parse(validInput)).toMatchObject({
      category_id: '22222222-2222-4222-8222-222222222222',
      filing_year: 2026,
      record_status: 'IDENTIFIED',
      mother_name: 'Ana Dela Cruz',
    });
  });

  it('requires at least one parent or guardian name', () => {
    const result = createChildLaborerSchema.safeParse({ ...validInput, mother_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a birth date after the filing year', () => {
    const result = createChildLaborerSchema.safeParse({ ...validInput, birth_date: '2027-01-01' });
    expect(result.success).toBe(false);
  });

  it('requires remarks before a record can be validated', () => {
    const withoutRemarks = createChildLaborerSchema.safeParse({
      ...validInput,
      record_status: 'VALIDATED',
      remarks: '   ',
    });
    const withRemarks = createChildLaborerSchema.safeParse({
      ...validInput,
      record_status: 'VALIDATED',
      remarks: 'Household details confirmed during field validation.',
    });

    expect(withoutRemarks.success).toBe(false);
    expect(withRemarks.success).toBe(true);
  });

  it('coerces list pagination and filing-year query values', () => {
    expect(listChildLaborersQuerySchema.parse({ filingYear: '2026', page: '2' })).toMatchObject({
      filingYear: 2026,
      page: 2,
      pageSize: 25,
    });
  });

  it('accepts report filters for status and search', () => {
    expect(childLaborerSummaryQuerySchema.parse({
      filingYear: '2026',
      status: 'VALIDATED',
      search: '  fishing  ',
    })).toEqual({
      filingYear: 2026,
      status: 'VALIDATED',
      search: 'fishing',
    });
  });
});
