import { describe, expect, it } from 'vitest';
import { createYouthRecordSchema } from './schema';

const validBaseInput = {
  category_id: '31c9ec06-ad92-46c8-87c9-1955f28c9293',
  first_name: 'Sample',
  last_name: 'Youth',
};

describe('createYouthRecordSchema', () => {
  it('accepts an omitted birth date', () => {
    expect(createYouthRecordSchema.safeParse(validBaseInput).success).toBe(true);
  });

  it('accepts an explicitly null birth date', () => {
    expect(createYouthRecordSchema.safeParse({
      ...validBaseInput,
      birth_date: null,
    }).success).toBe(true);
  });

  it('rejects a malformed birth date', () => {
    expect(createYouthRecordSchema.safeParse({
      ...validBaseInput,
      birth_date: 'October-O5-2000',
    }).success).toBe(false);
  });
});
