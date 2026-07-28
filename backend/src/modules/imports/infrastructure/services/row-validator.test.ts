import { describe, expect, it } from 'vitest';
import type { ValidationContext } from './row-validator';
import { rowValidator } from './row-validator';

const context: ValidationContext = {
  filingYear: 2026,
  barangayName: 'Tabi',
  referenceOptions: [
    { id: 'age-child', group_code: 'YOUTH_AGE_GROUP', code: 'CHILD_YOUTH', label: 'Child Youth' },
    { id: 'age-core', group_code: 'YOUTH_AGE_GROUP', code: 'CORE_YOUTH', label: 'Core Youth' },
    { id: 'age-adult', group_code: 'YOUTH_AGE_GROUP', code: 'YOUNG_ADULT', label: 'Young Adult' },
    { id: 'sex-female', group_code: 'SEX_ASSIGNED_AT_BIRTH', code: 'FEMALE', label: 'Female' },
    { id: 'civil-single', group_code: 'CIVIL_STATUS', code: 'SINGLE', label: 'Single' },
    { id: 'class-osy', group_code: 'YOUTH_CLASSIFICATION', code: 'OUT_OF_SCHOOL', label: 'Out of School Youth' },
    { id: 'education-college', group_code: 'EDUCATIONAL_ATTAINMENT', code: 'COLLEGE', label: 'College Level' },
    { id: 'work-student', group_code: 'WORK_STATUS', code: 'STUDENT', label: 'Student' },
  ],
};

describe('rowValidator', () => {
  it('allows a missing birth date and leaves age data blank', () => {
    const result = rowValidator.validate({
      'FIRST NAME': 'Sample',
      'LAST NAME': 'Youth',
    }, context);

    expect(result.isValid).toBe(true);
    expect(result.normalizedData.birth_date).toBeNull();
    expect(result.validationWarnings).toContain(
      'Birth date is missing; age and youth age group will remain blank.',
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

  it('rejects partially supplied invalid birth dates', () => {
    const result = rowValidator.validate({
      'FIRST NAME': 'Sample',
      'LAST NAME': 'Youth',
      MONTH: 'October',
    }, context);

    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Birth date is invalid. Use MM/DD/YYYY or YYYY-MM-DD.');
  });

  it('uses the filing year boundary when checking ages', () => {
    const eligible = rowValidator.validate({ NAME: 'Eligible Youth', BIRTHDAY: '12/31/1996' }, context);
    const tooOld = rowValidator.validate({ NAME: 'Older Youth', BIRTHDAY: '12/31/1995' }, context);

    expect(eligible.isValid).toBe(true);
    expect(eligible.normalizedData.age_at_submission).toBe(30);
    expect(tooOld.isValid).toBe(false);
    expect(tooOld.validationErrors[0]).toContain('15 to 30 years old');
  });

  it('parses surname-first names and normalizes common official-sheet values', () => {
    const result = rowValidator.validate({
      BARANGAY: 'tabi',
      NAME: 'DELA CRUZ, ANA M.',
      BIRTHDAY: '01/15/2004',
      'SEX ASSIGNED AT BIRTH': 'F',
      'CIVIL STATUS': 'Sngle',
      'YOUTH CLASSIFICATION': 'OSY',
      'HIGHEST EDUCATIONAL ATTAINMENT': 'Collage Undergraduate',
      'WORK STATUS': 'Studying',
    }, context);

    expect(result.isValid).toBe(true);
    expect(result.normalizedData).toMatchObject({
      first_name: 'ANA',
      middle_name: 'M.',
      last_name: 'DELA CRUZ',
      sex_assigned_at_birth_id: 'sex-female',
      civil_status_id: 'civil-single',
      youth_classification_id: 'class-osy',
      educational_attainment_id: 'education-college',
      work_status_id: 'work-student',
    });
  });

  it('rejects a row assigned to another barangay', () => {
    const result = rowValidator.validate({ NAME: 'Wrong Place', BARANGAY: 'Payatas' }, context);

    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain(
      'Barangay "Payatas" does not match the selected barangay "Tabi".',
    );
  });

  it('keeps an optional malformed email as a warning instead of blocking the row', () => {
    const result = rowValidator.validate({
      NAME: 'Ana Youth',
      'E-MAIL ADDRESS': 'no email account',
    }, context);

    expect(result.isValid).toBe(true);
    expect(result.normalizedData.email).toBeNull();
    expect(result.validationWarnings).toContain(
      'Email address "no email account" was skipped because it is not valid.',
    );
  });

  it('preserves unanswered yes-or-no fields instead of converting them to no', () => {
    const result = rowValidator.validate({ NAME: 'No Answers Yet' }, context);

    expect(result.isValid).toBe(true);
    expect(result.normalizedData).toMatchObject({
      is_registered_voter: null,
      is_registered_sk_voter: null,
      is_registered_national_voter: null,
      voted_last_election: null,
      attended_kk_assembly: null,
      kk_assembly_count: 0,
    });
  });

  it('keeps explicit no answers as false', () => {
    const result = rowValidator.validate({
      NAME: 'Answered No',
      'REGISTERED VOTER?': 'No',
      'VOTED LAST ELECTION?': 'No',
      'ATTENDED KK ASSEMBLY?': 'No',
    }, context);

    expect(result.normalizedData).toMatchObject({
      is_registered_voter: false,
      voted_last_election: false,
      attended_kk_assembly: false,
    });
  });
});
