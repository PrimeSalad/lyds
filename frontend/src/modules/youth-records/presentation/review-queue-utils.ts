type NamedBarangay = {
  barangayName: string;
};

export const filterReviewBarangays = <T extends NamedBarangay>(barangays: T[], query: string): T[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('en-PH');
  if (!normalizedQuery) return barangays;
  return barangays.filter((barangay) => (
    barangay.barangayName.toLocaleLowerCase('en-PH').includes(normalizedQuery)
  ));
};

export const formatReviewSubmittedAt = (value?: string | null): string => {
  if (!value) return 'Submission date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Submission date unavailable';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export const getReviewPageRange = (page: number, pageSize: number, totalItems: number) => {
  if (totalItems === 0) return { start: 0, end: 0 };
  const start = ((page - 1) * pageSize) + 1;
  return { start, end: Math.min(start + pageSize - 1, totalItems) };
};
