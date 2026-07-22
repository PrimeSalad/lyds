-- Align the versioned schema with the compatibility fields used by imports and
-- existing deployed projects. This migration is idempotent and non-destructive.

ALTER TABLE public.youth_profiles
  ADD COLUMN IF NOT EXISTS ext_name TEXT,
  ADD COLUMN IF NOT EXISTS sex_id UUID REFERENCES public.reference_options(id),
  ADD COLUMN IF NOT EXISTS purok TEXT,
  ADD COLUMN IF NOT EXISTS is_registered_sk_voter BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_registered_national_voter BOOLEAN,
  ADD COLUMN IF NOT EXISTS custom_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS youth_profile_status public.record_status;

UPDATE public.youth_profiles
SET
  youth_profile_status = COALESCE(youth_profile_status, status, 'DRAFT'::public.record_status),
  status = COALESCE(status, youth_profile_status, 'DRAFT'::public.record_status),
  ext_name = COALESCE(ext_name, suffix),
  suffix = COALESCE(suffix, ext_name),
  sex_id = COALESCE(sex_id, sex_assigned_at_birth_id),
  sex_assigned_at_birth_id = COALESCE(sex_assigned_at_birth_id, sex_id),
  is_registered_voter = COALESCE(is_registered_voter, is_registered_sk_voter, FALSE),
  is_registered_sk_voter = COALESCE(is_registered_sk_voter, is_registered_voter, FALSE),
  is_registered_national_voter = COALESCE(is_registered_national_voter, voted_last_election, FALSE)
WHERE
  youth_profile_status IS NULL
  OR status IS NULL
  OR ext_name IS DISTINCT FROM suffix
  OR sex_id IS DISTINCT FROM sex_assigned_at_birth_id
  OR is_registered_voter IS NULL
  OR is_registered_sk_voter IS NULL
  OR is_registered_national_voter IS NULL;

ALTER TABLE public.youth_profiles
  ALTER COLUMN status SET DEFAULT 'DRAFT',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN youth_profile_status SET DEFAULT 'DRAFT',
  ALTER COLUMN youth_profile_status SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_youth_profile_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status = COALESCE(NEW.status, NEW.youth_profile_status, 'DRAFT'::public.record_status);
    NEW.youth_profile_status = NEW.status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.youth_profile_status = NEW.status;
  ELSIF NEW.youth_profile_status IS DISTINCT FROM OLD.youth_profile_status THEN
    NEW.status = NEW.youth_profile_status;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.suffix IS DISTINCT FROM OLD.suffix THEN
    NEW.ext_name = NEW.suffix;
  ELSIF NEW.ext_name IS DISTINCT FROM OLD.ext_name THEN
    NEW.suffix = NEW.ext_name;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.sex_assigned_at_birth_id IS DISTINCT FROM OLD.sex_assigned_at_birth_id THEN
    NEW.sex_id = NEW.sex_assigned_at_birth_id;
  ELSIF NEW.sex_id IS DISTINCT FROM OLD.sex_id THEN
    NEW.sex_assigned_at_birth_id = NEW.sex_id;
  END IF;

  NEW.is_registered_voter = COALESCE(NEW.is_registered_voter, NEW.is_registered_sk_voter, FALSE);
  NEW.is_registered_sk_voter = NEW.is_registered_voter;
  NEW.is_registered_national_voter = COALESCE(NEW.is_registered_national_voter, NEW.voted_last_election, FALSE);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_youth_profile_compat_trigger ON public.youth_profiles;
CREATE TRIGGER sync_youth_profile_compat_trigger
  BEFORE INSERT OR UPDATE ON public.youth_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_youth_profile_compat();

-- Remove unreferenced test barangays while preserving any row that owns data.
DELETE FROM public.barangays b
WHERE b.code NOT LIKE '174001%'
  AND NOT EXISTS (SELECT 1 FROM public.account_barangay_assignments a WHERE a.barangay_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.youth_profiles y WHERE y.barangay_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.import_batches i WHERE i.barangay_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.announcements n WHERE n.barangay_id = b.id);

DELETE FROM public.barangays b
WHERE b.code = 'Home'
  AND NOT EXISTS (SELECT 1 FROM public.account_barangay_assignments a WHERE a.barangay_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.youth_profiles y WHERE y.barangay_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.import_batches i WHERE i.barangay_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.announcements n WHERE n.barangay_id = b.id);

CREATE INDEX IF NOT EXISTS idx_youth_profiles_status_created
  ON public.youth_profiles (status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_youth_profiles_updated
  ON public.youth_profiles (updated_at DESC)
  WHERE deleted_at IS NULL;
