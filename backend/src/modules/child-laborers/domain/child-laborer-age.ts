const dateParts = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

export const computeChildAgeForFilingYear = (birthDate: string, filingYear: number): number => {
  const parts = dateParts(birthDate);
  if (!parts) return 0;

  // Annual consolidations use the person's age on the final day of the filing year.
  return Math.max(0, filingYear - parts.year);
};
