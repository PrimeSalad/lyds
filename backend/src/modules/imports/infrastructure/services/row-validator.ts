import {
  computeAgeForFilingYear,
  computeAgeGroup,
  isEligibleYouthAge,
} from '../../../youth-records/domain/rules/age-computation';
import {
  validateRegistryMetadata,
  type RegistryImportContext,
} from './registry-import-metadata';
import { normalizeSpreadsheetHeader } from './spreadsheet-parser';

export type ImportReferenceOption = {
  id: string;
  group_code?: string | null;
  category_code?: string | null;
  code: string;
  label: string;
};

export interface ValidationContext extends RegistryImportContext {
  referenceOptions: ImportReferenceOption[];
}

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

const compactValue = (value: string) => normalizeValue(value).replace(/\s+/g, '');

const valueLookup = (rawRow: Record<string, string>) => new Map(
  Object.entries(rawRow).map(([key, value]) => [normalizeSpreadsheetHeader(key), String(value ?? '').trim()]),
);

const getValue = (lookup: Map<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const value = lookup.get(normalizeSpreadsheetHeader(alias));
    if (value) return value;
  }
  return '';
};

const buildIsoDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const resolveShortYear = (year: number, month: number, day: number, filingYear: number) => {
  if (year >= 100) return year;
  const candidates = [1900 + year, 2000 + year];
  const eligible = candidates.find((candidate) => {
    const isoDate = buildIsoDate(candidate, month, day);
    return isoDate ? isEligibleYouthAge(computeAgeForFilingYear(isoDate, filingYear)) : false;
  });
  return eligible ?? (2000 + year <= filingYear ? 2000 + year : 1900 + year);
};

const parseCombinedDate = (value: string, filingYear: number) => {
  const cleaned = value.replace(/[oO]/g, '0').replace(/\s+/g, ' ').trim();
  const yearFirst = cleaned.match(/^(\d{4})[-/]([0-1]?\d)[-/]([0-3]?\d)$/);
  if (yearFirst) return buildIsoDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));

  const monthFirst = cleaned.match(/^([0-1]?\d)[-/]([0-3]?\d)[-/](\d{2}|\d{4})$/);
  if (monthFirst) {
    const month = Number(monthFirst[1]);
    const day = Number(monthFirst[2]);
    const year = resolveShortYear(Number(monthFirst[3]), month, day, filingYear);
    return buildIsoDate(year, month, day);
  }

  const namedMonth = cleaned.match(/^([A-Za-z]+)\s+([0-3]?\d),?\s+(\d{2}|\d{4})$/);
  if (namedMonth) {
    const month = monthNumbers[namedMonth[1].slice(0, 3).toLowerCase()];
    if (!month) return null;
    const day = Number(namedMonth[2]);
    const year = resolveShortYear(Number(namedMonth[3]), month, day, filingYear);
    return buildIsoDate(year, month, day);
  }

  return null;
};

const parseSeparateDate = (monthValue: string, dayValue: string, yearValue: string, filingYear: number) => {
  const normalizedMonth = monthValue.toLowerCase().replace(/[^a-z0-9]/g, '');
  const month = /^\d+$/.test(normalizedMonth)
    ? Number(normalizedMonth)
    : monthNumbers[normalizedMonth.slice(0, 3)];
  const day = Number(dayValue.replace(/[oO]/g, '0').replace(/\D/g, ''));
  const rawYear = Number(yearValue.replace(/\D/g, ''));
  if (!month || !day || !rawYear) return null;
  return buildIsoDate(resolveShortYear(rawYear, month, day, filingYear), month, day);
};

const splitDisplayName = (value: string) => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  const suffixPattern = /^(JR\.?|SR\.?|II|III|IV)$/i;

  if (cleaned.includes(',')) {
    const [lastPart, ...remainingParts] = cleaned.split(',');
    const tokens = remainingParts.join(' ').trim().split(/\s+/).filter(Boolean);
    let suffix = '';
    if (suffixPattern.test(tokens.at(-1) ?? '')) suffix = tokens.pop() ?? '';
    let middleName = '';
    if (/^[A-ZÑ]\.?$/i.test(tokens.at(-1) ?? '')) middleName = tokens.pop() ?? '';
    return {
      firstName: tokens.join(' '),
      middleName,
      lastName: lastPart.trim(),
      suffix,
    };
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let suffix = '';
  if (suffixPattern.test(tokens.at(-1) ?? '')) suffix = tokens.pop() ?? '';
  const lastName = tokens.pop() ?? '';
  let middleName = '';
  if (/^[A-ZÑ]\.?$/i.test(tokens.at(-1) ?? '')) middleName = tokens.pop() ?? '';
  return { firstName: tokens.join(' '), middleName, lastName, suffix };
};

