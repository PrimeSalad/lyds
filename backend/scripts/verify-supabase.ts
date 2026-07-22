import { supabaseAdmin } from '../src/config/supabase';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const officialCodePattern = /^174001\d{3}$/;

export const verifySupabase = async () => {
  const [schemaResult, barangayResult, categoryResult, categoryFieldResult, referenceResult, announcementResult] = await Promise.all([
    supabaseAdmin.from('youth_profiles').select(`
      id, status, youth_profile_status, sex_assigned_at_birth_id, sex_id,
      custom_values, created_at, updated_at, deleted_at
    `).limit(1),
    supabaseAdmin.from('barangays').select('code, municipality, province, is_active, deleted_at'),
    supabaseAdmin.from('categories').select('id, code').is('deleted_at', null),
    supabaseAdmin.from('category_fields').select('category_id, field_key').eq('is_active', true),
    supabaseAdmin.from('reference_options').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('announcements').select('id', { count: 'exact', head: true }),
  ]);

  const errors = [schemaResult.error, barangayResult.error, categoryResult.error, categoryFieldResult.error, referenceResult.error, announcementResult.error]
    .filter(Boolean);
  if (errors.length > 0) {
    throw new Error(`Supabase schema check failed: ${errors.map((error) => error?.message).join('; ')}`);
  }

  const activeBarangays = (barangayResult.data ?? []).filter((barangay) => barangay.is_active && !barangay.deleted_at);
  const officialCodes = new Set(activeBarangays.filter((barangay) => officialCodePattern.test(barangay.code)).map((barangay) => barangay.code));
  const outsideBoac = activeBarangays.filter((barangay) => (
    barangay.municipality !== 'Boac' || barangay.province !== 'Marinduque'
  ));

  if (officialCodes.size !== 61) {
    throw new Error(`Expected 61 active official Boac barangays, found ${officialCodes.size}.`);
  }
  if (outsideBoac.length > 0) {
    throw new Error(`Found ${outsideBoac.length} active barangay record(s) outside Boac, Marinduque.`);
  }

  const coreKeys = new Set(['first_name', 'middle_name', 'last_name', 'suffix', 'birth_date', 'contact_number', 'email', 'purok']);
  const kkCategory = (categoryResult.data ?? []).find((category) => category.code === 'KK_PROFILE');
  const redundantCoreFields = (categoryFieldResult.data ?? []).filter((field) => (
    field.category_id === kkCategory?.id && coreKeys.has(field.field_key)
  ));
  if (!kkCategory) throw new Error('The KK_PROFILE category is missing.');
  if (redundantCoreFields.length > 0) {
    throw new Error(`Found ${redundantCoreFields.length} redundant active KK core category field(s).`);
  }

  const result = {
    schema: 'ready',
    officialBoacBarangays: officialCodes.size,
    activeBarangays: activeBarangays.length,
    categories: categoryResult.data?.length ?? 0,
    referenceOptions: referenceResult.count ?? 0,
    announcements: announcementResult.count ?? 0,
  };
  console.log(`Supabase verified: ${JSON.stringify(result)}`);
  return result;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  verifySupabase().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
