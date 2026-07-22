-- Core KK fields are stored directly on youth_profiles and must not be repeated
-- as dynamic category fields.
UPDATE public.category_fields field
SET is_active = FALSE, updated_at = NOW()
FROM public.categories category
WHERE field.category_id = category.id
  AND category.code = 'KK_PROFILE'
  AND field.field_key IN (
    'display_name', 'first_name', 'middle_name', 'last_name', 'suffix', 'ext_name',
    'birth_date', 'age_at_submission', 'sex_assigned_at_birth_id', 'sex_id',
    'civil_status_id', 'youth_classification_id', 'youth_age_group_id',
    'educational_attainment_id', 'work_status_id', 'email', 'contact_number',
    'purok', 'is_registered_voter', 'is_registered_sk_voter',
    'is_registered_national_voter', 'voted_last_election',
    'attended_kk_assembly', 'kk_assembly_count'
  );

-- Archive a known unreferenced test category left by early manual testing.
UPDATE public.categories category
SET status = 'ARCHIVED', deleted_at = NOW(), updated_at = NOW()
WHERE category.code = 'ANMSA'
  AND NOT EXISTS (
    SELECT 1 FROM public.youth_profiles profile WHERE profile.category_id = category.id
  );
