-- Align annual KK datasets and remove the empty CertifiCat test category.
-- Annual record copying is performed by the authenticated backend so the
-- initiating administrator is retained as the record creator/updater.

UPDATE public.categories
SET name = 'KK Youth Profile ' || filing_year::text
WHERE deleted_at IS NULL
  AND record_type = 'YOUTH_PROFILE'
  AND (
    code = 'KK_PROFILE'
    OR code = 'KK_PROFILE_' || filing_year::text
    OR code = filing_year::text
    OR name ILIKE '%Katipunan ng Kabataan%'
    OR name ILIKE 'KK Youth Profile%'
  );

UPDATE public.categories category
SET
  status = 'ARCHIVED',
  deleted_at = COALESCE(category.deleted_at, now())
WHERE (
    lower(category.name) = 'certificat'
    OR (category.code = 'KK' AND category.name ILIKE 'certifi%')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.youth_profiles profile
    WHERE profile.category_id = category.id
      AND profile.deleted_at IS NULL
  );

UPDATE public.category_fields field
SET is_active = FALSE
FROM public.categories category
WHERE field.category_id = category.id
  AND category.deleted_at IS NOT NULL
  AND (
    lower(category.name) = 'certificat'
    OR (category.code = 'KK' AND category.name ILIKE 'certifi%')
  );

CREATE OR REPLACE FUNCTION public.default_category_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.categories
  WHERE record_type = 'YOUTH_PROFILE'
    AND status = 'PUBLISHED'
    AND deleted_at IS NULL
  ORDER BY filing_year DESC, created_at DESC
  LIMIT 1;
$$;
