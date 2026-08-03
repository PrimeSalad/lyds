import {
  childLaborerGenders,
  childLaborerStatuses,
  type ChildLaborerGender,
  type ChildLaborerStatus,
} from '../../../child-laborers/domain/child-laborer';
import {
  normalizeChildLaborerRemarks,
  normalizeNatureOfWork,
  normalizeParentGuardianOccupation,
} from '../../../child-laborers/domain/child-laborer-text-normalization';
import {
  importValue,
  importValueLookup,
  validateRegistryMetadata,
  type RegistryImportContext,
} from './registry-import-metadata';

const monthNumbers: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const normalizeValue = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const buildIsoDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const fullYear = (year: number, filingYear: number) => {
  if (year >= 100) return year;
  return 2000 + year <= filingYear ? 2000 + year : 1900 + year;
};

const parseBirthDate = (value: string, filingYear: number) => {
  const cleaned = value.replace(/[oO]/g, '0').replace(/\s+/g, ' ').trim();
  const yearFirst = cleaned.match(/^(\d{4})[-/]([0-1]?\d)[-/]([0-3]?\d)$/);
  if (yearFirst) return buildIsoDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));

  const monthFirst = cleaned.match(/^([0-1]?\d)[-/]([0-3]?\d)[-/](\d{2}|\d{4})$/);
  if (monthFirst) {
    return buildIsoDate(
      fullYear(Number(monthFirst[3]), filingYear),
      Number(monthFirst[1]),
      Number(monthFirst[2]),
    );
  }

  const namedMonth = cleaned.match(/^([A-Za-z]+)\s+([0-3]?\d),?\s+(\d{2}|\d{4})$/);
  if (!namedMonth) return null;
  const month = monthNumbers[namedMonth[1].slice(0, 3).toLowerCase()];
  return month
    ? buildIsoDate(fullYear(Number(namedMonth[3]), filingYear), month, Number(namedMonth[2]))
    : null;
};

const booleanValue = (value: string) => {
  const normalized = normalizeValue(value).replace(/\s+/g, '');
  if (['YES', 'Y', 'TRUE', '1'].includes(normalized)) return true;
  if (['NO', 'N', 'FALSE', '0'].includes(normalized)) return false;
  return null;
};

const genderValue = (value: string): ChildLaborerGender | null => {
  const normalized = normalizeValue(value).replace(/\s+/g, '_');
  if (['M', 'MALE', 'BOY'].includes(normalized)) return 'MALE';
  if (['F', 'FEMALE', 'GIRL'].includes(normalized)) return 'FEMALE';
  if (['NOT_SPECIFIED', 'UNSPECIFIED', 'UNKNOWN', 'N_A', 'NA'].includes(normalized)) return 'NOT_SPECIFIED';
  return null;
};

const statusValue = (value: string): ChildLaborerStatus | null => {
  const normalized = normalizeValue(value).replace(/\s+/g, '_') as ChildLaborerStatus;
  return childLaborerStatuses.includes(normalized) ? normalized : null;
};

const validateLength = (value: string, label: string, max: number, errors: string[]) => {
  if (value.length > max) errors.push(`${label} must be ${max} characters or fewer.`);
};