const normalizePersonName = (parts: { firstName: string; middleName: string; lastName: string; suffix: string }) => (
  [parts.firstName, parts.middleName, parts.lastName, parts.suffix].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
);

const booleanValue = (value: string): boolean | null => {
  const normalized = compactValue(value);
  if (['Y', 'YES', 'TRUE', '1'].includes(normalized) || normalized.startsWith('YES')) return true;
  if (['N', 'NO', 'FALSE', '0', 'NA', 'N/A'].includes(normalized) || normalized.startsWith('NO')) return false;
  return null;
};

const optionByCode = (ctx: ValidationContext, groupCode: string, code: string) => ctx.referenceOptions.find((option) => (
  (option.group_code ?? option.category_code) === groupCode && option.code === code
));

const directOption = (ctx: ValidationContext, groupCode: string, value: string) => {
  const normalized = normalizeValue(value);
  return ctx.referenceOptions.find((option) => (
    (option.group_code ?? option.category_code) === groupCode
    && [normalizeValue(option.code), normalizeValue(option.label)].includes(normalized)
  ));
};

const sexCode = (value: string) => {
  const compact = compactValue(value);
  if (compact === 'M' || compact.startsWith('MALE') || compact === 'MAL') return 'MALE';
  if (compact === 'F' || compact.startsWith('FEMALE') || compact === 'FFE' || compact === 'FEMALE') return 'FEMALE';
  return null;
};

const civilStatusCode = (value: string) => {
  const compact = compactValue(value);
  if (compact === 'S' || compact.includes('SING') || compact.includes('SNG')) return 'SINGLE';
  if (compact === 'M' || compact.includes('MARR')) return 'MARRIED';
  if (compact === 'SP' || compact.includes('SEPAR')) return 'SEPARATED';
  if (compact.includes('WIDOW')) return 'WIDOWED';
  if (compact.includes('DIVOR')) return 'DIVORCED';
  if (compact.includes('LIVEIN') || compact.includes('COHAB')) return 'SINGLE';
  return null;
};

const classificationCode = (value: string) => {
  const normalized = normalizeValue(value);
  const compact = normalized.replace(/\s+/g, '');
  if (compact.includes('PWD') || normalized.includes('PERSON WITH DISABILITY')) return 'YOUTH_WITH_DISABILITY';
  if (compact.includes('OSY') || normalized.includes('OUT OF SCHOOL') || normalized === 'NEET') return 'OUT_OF_SCHOOL';
  if (compact === 'WY' || normalized.includes('WORKING') || normalized.includes('YOUTH WHO WORK')) return 'YOUTH_WHO_WORK';
  if (compact.includes('ISY') || normalized.includes('IN SCHOOL') || normalized === 'SCHOOL YOUTH') return 'IN_SCHOOL';
  return null;
};

const educationCode = (value: string) => {
  const normalized = normalizeValue(value);
  const compact = normalized.replace(/\s+/g, '');
  if (!compact || ['NA', 'NONE'].includes(compact)) return 'NONE';
  if (normalized.includes('DOCTOR') || normalized.includes('MASTER') || normalized.includes('POST GRAD')) return 'POST_GRAD';
  if (normalized.includes('BACHELOR') || normalized.includes('DEGREE')) return 'COLLEGE_GRAD';
  if (compact.includes('COLLEGE') || compact.includes('COLLAGE') || compact.includes('COLLGE')) {
    return compact.includes('GRAD') && !compact.includes('UNDER') ? 'COLLEGE_GRAD' : 'COLLEGE';
  }
  if (normalized.includes('SENIOR HIGH')) return normalized.includes('GRAD') ? 'SENIOR_HIGH_GRAD' : 'SENIOR_HIGH';
  if (normalized.includes('JUNIOR HIGH') || normalized.includes('HIGH SCHOOL') || normalized.includes('HIGHSCHOOL') || normalized === 'ALS') {
    return normalized.includes('GRAD') ? 'HIGH_SCHOOL_GRAD' : 'HIGH_SCHOOL';
  }
  if (compact.includes('ELEMENT')) return compact.includes('GRAD') ? 'ELEMENTARY_GRAD' : 'ELEMENTARY';
  return null;
};

