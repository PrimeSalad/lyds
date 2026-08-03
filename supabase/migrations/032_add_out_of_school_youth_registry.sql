-- Add Out-of-School Youth as a first-class registry and publish its 2025 dataset.

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_record_type_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_record_type_check
  CHECK (record_type IN ('YOUTH_PROFILE', 'OUT_OF_SCHOOL_YOUTH', 'CHILD_LABORER'));

ALTER TABLE public.reference_groups
  DROP CONSTRAINT IF EXISTS reference_groups_record_type_check;

ALTER TABLE public.reference_groups
  ADD CONSTRAINT reference_groups_record_type_check
  CHECK (record_type IN ('YOUTH_PROFILE', 'OUT_OF_SCHOOL_YOUTH', 'CHILD_LABORER'));

WITH registry_actor AS (
  SELECT profile.id
  FROM public.profiles profile
  WHERE profile.role::TEXT = 'ADMIN'
    AND profile.account_status::TEXT = 'ACTIVE'
  ORDER BY profile.created_at, profile.id
  LIMIT 1
)
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
)
SELECT
  'OSY_2025',
  'Out-of-School Youth 2025',
  'Municipality-wide 2025 Out-of-School Youth consolidation and validation registry.',
  'OUT_OF_SCHOOL_YOUTH',
  2025,
  'PUBLISHED',
  'SK_FILLABLE',
  TRUE,
  registry_actor.id,
  registry_actor.id
FROM registry_actor
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
  deleted_at = NULL;
