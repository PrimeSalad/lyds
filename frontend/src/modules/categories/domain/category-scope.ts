import type { CategoryRecordType } from '../../../generated/api/api-types';

type RegistryCategory = {
  id: string;
  name: string;
  record_type: CategoryRecordType;
  filing_year: number;
  record_count?: number | null;
};

export const categoriesForRegistry = <CategoryType extends RegistryCategory>(
  categories: CategoryType[],
  recordType: CategoryRecordType,
) => categories.filter((category) => category.record_type === recordType);

export const availableCategoryYears = <CategoryType extends RegistryCategory>(categories: CategoryType[]) => (
  [...new Set(categories.map((category) => category.filing_year))]
    .sort((left, right) => right - left)
);

export const categoriesForYear = <CategoryType extends RegistryCategory>(
  categories: CategoryType[],
  filingYear: number | null,
) => filingYear === null
  ? []
  : categories
    .filter((category) => category.filing_year === filingYear)
    .sort((left, right) => left.name.localeCompare(right.name));

export const preferredCategoryYear = <CategoryType extends RegistryCategory>(categories: CategoryType[]) => (
  [...categories]
    .sort((left, right) => (
      Number((right.record_count ?? 0) > 0) - Number((left.record_count ?? 0) > 0)
      || right.filing_year - left.filing_year
      || left.name.localeCompare(right.name)
    ))[0]?.filing_year ?? null
);