const workStatusCode = (value: string) => {
  const normalized = normalizeValue(value);
  const compact = normalized.replace(/\s+/g, '');
  if (compact.includes('STUD')) return 'STUDENT';
  if (compact.includes('SELF') && compact.includes('EMPLOY')) return 'SELF_EMPLOYED';
  if (compact.includes('UNEMPLOY') || normalized.includes('LOOKING FOR')) return 'UNEMPLOYED';
  if (['NA', 'NONE'].includes(compact) || normalized.includes('NOT WORKING') || normalized.includes('HOUSE WIFE')) return 'NON_WORKING';
  if (compact.includes('EMPLOY') || compact.length > 2) return 'EMPLOYED';
  return null;
};

const ageGroupSourceCode = (value: string) => {
  const normalized = normalizeValue(value);
  if (normalized.includes('15 17') || normalized.includes('CHILD')) return 'CHILD_YOUTH';
  if (normalized.includes('18 24') || normalized.includes('CORE')) return 'CORE_YOUTH';
  if (normalized.includes('25 30') || normalized.includes('ADULT')) return 'YOUNG_ADULT';
  return null;
};

const setReferenceValue = (
  normalizedData: Record<string, unknown>,
  errors: string[],
  warnings: string[],
  ctx: ValidationContext,
  input: {
    rawValue: string;
    groupCode: string;
    fieldName: string;
    label: string;
    required?: boolean;
    resolver: (value: string) => string | null;
  },
) => {
  if (!input.rawValue) {
    if (input.required) errors.push(`${input.label} is required.`);
    return;
  }
  const direct = directOption(ctx, input.groupCode, input.rawValue);
  const resolvedCode = direct?.code ?? input.resolver(input.rawValue);
  const option = direct ?? (resolvedCode ? optionByCode(ctx, input.groupCode, resolvedCode) : undefined);
  if (!option) {
    errors.push(`${input.label} "${input.rawValue}" is not recognized.`);
    return;
  }
  normalizedData[input.fieldName] = option.id;
  if (!direct && normalizeValue(input.rawValue) !== normalizeValue(option.label)) {
    warnings.push(`Normalized ${input.label.toLowerCase()} "${input.rawValue}" to "${option.label}".`);
  }
};

const contactNumber = (value: string) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith('63')) return `+${digits}`;
  return digits || value.trim();
};

const checkedBooleanValue = (value: string, label: string, errors: string[]) => {
  const parsed = booleanValue(value);
  if (value && parsed === null) errors.push(`${label} must be Yes or No.`);
  return parsed;
};

