export interface ValidationContext {
  referenceOptions: { category_code: string; label: string; id: string }[];
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

const parseDateParts = (monthValue: string, dayValue: string, yearValue: string): Date | undefined => {
  const normalizedMonth = monthValue.toLowerCase().replace(/[^a-z0-9]/g, '');
  const month = /^\d+$/.test(normalizedMonth)
    ? Number(normalizedMonth)
    : monthNumbers[normalizedMonth.slice(0, 3)];
  const day = Number(dayValue.replace(/[oO]/g, '0').replace(/\D/g, ''));
  const year = Number(yearValue.replace(/\D/g, ''));

  if (!month || !day || !year) return undefined;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date;
};

export const rowValidator = {
  validate(rawRow: Record<string, string>, ctx: ValidationContext): { isValid: boolean; normalizedData: any; validationErrors: string[]; validationWarnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized: any = {};

    // Helper to get value ignoring case of header
    const getValue = (keys: string[]) => {
      const foundKey = Object.keys(rawRow).find(k => keys.includes(k.toUpperCase()));
      return foundKey ? rawRow[foundKey] : undefined;
    };

    // 1. Name required
    const firstName = getValue(['FIRST NAME', 'FIRST_NAME', 'FIRSTNAME']);
    const lastName = getValue(['LAST NAME', 'LAST_NAME', 'LASTNAME']);
    const middleName = getValue(['MIDDLE NAME', 'MIDDLE_NAME', 'MIDDLENAME']);
    const extName = getValue(['EXT NAME', 'EXT_NAME', 'EXTENSION NAME']);

    if (!firstName || !lastName) {
      errors.push('First Name and Last Name are required.');
    }
    normalized.first_name = firstName;
    normalized.last_name = lastName;
    normalized.middle_name = middleName;
    normalized.ext_name = extName;

    // Build display name
    const parts = [firstName, middleName, lastName, extName].filter(Boolean);
    normalized.display_name = parts.join(' ');

    // 2. Birth date
    let birthDate: Date | undefined;
    const birthdayRaw = getValue(['BIRTHDAY', 'BIRTH DATE', 'BIRTHDATE', 'DOB']);
    if (birthdayRaw) {
      birthDate = new Date(birthdayRaw);
    } else {
      const month = getValue(['MONTH']);
      const day = getValue(['DAY']);
      const year = getValue(['YEAR']);
      if (month && day && year) {
        birthDate = parseDateParts(month, day, year);
        if (/[oO]/.test(day) && birthDate) {
          warnings.push(`Normalized birth day "${day}" to "${day.replace(/[oO]/g, '0')}".`);
        }
      }
    }

    const hasBirthDateInput = Boolean(
      birthdayRaw ||
      getValue(['MONTH']) ||
      getValue(['DAY']) ||
      getValue(['YEAR']),
    );

    if (!hasBirthDateInput) {
      warnings.push('Birth Date is missing; age and youth age group will remain blank.');
    } else if (!birthDate || isNaN(birthDate.getTime())) {
      errors.push('Valid Birth Date is required.');
    } else if (birthDate > new Date()) {
      errors.push('Birth Date cannot be in the future.');
    } else {
      normalized.birth_date = birthDate.toISOString().split('T')[0];
      
      // Age computation
      const today = new Date();
      let computedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        computedAge--;
      }

      const ageRaw = getValue(['AGE']);
      if (ageRaw) {
        const providedAge = parseInt(ageRaw, 10);
        if (!isNaN(providedAge) && providedAge !== computedAge) {
          warnings.push(`Provided age (${providedAge}) does not match computed age (${computedAge}).`);
        }
      }
    }

    // 3. Email and Contact
    const email = getValue(['EMAIL', 'EMAIL ADDRESS']);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push('Invalid email format.');
    } else if (email) {
      normalized.email = email;
    }

    const contact = getValue(['CONTACT NUMBER', 'CONTACT', 'MOBILE']);
    if (contact) {
      normalized.contact_number = String(contact);
    }

    // 4. Reference values
    const checkReference = (headerKeys: string[], categoryCode: string, fieldName: string) => {
      const val = getValue(headerKeys);
      if (val) {
        const option = ctx.referenceOptions.find(o => o.category_code === categoryCode && o.label.toLowerCase() === val.toLowerCase());
        if (option) {
          normalized[fieldName] = option.id;
        } else {
          errors.push(`Invalid value for ${categoryCode}: ${val}`);
        }
      }
    };

    checkReference(['SEX', 'GENDER'], 'SEX', 'sex_id');
    checkReference(['CIVIL STATUS'], 'CIVIL_STATUS', 'civil_status_id');
    checkReference(['YOUTH CLASSIFICATION'], 'YOUTH_CLASSIFICATION', 'youth_classification_id');
    checkReference(['AGE GROUP'], 'YOUTH_AGE_GROUP', 'youth_age_group_id');
    checkReference(['WORK STATUS'], 'WORK_STATUS', 'work_status_id');
    checkReference(['EDUCATIONAL ATTAINMENT'], 'EDUCATIONAL_ATTAINMENT', 'educational_attainment_id');

    // 5. Assembly rules
    const attended = getValue(['ATTENDED KK ASSEMBLY?', 'ATTENDED_KK_ASSEMBLY', 'ATTENDED KK']);
    const attendedCount = getValue(['IF YES, HOW MANY TIMES?', 'ASSEMBLY_COUNT', 'TIMES ATTENDED']);
    
    if (attended && ['yes', 'true', '1'].includes(attended.toLowerCase())) {
      normalized.attended_kk_assembly = true;
      const count = parseInt(attendedCount || '0', 10);
      if (isNaN(count) || count < 1) {
        errors.push('If attended KK assembly, count must be >= 1.');
      } else {
        normalized.kk_assembly_count = count;
      }
    } else if (attended && ['no', 'false', '0'].includes(attended.toLowerCase())) {
      normalized.attended_kk_assembly = false;
      const count = parseInt(attendedCount || '0', 10);
      if (!isNaN(count) && count > 0) {
        errors.push('If not attended KK assembly, count must be 0 or empty.');
      }
      normalized.kk_assembly_count = 0;
    }

    // Additional fields like Purok, voter status
    const purok = getValue(['PUROK']);
    if (purok) normalized.purok = purok;
    
    const isVoter = getValue(['REGISTERED SK VOTER?']);
    if (isVoter) normalized.is_registered_sk_voter = ['yes', 'true', '1'].includes(isVoter.toLowerCase());
    
    const isNationalVoter = getValue(['REGISTERED NATIONAL VOTER?']);
    if (isNationalVoter) normalized.is_registered_national_voter = ['yes', 'true', '1'].includes(isNationalVoter.toLowerCase());

    return {
      isValid: errors.length === 0,
      normalizedData: normalized,
      validationErrors: errors,
      validationWarnings: warnings
    };
  }
};
