import { supabaseAdmin } from '../../../../config/supabase';

export const normalizeYouthName = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

export type DuplicateCandidateRow = {
  is_valid: boolean;
  normalized_data: Record<string, unknown> | null;
  row_number?: number;
};

export type ExistingYouthName = {
  id: string;
  display_name: string | null;
};

export type DuplicateMatch = {
  matchId?: string;
  message: string;
};

export const findDuplicateYouthRows = (
  existingProfiles: ExistingYouthName[],
  rows: DuplicateCandidateRow[],
): Map<number, DuplicateMatch> => {
  const duplicates = new Map<number, DuplicateMatch>();
  const existingNames = new Map(
    existingProfiles
      .filter((profile) => profile.display_name)
      .map((profile) => [normalizeYouthName(profile.display_name ?? ''), profile.id]),
  );
  const sourceNames = new Map<string, number>();

  rows.forEach((row, index) => {
    if (!row.is_valid) return;
    const displayName = String(row.normalized_data?.display_name ?? '');
    const normalizedName = normalizeYouthName(displayName);
    if (!normalizedName) return;

    const existingId = existingNames.get(normalizedName);
    if (existingId) {
      duplicates.set(index, {
        matchId: existingId,
        message: 'Duplicate name already exists in this barangay and filing year.',
      });
      return;
    }

    if (sourceNames.has(normalizedName)) {
      duplicates.set(index, {
        message: `Duplicate name repeats source row ${sourceNames.get(normalizedName)} in this upload.`,
      });
      return;
    }

    sourceNames.set(normalizedName, row.row_number ?? index + 1);
  });

  return duplicates;
};

const listExistingProfiles = async (barangayId: string, categoryId: string): Promise<ExistingYouthName[]> => {
  const pageSize = 1000;
  const profiles: ExistingYouthName[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('youth_profiles')
      .select('id, display_name')
      .eq('barangay_id', barangayId)
      .eq('category_id', categoryId)
      .is('deleted_at', null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    profiles.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }

  return profiles;
};

export const duplicateChecker = {
  checkDuplicates: async (
    barangayId: string,
    categoryId: string,
    rows: DuplicateCandidateRow[],
  ): Promise<Map<number, DuplicateMatch>> => {
    const existingProfiles = await listExistingProfiles(barangayId, categoryId);
    return findDuplicateYouthRows(existingProfiles, rows);
  },
};
