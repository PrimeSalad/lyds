import type { CategoryRecordType } from '../../../categories/domain/entities/category';
import { normalizeSpreadsheetHeader } from './spreadsheet-parser';

export type ImportCategoryField = {
  field_key: string;
  label: string;
  is_required: boolean;
  is_active: boolean;
};

export type RegistryImportContext = {
  recordType: CategoryRecordType;
  filingYear: number;
  barangayName: string;
  categoryFields: ImportCategoryField[];
};

const normalizeValue = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

export const importValueLookup = (rawRow: Record<string, string>) => new Map(
  Object.entries(rawRow).map(([key, value]) => [normalizeSpreadsheetHeader(key), String(value ?? '').trim()]),
);

export const importValue = (lookup: Map<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const value = lookup.get(normalizeSpreadsheetHeader(alias));
    if (value) return value;
  }
  return '';
};

const hasValue = (value: unknown) => !(
  value === undefined
  || value === null
  || value === ''
  || (Array.isArray(value) && value.length === 0)
);

export const validateRegistryMetadata = (
  lookup: Map<string, string>,
  context: RegistryImportContext,
  errors: string[],
): Record<string, unknown> => {
  const registry = importValue(lookup, ['REGISTRY', 'RECORD TYPE', 'DATASET']);
  if (registry && normalizeValue(registry) !== context.recordType) {
    const expected = context.recordType === 'CHILD_LABORER'
      ? 'Child Laborer'
      : context.recordType === 'OUT_OF_SCHOOL_YOUTH'
        ? 'Out-of-School Youth'
        : 'Youth Profile';
    errors.push(`This CSV is for ${registry}; select a matching ${expected} category.`);
  }

  const filingYear = importValue(lookup, ['FILING YEAR', 'RECORD YEAR', 'DATASET YEAR']);
  if (filingYear) {
    const parsedYear = Number(filingYear.replace(/\D/g, ''));
    if (!Number.isInteger(parsedYear) || parsedYear !== context.filingYear) {
      errors.push(`CSV filing year "${filingYear}" does not match selected filing year ${context.filingYear}.`);
    }
  }

  const customValuesJson = importValue(lookup, ['CUSTOM VALUES JSON', 'CUSTOM FIELDS JSON']);
  let customValues: Record<string, unknown> = {};
  if (customValuesJson) {
    try {
      const parsed = JSON.parse(customValuesJson);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        errors.push('Custom Values JSON must contain a JSON object.');
      } else {
        customValues = parsed as Record<string, unknown>;
      }
    } catch {
      errors.push('Custom Values JSON is not valid JSON.');
    }
  }

  context.categoryFields.forEach((field) => {
    if (field.is_active && field.is_required && !hasValue(customValues[field.field_key])) {
      errors.push(`${field.label} is required by the selected category.`);
    }
  });

  return customValues;
};
