export const MIN_YOUTH_AGE = 15;
export const MAX_YOUTH_AGE = 30;

export const computeAge = (birthDate: string, referenceDate = new Date()): number => {
  const birth = new Date(birthDate);
  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - birth.getUTCMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  
  return age;
};

export const filingYearCutoff = (filingYear: number) => `${filingYear}-12-31`;

export const computeAgeForFilingYear = (birthDate: string, filingYear: number): number => (
  computeAge(birthDate, new Date(`${filingYearCutoff(filingYear)}T23:59:59.999Z`))
);

export const isEligibleYouthAge = (age: number): boolean => (
  Number.isInteger(age) && age >= MIN_YOUTH_AGE && age <= MAX_YOUTH_AGE
);

export const isEligibleForFilingYear = (birthDate: string, filingYear: number): boolean => (
  isEligibleYouthAge(computeAgeForFilingYear(birthDate, filingYear))
);

export const computeAgeGroup = (age: number): string | null => {
  if (age >= 15 && age <= 17) return 'CHILD_YOUTH';
  if (age >= 18 && age <= 24) return 'CORE_YOUTH';
  if (age >= 25 && age <= 30) return 'YOUNG_ADULT';
  return null;
};
