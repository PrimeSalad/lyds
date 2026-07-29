-- Make categories explicit registry datasets and attach child laborer records to them.

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_record_type_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_record_type_check
  CHECK (record_type IN ('YOUTH_PROFILE', 'CHILD_LABORER'));

ALTER TABLE public.child_laborer_records
  ADD COLUMN IF NOT EXISTS category_id UUID NULL
    REFERENCES public.categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS custom_values JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(custom_values) = 'object');

WITH annual_child_registry AS (
  SELECT
    record.filing_year,
    COALESCE(
      (ARRAY_AGG(record.created_by ORDER BY record.created_at) FILTER (WHERE record.created_by IS NOT NULL))[1],
      (
        SELECT profile.id
        FROM public.profiles profile
        ORDER BY CASE WHEN profile.role::TEXT = 'ADMIN' THEN 0 ELSE 1 END, profile.created_at, profile.id
        LIMIT 1
      )
    ) AS actor_id
  FROM public.child_laborer_records record
  GROUP BY record.filing_year
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
  'CHILD_LABORER_' || annual.filing_year,
  'Child Laborer Records ' || annual.filing_year,
  'Annual protected child laborer monitoring and validation registry for ' || annual.filing_year || '.',
  'CHILD_LABORER',
  annual.filing_year,
  'PUBLISHED',
  'SK_FILLABLE',
  false,
  annual.actor_id,
  annual.actor_id
FROM annual_child_registry annual
WHERE annual.actor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.categories category
    WHERE category.record_type = 'CHILD_LABORER'
      AND category.filing_year = annual.filing_year
      AND category.deleted_at IS NULL
  )
ON CONFLICT (code) DO NOTHING;

UPDATE public.child_laborer_records record
SET category_id = (
  SELECT category.id
  FROM public.categories category
  WHERE category.record_type = 'CHILD_LABORER'
    AND category.filing_year = record.filing_year
    AND category.deleted_at IS NULL
  ORDER BY
    CASE category.status::TEXT WHEN 'PUBLISHED' THEN 0 WHEN 'DRAFT' THEN 1 ELSE 2 END,
    category.created_at,
    category.id
  LIMIT 1
)
WHERE record.category_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.child_laborer_records
    WHERE category_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Every child laborer record must resolve to a CHILD_LABORER category.';
  END IF;
END;
$$;

ALTER TABLE public.child_laborer_records
  ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_record_type_year
  ON public.categories (record_type, filing_year DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_child_laborers_category
  ON public.child_laborer_records (category_id);
