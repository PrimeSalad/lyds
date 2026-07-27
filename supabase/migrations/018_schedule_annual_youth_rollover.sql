-- Automatically prepare the new KK Youth Profile shortly after midnight on
-- January 1 in Asia/Manila. Supabase/Postgres runs cron schedules in UTC, so
-- 16:05 UTC on December 31 is 00:05 PHT on January 1.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.rollover_annual_kk_youth_profiles(
  requested_target_year INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_manila_year INTEGER := EXTRACT(YEAR FROM timezone('Asia/Manila', now()))::INTEGER;
  target_year INTEGER := COALESCE(requested_target_year, current_manila_year);
  source_year INTEGER := target_year - 1;
  source_category public.categories%ROWTYPE;
  target_category public.categories%ROWTYPE;
  actor_id UUID;
  canonical_code TEXT := 'KK_PROFILE_' || target_year::TEXT;
  canonical_name TEXT := 'KK Youth Profile ' || target_year::TEXT;
  source_records INTEGER := 0;
  eligible_records INTEGER := 0;
  copied_records INTEGER := 0;
  excluded_underage INTEGER := 0;
  excluded_overage INTEGER := 0;
  excluded_missing_birth_date INTEGER := 0;
BEGIN
  IF target_year > current_manila_year THEN
    RAISE EXCEPTION 'Cannot prepare future filing year %. Current Asia/Manila year is %.',
      target_year,
      current_manila_year;
  END IF;

  SELECT category.*
  INTO source_category
  FROM public.categories category
  WHERE category.filing_year = source_year
    AND category.record_type = 'YOUTH_PROFILE'
    AND category.status = 'PUBLISHED'
    AND category.deleted_at IS NULL
    AND (
      category.code = 'KK_PROFILE'
      OR category.code = 'KK_PROFILE_' || source_year::TEXT
      OR category.code = source_year::TEXT
      OR category.name ILIKE '%Katipunan ng Kabataan%'
      OR category.name ILIKE 'KK Youth Profile%'
    )
  ORDER BY
    CASE
      WHEN category.code = 'KK_PROFILE_' || source_year::TEXT THEN 5
      WHEN category.code = 'KK_PROFILE' THEN 4
      WHEN category.code = source_year::TEXT THEN 3
      WHEN category.name = 'KK Youth Profile ' || source_year::TEXT THEN 2
      ELSE 1
    END DESC,
    category.created_at DESC
  LIMIT 1;

  IF source_category.id IS NULL THEN
    RAISE EXCEPTION 'No published KK Youth Profile exists for source year %.', source_year;
  END IF;

  SELECT profile.id
  INTO actor_id
  FROM public.profiles profile
  WHERE profile.role::TEXT = 'ADMIN'
    AND profile.account_status::TEXT = 'ACTIVE'
  ORDER BY profile.created_at
  LIMIT 1;

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Annual rollover requires at least one active administrator profile.';
  END IF;

  SELECT category.*
  INTO target_category
  FROM public.categories category
  WHERE category.filing_year = target_year
    AND category.record_type = 'YOUTH_PROFILE'
    AND category.status <> 'ARCHIVED'
    AND category.deleted_at IS NULL
    AND (
      category.code = canonical_code
      OR category.code = 'KK_PROFILE'
      OR category.code = target_year::TEXT
      OR category.name = canonical_name
    )
  ORDER BY
    CASE WHEN category.code = canonical_code THEN 2 ELSE 1 END DESC,
    category.created_at DESC
  LIMIT 1;

  IF target_category.id IS NULL THEN
    SELECT category.*
    INTO target_category
    FROM public.categories category
    WHERE category.code = canonical_code
    LIMIT 1;
  END IF;

  IF target_category.id IS NULL THEN
    INSERT INTO public.categories (
      code,
      name,
      description,
      record_type,
      filing_year,
      status,
      permission_mode,
      allow_sk_export,
      created_by,
      updated_by
    ) VALUES (
      canonical_code,
      canonical_name,
      'Annual KK youth profile for ' || target_year::TEXT || '.',
      'YOUTH_PROFILE',
      target_year,
      'PUBLISHED',
      source_category.permission_mode,
      source_category.allow_sk_export,
      actor_id,
      actor_id
    )
    RETURNING * INTO target_category;
  ELSE
    UPDATE public.categories
    SET
      name = canonical_name,
      description = 'Annual KK youth profile for ' || target_year::TEXT || '.',
      record_type = 'YOUTH_PROFILE',
      filing_year = target_year,
      status = 'PUBLISHED',
      permission_mode = source_category.permission_mode,
      allow_sk_export = source_category.allow_sk_export,
      updated_by = actor_id,
      deleted_at = NULL
    WHERE id = target_category.id
    RETURNING * INTO target_category;
  END IF;

  INSERT INTO public.category_fields (
    category_id,
    field_key,
    label,
    field_type,
    is_required,
    help_text,
    options,
    sort_order,
    version,
    is_active
  )
  SELECT
    target_category.id,
    field.field_key,
    field.label,
    field.field_type,
    field.is_required,
    field.help_text,
    field.options,
    field.sort_order,
    1,
    TRUE
  FROM public.category_fields field
  WHERE field.category_id = source_category.id
    AND field.is_active = TRUE
  ON CONFLICT DO NOTHING;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE profile.birth_date IS NULL),
    COUNT(*) FILTER (
      WHERE profile.birth_date > make_date(target_year - 15, 12, 31)
    ),
    COUNT(*) FILTER (
      WHERE profile.birth_date < make_date(target_year - 30, 1, 1)
    ),
    COUNT(*) FILTER (
      WHERE profile.birth_date BETWEEN
        make_date(target_year - 30, 1, 1)
        AND make_date(target_year - 15, 12, 31)
    )
  INTO
    source_records,
    excluded_missing_birth_date,
    excluded_underage,
    excluded_overage,
    eligible_records
  FROM public.youth_profiles profile
  WHERE profile.category_id = source_category.id
    AND profile.deleted_at IS NULL;

  INSERT INTO public.youth_profiles (
    category_id,
    barangay_id,
    submission_batch_id,
    display_name,
    first_name,
    middle_name,
    last_name,
    suffix,
    ext_name,
    birth_date,
    age_at_submission,
    sex_assigned_at_birth_id,
    sex_id,
    civil_status_id,
    youth_classification_id,
    youth_age_group_id,
    educational_attainment_id,
    work_status_id,
    email,
    contact_number,
    purok,
    is_registered_voter,
    is_registered_sk_voter,
    is_registered_national_voter,
    voted_last_election,
    attended_kk_assembly,
    kk_assembly_count,
    custom_values,
    status,
    youth_profile_status,
    return_reason,
    created_by,
    updated_by,
    submitted_by,
    submitted_at,
    approved_by,
    approved_at,
    version
  )
  SELECT
    target_category.id,
    source.barangay_id,
    NULL,
    source.display_name,
    source.first_name,
    source.middle_name,
    source.last_name,
    source.suffix,
    source.ext_name,
    source.birth_date,
    target_year - EXTRACT(YEAR FROM source.birth_date)::INTEGER,
    source.sex_assigned_at_birth_id,
    source.sex_id,
    source.civil_status_id,
    source.youth_classification_id,
    (
      SELECT option.id
      FROM public.reference_options option
      WHERE option.group_code = 'YOUTH_AGE_GROUP'
        AND option.code = CASE
          WHEN target_year - EXTRACT(YEAR FROM source.birth_date)::INTEGER BETWEEN 15 AND 17 THEN 'CHILD_YOUTH'
          WHEN target_year - EXTRACT(YEAR FROM source.birth_date)::INTEGER BETWEEN 18 AND 24 THEN 'CORE_YOUTH'
          ELSE 'YOUNG_ADULT'
        END
        AND option.is_active = TRUE
      LIMIT 1
    ),
    source.educational_attainment_id,
    source.work_status_id,
    source.email,
    source.contact_number,
    source.purok,
    source.is_registered_voter,
    source.is_registered_sk_voter,
    source.is_registered_national_voter,
    source.voted_last_election,
    source.attended_kk_assembly,
    source.kk_assembly_count,
    source.custom_values,
    'DRAFT',
    'DRAFT',
    NULL,
    actor_id,
    actor_id,
    NULL,
    NULL,
    NULL,
    NULL,
    1
  FROM public.youth_profiles source
  WHERE source.category_id = source_category.id
    AND source.deleted_at IS NULL
    AND source.birth_date BETWEEN
      make_date(target_year - 30, 1, 1)
      AND make_date(target_year - 15, 12, 31)
    AND NOT EXISTS (
      SELECT 1
      FROM public.youth_profiles existing
      WHERE existing.category_id = target_category.id
        AND existing.deleted_at IS NULL
        AND existing.barangay_id = source.barangay_id
        AND existing.birth_date = source.birth_date
        AND lower(btrim(existing.display_name)) = lower(btrim(source.display_name))
    );

  GET DIAGNOSTICS copied_records = ROW_COUNT;

  RETURN jsonb_build_object(
    'source_year', source_year,
    'target_year', target_year,
    'cutoff_date', make_date(target_year, 12, 31),
    'source_records', source_records,
    'eligible', eligible_records,
    'copied', copied_records,
    'skipped_existing', eligible_records - copied_records,
    'excluded_underage', excluded_underage,
    'excluded_overage', excluded_overage,
    'excluded_missing_birth_date', excluded_missing_birth_date,
    'target_category_id', target_category.id,
    'target_category_name', target_category.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_annual_kk_youth_profiles(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollover_annual_kk_youth_profiles(INTEGER) TO postgres, service_role;

SELECT cron.schedule(
  'annual-kk-youth-rollover',
  '5 16 31 12 *',
  'SELECT public.rollover_annual_kk_youth_profiles();'
);

CREATE OR REPLACE FUNCTION public.annual_kk_rollover_schedule_status()
RETURNS TABLE(jobid BIGINT, schedule TEXT, active BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT job.jobid, job.schedule, job.active
  FROM cron.job job
  WHERE job.jobname = 'annual-kk-youth-rollover';
$$;

REVOKE ALL ON FUNCTION public.annual_kk_rollover_schedule_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annual_kk_rollover_schedule_status() TO postgres, service_role;
