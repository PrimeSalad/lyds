export const computeAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export const computeAgeGroup = (age: number): string | null => {
  if (age >= 15 && age <= 17) return 'CHILD_YOUTH';
  if (age >= 18 && age <= 24) return 'CORE_YOUTH';
  if (age >= 25 && age <= 30) return 'YOUNG_ADULT';
  return null;
};
