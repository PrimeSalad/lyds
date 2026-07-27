export const computeYouthRecordAge = (birthDate: string, filingYear?: number): number => {
  if (!birthDate) return 0;
  const birth = new Date(`${birthDate}T00:00:00`);
  const referenceDate = filingYear ? new Date(filingYear, 11, 31) : new Date();
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) age--;
  return age;
};
