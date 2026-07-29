import { computeChildAgeForFilingYear } from '../domain/child-laborer-age';

const relationName = (relation: unknown): string => {
  if (Array.isArray(relation)) return String(relation[0]?.name ?? '');
  if (relation && typeof relation === 'object' && 'name' in relation) {
    return String((relation as { name?: unknown }).name ?? '');
  }
  return '';
};

export const childLaborerName = (record: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
}) => `${record.last_name}, ${record.first_name}${record.middle_name ? ` ${record.middle_name}` : ''}`;

export const toChildLaborerPresentation = (record: any, rowNumber?: number) => ({
  ...record,
  barangay_name: relationName(record.barangay),
  child_name: childLaborerName(record),
  age: computeChildAgeForFilingYear(record.birth_date, record.filing_year),
  ...(rowNumber ? { row_number: rowNumber } : {}),
});
