import { supabaseAdmin } from '../../../../config/supabase';
import type { DuplicateCandidateRow, DuplicateMatch } from './duplicate-checker';
import { normalizeYouthName } from './duplicate-checker';

type ExistingChildLaborer = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
};

const childKey = (firstName: unknown, lastName: unknown, birthDate: unknown) => [
  normalizeYouthName(String(firstName ?? '')),
  normalizeYouthName(String(lastName ?? '')),
  String(birthDate ?? '').slice(0, 10),
].join('|');

export const findDuplicateChildLaborerRows = (
  existingRecords: ExistingChildLaborer[],
  rows: DuplicateCandidateRow[],
): Map<number, DuplicateMatch> => {
  const duplicates = new Map<number, DuplicateMatch>();
  const existingKeys = new Map(existingRecords.map((record) => [
    childKey(record.first_name, record.last_name, record.birth_date),
    record.id,
  ]));
  const sourceKeys = new Map<string, number>();

  rows.forEach((row, index) => {
    if (!row.is_valid) return;
    const normalizedData = row.normalized_data ?? {};
    const key = childKey(
      normalizedData.first_name,
      normalizedData.last_name,
      normalizedData.birth_date,
    );
    if (key === '||') return;

    const existingId = existingKeys.get(key);
    if (existingId) {
      duplicates.set(index, {
        matchId: existingId,
        message: 'A child laborer with the same name and birth date already exists in this barangay and filing year.',
      });
      return;
    }

    if (sourceKeys.has(key)) {
      duplicates.set(index, {
        message: `Duplicate child laborer repeats source row ${sourceKeys.get(key)} in this upload.`,
      });
      return;
    }

    sourceKeys.set(key, row.row_number ?? index + 1);
  });

  return duplicates;
};

const listExistingChildLaborers = async (
  barangayId: string,
  filingYear: number,
): Promise<ExistingChildLaborer[]> => {
  const pageSize = 1000;
  const records: ExistingChildLaborer[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('child_laborer_records')
      .select('id, first_name, last_name, birth_date')
      .eq('barangay_id', barangayId)
      .eq('filing_year', filingYear)
      .neq('record_status', 'ARCHIVED')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    records.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return records;
};

export const childLaborerDuplicateChecker = {
  checkDuplicates: async (
    barangayId: string,
    filingYear: number,
    rows: DuplicateCandidateRow[],
  ) => findDuplicateChildLaborerRows(
    await listExistingChildLaborers(barangayId, filingYear),
    rows,
  ),
};
