-- Publish an empty Out-of-School Youth category every January without
-- carrying people forward from the prior year's consolidation.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.ensure_annual_osy_category(
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
  source_category public.categories%ROWTYPE;
  target_category public.categories%ROWTYPE;
  actor_id UUID;
  canonical_code TEXT := 'OSY_' || target_year::TEXT;
  canonical_name TEXT := 'Out-of-School Youth ' || target_year::TEXT;
  created_category BOOLEAN := FALSE;
BEGIN
  IF target_year > current_manila_year THEN
    RAISE EXCEPTION 'Cannot prepare future OSY filing year %. Current Asia/Manila year is %.',
      target_year,
      current_manila_year;
  END IF;

  SELECT profile.id
  INTO actor_id
  FROM public.profiles profile
  WHERE profile.role::TEXT = 'ADMIN'
    AND profile.account_status::TEXT = 'ACTIVE'
  ORDER BY profile.created_at, profile.id
  LIMIT 1;

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Annual OSY category preparation requires an active administrator profile.';
  END IF;

  SELECT category.*
  INTO source_category
  FROM public.categories category
  WHERE category.record_type = 'OUT_OF_SCHOOL_YOUTH'
    AND category.status = 'PUBLISHED'
    AND category.deleted_at IS NULL
    AND category.filing_year <= target_year
  ORDER BY category.filing_year DESC, category.created_at DESC
  LIMIT 1;

  IF source_category.id IS NULL THEN
    RAISE EXCEPTION 'No published Out-of-School Youth category is available as the annual template.';
  END IF;

  SELECT category.*
  INTO target_category
  FROM public.categories category
  WHERE category.record_type = 'OUT_OF_SCHOOL_YOUTH'
    AND category.filing_year = target_year
    AND category.status <> 'ARCHIVED'
    AND category.deleted_at IS NULL
  ORDER BY
    CASE WHEN category.code = canonical_code THEN 2 ELSE 1 END DESC,
    category.created_at DESC
  LIMIT 1;

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
      'Annual Out-of-School Youth registry for ' || target_year::TEXT || '. Records begin empty and arrive through validated imports.',
      'OUT_OF_SCHOOL_YOUTH',
      target_year,
      'PUBLISHED',
      source_category.permission_mode,
      source_category.allow_sk_export,
      actor_id,
      actor_id
    )
    ON CONFLICT (code) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      record_type = EXCLUDED.record_type,
      filing_year = EXCLUDED.filing_year,
      status = EXCLUDED.status,
      permission_mode = EXCLUDED.permission_mode,
      allow_sk_export = EXCLUDED.allow_sk_export,
      updated_by = EXCLUDED.updated_by,
      deleted_at = NULL
    RETURNING * INTO target_category;
    created_category := TRUE;
  ELSE
    UPDATE public.categories
    SET
      name = canonical_name,
      description = 'Annual Out-of-School Youth registry for ' || target_year::TEXT || '. Records begin empty and arrive through validated imports.',
      status = 'PUBLISHED',
      permission_mode = source_category.permission_mode,
      allow_sk_export = source_category.allow_sk_export,
      updated_by = actor_id
    WHERE id = target_category.id
    RETURNING * INTO target_category;
  END IF;

  IF source_category.id <> target_category.id THEN
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
      field.version,
      field.is_active
    FROM public.category_fields field
    WHERE field.category_id = source_category.id
      AND field.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM public.category_fields existing
        WHERE existing.category_id = target_category.id
          AND existing.field_key = field.field_key
          AND existing.version = field.version
      );
  END IF;

  RETURN jsonb_build_object(
    'target_year', target_year,
    'created', created_category,
    'target_category_id', target_category.id,
    'target_category_name', target_category.name,
    'records_copied', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_annual_osy_category(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_annual_osy_category(INTEGER) TO postgres, service_role;

SELECT public.ensure_annual_osy_category(
  EXTRACT(YEAR FROM timezone('Asia/Manila', now()))::INTEGER
);

SELECT cron.schedule(
  'annual-osy-category',
  '6 16 31 12 *',
  'SELECT public.ensure_annual_osy_category();'
);

CREATE OR REPLACE FUNCTION public.annual_osy_category_schedule_status()
RETURNS TABLE(jobid BIGINT, schedule TEXT, active BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT job.jobid, job.schedule, job.active
  FROM cron.job job
  WHERE job.jobname = 'annual-osy-category';
$$;

REVOKE ALL ON FUNCTION public.annual_osy_category_schedule_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annual_osy_category_schedule_status() TO postgres, service_role;
