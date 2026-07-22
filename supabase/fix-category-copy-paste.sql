-- Non-destructive repair for category/custom-field issues.
-- Use this if you already have a database and do not want to run the full reset schema.

ALTER TYPE public.category_permission_mode ADD VALUE IF NOT EXISTS 'SK_FILLABLE';
ALTER TYPE public.category_permission_mode ADD VALUE IF NOT EXISTS 'SK_VIEW_ONLY';
ALTER TYPE public.category_permission_mode ADD VALUE IF NOT EXISTS 'ADMIN_ONLY';

ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'TEXT';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'SHORT_TEXT';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'LONG_TEXT';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'NUMBER';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'DATE';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'BOOLEAN';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'YES_NO';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'SELECT';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'SINGLE_SELECT';
ALTER TYPE public.custom_field_type ADD VALUE IF NOT EXISTS 'MULTI_SELECT';

ALTER TABLE public.youth_profiles
  ADD COLUMN IF NOT EXISTS custom_values JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS request_id TEXT;

UPDATE public.categories
SET status = 'PUBLISHED'
WHERE status = 'DRAFT'
  AND deleted_at IS NULL;

DELETE FROM public.category_fields cf
USING public.categories c
WHERE cf.category_id = c.id
  AND c.code = 'KK_PROFILE'
  AND cf.field_key IN (
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'birth_date',
    'contact_number',
    'email',
    'purok'
  );
