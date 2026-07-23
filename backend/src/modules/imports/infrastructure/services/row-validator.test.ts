import { describe, expect, it } from 'vitest';
import { rowValidator } from './row-validator';

const context = { referenceOptions: [] };

describe('rowValidator birth dates', () => {
  it('allows a missing birth date and leaves age data blank', () => {
    const result = rowValidator.validate({
      'FIRST NAME': 'Sample',
      'LAST NAME': 'Youth',
    }, context);

    expect(result.isValid).toBe(true);
    expect(result.normalizedData.birth_date).toBeUndefined();
    expect(result.validationWarnings).toContain(
      'Birth Date is missing; age and youth age group will remain blank.',
    );
  });

  it('normalizes a letter O in a numeric birth day', () => {
    const result = rowValidator.validate({
      'FIRST NAME': 'Aimee',
      'LAST NAME': 'Mogol',
      MONTH: 'Octob er',
      DAY: 'O5',
      YEAR: '2000',
    }, context);

    expect(result.isValid).toBe(true);
    expect(result.normalizedData.birth_date).toBe('2000-10-05');
    expect(result.validationWarnings).toContain('Normalized birth day "O5" to "05".');
  });

  it('still rejects partially supplied invalid birth dates', () => {
    const result = rowValidator.validate({
      'FIRST NAME': 'Sample',
      'LAST NAME': 'Youth',
      MONTH: 'October',
    }, context);

    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Valid Birth Date is required.');
  });
});
