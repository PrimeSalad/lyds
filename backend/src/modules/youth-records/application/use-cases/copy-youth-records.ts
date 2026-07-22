import { supabaseAdmin } from '../../../../config/supabase';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';

export const copyYouthRecords = async (
  sourceCategoryId: string,
  targetCategoryId: string,
  authContext: any,
): Promise<{ copied: number }> => {
  if (authContext.role !== 'ADMIN') {
    throw YouthRecordErrors.FORBIDDEN;
  }

  const { data: sourceRecords, error: fetchError } = await supabaseAdmin
    .from('youth_profiles')
    .select('*')
    .eq('category_id', sourceCategoryId)
    .is('deleted_at', null);

  if (fetchError) throw new Error(fetchError.message);
  if (!sourceRecords || sourceRecords.length === 0) {
    return { copied: 0 };
  }

  const copies = sourceRecords.map((record: any) => {
    const { id, created_at, updated_at, version, submitted_by, submitted_at, approved_by, approved_at, ...rest } = record;
    return {
      ...rest,
      category_id: targetCategoryId,
      status: 'DRAFT',
      created_by: authContext.profileId,
      updated_by: authContext.profileId,
      submitted_by: null,
      submitted_at: null,
      approved_by: null,
      approved_at: null,
      version: 1,
    };
  });

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('youth_profiles')
    .insert(copies)
    .select('id');

  if (insertError) throw new Error(insertError.message);

  return { copied: inserted?.length ?? 0 };
};