export const rowValidator = {
  validate: (
    rawRow: Record<string, string>,
    ctx: ValidationContext,
  ): { isValid: boolean; normalizedData: Record<string, unknown>; validationErrors: string[]; validationWarnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedData: Record<string, unknown> = {};
    const lookup = valueLookup(rawRow);
    const exportedCustomValues = validateRegistryMetadata(lookup, ctx, errors);

    const fullName = getValue(lookup, ['NAME', 'FULL NAME', 'COMPLETE NAME']);
    const splitName = fullName ? splitDisplayName(fullName) : null;
    const nameParts = {
      firstName: getValue(lookup, ['FIRST NAME', 'FIRST_NAME', 'FIRSTNAME']) || splitName?.firstName || '',
      middleName: getValue(lookup, ['MIDDLE NAME', 'MIDDLE_NAME', 'MIDDLENAME']) || splitName?.middleName || '',
      lastName: getValue(lookup, ['LAST NAME', 'LAST_NAME', 'LASTNAME', 'SURNAME']) || splitName?.lastName || '',
      suffix: getValue(lookup, ['EXT NAME', 'EXT_NAME', 'EXTENSION NAME', 'SUFFIX']) || splitName?.suffix || '',
    };
    if (!nameParts.firstName || !nameParts.lastName) errors.push('First name and last name are required.');
    normalizedData.first_name = nameParts.firstName;
    normalizedData.middle_name = nameParts.middleName || null;
    normalizedData.last_name = nameParts.lastName;
    normalizedData.suffix = nameParts.suffix || null;
    normalizedData.display_name = normalizePersonName(nameParts);

    const sourceBarangay = getValue(lookup, ['BARANGAY', 'BARANGAY NAME']);
    if (sourceBarangay && normalizeValue(sourceBarangay) !== normalizeValue(ctx.barangayName)) {
      errors.push(`Barangay "${sourceBarangay}" does not match the selected barangay "${ctx.barangayName}".`);
    }

    const combinedBirthday = getValue(lookup, ['BIRTHDAY', 'BIRTHDAY MM/DD/YY', 'BIRTH DATE', 'BIRTHDATE', 'DOB']);
    const month = getValue(lookup, ['MONTH', 'BIRTH MONTH']);
    const day = getValue(lookup, ['DAY', 'BIRTH DAY']);
    const year = getValue(lookup, ['YEAR', 'BIRTH YEAR']);
    const hasBirthDateInput = Boolean(combinedBirthday || month || day || year);
    if (/[oO]/.test(day)) {
      warnings.push(`Normalized birth day "${day}" to "${day.replace(/[oO]/g, '0')}".`);
    }
    const birthDate = combinedBirthday
      ? parseCombinedDate(combinedBirthday, ctx.filingYear)
      : month && day && year
        ? parseSeparateDate(month, day, year, ctx.filingYear)
        : null;

    if (!hasBirthDateInput) {
      normalizedData.birth_date = null;
      normalizedData.age_at_submission = null;
      normalizedData.youth_age_group_id = null;
      warnings.push('Birth date is missing; age and youth age group will remain blank.');
    } else if (!birthDate) {
      errors.push('Birth date is invalid. Use MM/DD/YYYY or YYYY-MM-DD.');
    } else {
      const age = computeAgeForFilingYear(birthDate, ctx.filingYear);
      if (!isEligibleYouthAge(age)) {
        errors.push(`Birth date must make the person 15 to 30 years old on December 31, ${ctx.filingYear}.`);
      } else {
        normalizedData.birth_date = birthDate;
        normalizedData.age_at_submission = age;
        const groupCode = computeAgeGroup(age);
        const ageGroup = groupCode ? optionByCode(ctx, 'YOUTH_AGE_GROUP', groupCode) : undefined;
        if (!ageGroup) errors.push('Youth age group reference data is not configured.');
        else normalizedData.youth_age_group_id = ageGroup.id;

        const suppliedAge = Number(getValue(lookup, ['AGE']));
        if (Number.isFinite(suppliedAge) && suppliedAge > 0 && suppliedAge !== age) {
          warnings.push(`Provided age (${suppliedAge}) was replaced by filing-year age (${age}).`);
        }
      }
    }

    const sex = getValue(lookup, ['SEX ASSIGNED AT BIRTH', 'SEX', 'GENDER']);
    setReferenceValue(normalizedData, errors, warnings, ctx, {
      rawValue: sex,
      groupCode: 'SEX_ASSIGNED_AT_BIRTH',
      fieldName: 'sex_assigned_at_birth_id',
      label: 'Sex assigned at birth',
      required: true,
      resolver: sexCode,
    });
    const civilStatus = getValue(lookup, ['CIVIL STATUS']);
    setReferenceValue(normalizedData, errors, warnings, ctx, {
      rawValue: civilStatus,
      groupCode: 'CIVIL_STATUS',
      fieldName: 'civil_status_id',
      label: 'Civil status',
      required: true,
      resolver: civilStatusCode,
    });

    const outOfSchool = getValue(lookup, ['OUT OF SCHOOL YOUTH?', 'OUT-OF-SCHOOL YOUTH?']);
    const classification = getValue(lookup, ['YOUTH CLASSIFICATION'])
      || (booleanValue(outOfSchool) === true ? 'OUT_OF_SCHOOL' : booleanValue(outOfSchool) === false ? 'IN_SCHOOL' : '');
    setReferenceValue(normalizedData, errors, warnings, ctx, {
      rawValue: classification,
      groupCode: 'YOUTH_CLASSIFICATION',
      fieldName: 'youth_classification_id',
      label: 'Youth classification',
      required: true,
      resolver: classificationCode,
    });

    const education = getValue(lookup, ['HIGHEST EDUCATIONAL ATTAINMENT', 'EDUCATIONAL ATTAINMENT', 'EDUCATION']);
    setReferenceValue(normalizedData, errors, warnings, ctx, {
      rawValue: education,
      groupCode: 'EDUCATIONAL_ATTAINMENT',
      fieldName: 'educational_attainment_id',
      label: 'Educational attainment',
      required: true,
      resolver: educationCode,
    });
    const workStatus = getValue(lookup, ['WORK STATUS', 'EMPLOYMENT STATUS']);
    setReferenceValue(normalizedData, errors, warnings, ctx, {
      rawValue: workStatus,
      groupCode: 'WORK_STATUS',
      fieldName: 'work_status_id',
      label: 'Work status',
      required: true,
      resolver: workStatusCode,
    });

    const email = getValue(lookup, ['EMAIL', 'EMAIL ADDRESS', 'E-MAIL ADDRESS']);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      normalizedData.email = null;
      warnings.push(`Email address "${email}" was skipped because it is not valid.`);
    } else normalizedData.email = email || null;
    normalizedData.contact_number = contactNumber(getValue(lookup, ['CONTACT NUMBER', 'CONTACT NO.', 'CONTACT NO', 'CONTACT', 'MOBILE'])) || null;
    normalizedData.purok = getValue(lookup, ['PUROK', 'ZONE']) || null;

    const generalVoter = checkedBooleanValue(
      getValue(lookup, ['REGISTERED VOTER?', 'REGISTERED VOTER? Y/N']),
      'Registered voter',
      errors,
    );
    const skVoter = checkedBooleanValue(getValue(lookup, ['REGISTERED SK VOTER?']), 'Registered SK voter', errors);
    const nationalVoter = checkedBooleanValue(
      getValue(lookup, ['REGISTERED NATIONAL VOTER?']),
      'Registered national voter',
      errors,
    );
    const registeredVoter = generalVoter ?? skVoter;
    const votedLastElection = checkedBooleanValue(
      getValue(lookup, ['VOTED LAST ELECTION', 'VOTED LAST ELECTION? Y/N', 'VOTED LAST ELECTION?']),
      'Voted last election',
      errors,
    );
    normalizedData.is_registered_voter = generalVoter ?? skVoter;
    normalizedData.is_registered_sk_voter = skVoter ?? generalVoter;
    normalizedData.is_registered_national_voter = nationalVoter ?? generalVoter;
    normalizedData.voted_last_election = votedLastElection;
    if (registeredVoter === true && votedLastElection === null) {
      errors.push('Voted last election is required when registered voter is Yes.');
    }

    const assemblyRaw = getValue(lookup, ['ATTENDED KK ASSEMBLY?', 'ATTENDED KK ASSEMBLY', 'ATTENDED KK ASSEMBLY - IF YES, HOW MANY TIMES?']);
    const attendedAssembly = checkedBooleanValue(assemblyRaw, 'Attended KK assembly', errors);
    const countRaw = getValue(lookup, ['IF YES, HOW MANY TIMES?', 'IF YES, HOW MANY TIMES', 'ASSEMBLY COUNT', 'TIMES ATTENDED']);
    const countNumbers = `${assemblyRaw} ${countRaw}`.match(/\d+/g)?.map(Number) ?? [];
    const assemblyCount = attendedAssembly === true && countNumbers.length > 0 ? Math.max(...countNumbers) : 0;
    if (attendedAssembly === true && assemblyCount < 1) {
      errors.push('KK assembly count is required when attendance is Yes.');
    }
    if (attendedAssembly !== true && countNumbers.some((count) => count > 0)) {
      warnings.push('KK assembly count was ignored because attendance is not Yes.');
    }
    normalizedData.attended_kk_assembly = attendedAssembly;
    normalizedData.kk_assembly_count = assemblyCount;

    const suppliedAgeGroup = getValue(lookup, ['YOUTH AGE GROUP', 'AGE GROUP']);
    if (!birthDate && suppliedAgeGroup) {
      const code = ageGroupSourceCode(suppliedAgeGroup);
      const option = code ? optionByCode(ctx, 'YOUTH_AGE_GROUP', code) : undefined;
      if (option) normalizedData.youth_age_group_id = option.id;
      else warnings.push(`Youth age group "${suppliedAgeGroup}" could not be normalized without a valid birth date.`);
    }

    const homeAddress = getValue(lookup, ['HOME ADDRESS', 'ADDRESS']);
    const occupation = getValue(lookup, ['OCCUPATION', 'JOB']);
    normalizedData.custom_values = {
      ...exportedCustomValues,
      ...(homeAddress ? { home_address: homeAddress } : {}),
      ...(occupation ? { occupation } : {}),
      ...(suppliedAgeGroup ? { source_age_group: suppliedAgeGroup } : {}),
      ...(workStatus ? { source_work_status: workStatus } : {}),
      ...(outOfSchool ? { out_of_school_youth: booleanValue(outOfSchool) } : {}),
    };

    return {
      isValid: errors.length === 0,
      normalizedData,
      validationErrors: errors,
      validationWarnings: warnings,
    };
  },
};