export const childLaborerRowValidator = {
  validate: (
    rawRow: Record<string, string>,
    context: RegistryImportContext,
  ): {
    isValid: boolean;
    normalizedData: Record<string, unknown>;
    validationErrors: string[];
    validationWarnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lookup = importValueLookup(rawRow);
    const customValues = validateRegistryMetadata(lookup, context, errors);

    const firstName = importValue(lookup, ['FIRST NAME', 'FIRST_NAME', 'FIRSTNAME']);
    const middleName = importValue(lookup, ['MIDDLE NAME', 'MIDDLE_NAME', 'MIDDLENAME']);
    const lastName = importValue(lookup, ['LAST NAME', 'LAST_NAME', 'LASTNAME', 'SURNAME']);
    if (!firstName || !lastName) errors.push('First name and last name are required.');
    validateLength(firstName, 'First name', 100, errors);
    validateLength(middleName, 'Middle name', 100, errors);
    validateLength(lastName, 'Last name', 100, errors);

    const sourceBarangay = importValue(lookup, ['BARANGAY', 'BARANGAY NAME']);
    if (sourceBarangay && normalizeValue(sourceBarangay) !== normalizeValue(context.barangayName)) {
      errors.push(`Barangay "${sourceBarangay}" does not match the selected barangay "${context.barangayName}".`);
    }

    const birthDateRaw = importValue(lookup, [
      'DATE OF BIRTH (MM/DD/YY)',
      'DATE OF BIRTH',
      'BIRTH DATE',
      'BIRTHDAY',
      'DOB',
    ]);
    const birthDate = birthDateRaw ? parseBirthDate(birthDateRaw, context.filingYear) : null;
    if (!birthDateRaw) errors.push('Birth date is required.');
    else if (!birthDate) errors.push('Birth date is invalid. Use MM/DD/YYYY or YYYY-MM-DD.');
    else if (birthDate > `${context.filingYear}-12-31`) {
      errors.push(`Birth date must be on or before December 31, ${context.filingYear}.`);
    }

    const genderRaw = importValue(lookup, ['GENDER', 'SEX']);
    const gender = genderValue(genderRaw);
    if (!genderRaw) errors.push('Gender is required.');
    else if (!gender || !childLaborerGenders.includes(gender)) errors.push(`Gender "${genderRaw}" is not recognized.`);

    const attendingSchoolRaw = importValue(lookup, ['ATTENDING SCHOOL (YES/NO)', 'ATTENDING SCHOOL', 'IN SCHOOL']);
    const attendingSchool = booleanValue(attendingSchoolRaw);
    if (!attendingSchoolRaw) errors.push('Attending school is required.');
    else if (attendingSchool === null) errors.push('Attending school must be Yes or No.');

    const highestGradeCompleted = importValue(lookup, ['HIGHEST GRADE COMPLETED', 'HIGHEST GRADE']);
    const natureOfWorkRaw = importValue(lookup, ['NATURE OF WORK', 'WORK', 'OCCUPATION']);
    const natureOfWork = natureOfWorkRaw ? normalizeNatureOfWork(natureOfWorkRaw) : '';
    if (!natureOfWork) errors.push('Nature of work is required.');
    validateLength(highestGradeCompleted, 'Highest grade completed', 150, errors);
    validateLength(natureOfWork, 'Nature of work', 300, errors);

    const fatherName = importValue(lookup, ['FATHER', 'FATHER NAME']);
    const motherName = importValue(lookup, ['MOTHER', 'MOTHER NAME']);
    const guardianName = importValue(lookup, ['GUARDIAN', 'GUARDIAN NAME']);
    if (!fatherName && !motherName && !guardianName) errors.push('Enter at least one parent or guardian name.');
    validateLength(fatherName, 'Father name', 200, errors);
    validateLength(motherName, 'Mother name', 200, errors);
    validateLength(guardianName, 'Guardian name', 200, errors);

    const parentOccupationRaw = importValue(lookup, [
      'PARENT/GUARDIAN OCCUPATION',
      'PARENT GUARDIAN OCCUPATION',
    ]);
    const parentGuardianOccupation = normalizeParentGuardianOccupation(parentOccupationRaw);
    validateLength(parentGuardianOccupation ?? '', 'Parent or guardian occupation', 300, errors);

    const statusRaw = importValue(lookup, ['RECORD STATUS', 'STATUS']);
    let recordStatus = statusRaw ? statusValue(statusRaw) : 'IDENTIFIED';
    if (statusRaw && !recordStatus) errors.push(`Record status "${statusRaw}" is not recognized.`);
    if (recordStatus === 'ARCHIVED') {
      recordStatus = 'IDENTIFIED';
      warnings.push('Archived source status was reset to Identified for import.');
    }

    const remarks = normalizeChildLaborerRemarks(importValue(lookup, ['REMARKS', 'NOTES']));
    validateLength(remarks ?? '', 'Remarks', 1000, errors);
    if (recordStatus === 'VALIDATED' && !remarks) {
      errors.push('Remarks are required before a record can be marked as validated.');
    }

    const displayName = [firstName, middleName, lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const normalizedData = {
      display_name: displayName,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      birth_date: birthDate,
      gender,
      attending_school: attendingSchool,
      highest_grade_completed: highestGradeCompleted || null,
      nature_of_work: natureOfWork,
      father_name: fatherName || null,
      mother_name: motherName || null,
      guardian_name: guardianName || null,
      parent_guardian_occupation: parentGuardianOccupation,
      record_status: recordStatus,
      remarks,
      custom_values: customValues,
    };

    return {
      isValid: errors.length === 0,
      normalizedData,
      validationErrors: errors,
      validationWarnings: warnings,
    };
  },
};
