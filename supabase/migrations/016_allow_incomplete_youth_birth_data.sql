-- Youth profiling source files can contain otherwise usable records whose
-- birth date has not yet been collected. Keep those records visible and flag
-- them through the existing data-quality reporting instead of rejecting them.

ALTER TABLE public.youth_profiles
  ALTER COLUMN birth_date DROP NOT NULL,
  ALTER COLUMN age_at_submission DROP NOT NULL;
