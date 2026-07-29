-- Yearly child laborer consolidation records.
-- Records are retained through archival so annual reports and audit history stay reproducible.

CREATE TABLE public.child_laborer_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_year INTEGER NOT NULL CHECK (filing_year BETWEEN 2000 AND 2100),
  barangay_id UUID NOT NULL REFERENCES public.barangays(id),

  first_name TEXT NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 100),
  middle_name TEXT NULL CHECK (middle_name IS NULL OR char_length(btrim(middle_name)) <= 100),
  last_name TEXT NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 100),
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'NOT_SPECIFIED')),

  attending_school BOOLEAN NOT NULL,
  highest_grade_completed TEXT NULL CHECK (highest_grade_completed IS NULL OR char_length(btrim(highest_grade_completed)) <= 150),
  nature_of_work TEXT NOT NULL CHECK (char_length(btrim(nature_of_work)) BETWEEN 1 AND 300),

  father_name TEXT NULL CHECK (father_name IS NULL OR char_length(btrim(father_name)) <= 200),
  mother_name TEXT NULL CHECK (mother_name IS NULL OR char_length(btrim(mother_name)) <= 200),
  guardian_name TEXT NULL CHECK (guardian_name IS NULL OR char_length(btrim(guardian_name)) <= 200),
  parent_guardian_occupation TEXT NULL CHECK (parent_guardian_occupation IS NULL OR char_length(btrim(parent_guardian_occupation)) <= 300),

  record_status TEXT NOT NULL DEFAULT 'IDENTIFIED'
    CHECK (record_status IN ('IDENTIFIED', 'VALIDATED', 'REFERRED', 'MONITORED', 'CLOSED', 'ARCHIVED')),
  remarks TEXT NULL CHECK (remarks IS NULL OR char_length(btrim(remarks)) <= 1000),

  -- Preserve statutory records when an operator account is permanently removed.
  -- The account-deletion workflow clears that operator's audit rows first; these
  -- attribution links then become null instead of recreating a deletion blocker.
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT child_laborer_birth_within_filing_year
    CHECK (birth_date <= make_date(filing_year, 12, 31)),
  CONSTRAINT child_laborer_parent_or_guardian_required
    CHECK (
      NULLIF(btrim(father_name), '') IS NOT NULL
      OR NULLIF(btrim(mother_name), '') IS NOT NULL
      OR NULLIF(btrim(guardian_name), '') IS NOT NULL
    )
);

CREATE INDEX idx_child_laborers_year_barangay
  ON public.child_laborer_records (filing_year DESC, barangay_id);
CREATE INDEX idx_child_laborers_status
  ON public.child_laborer_records (record_status);
CREATE INDEX idx_child_laborers_name
  ON public.child_laborer_records (lower(last_name), lower(first_name));
CREATE INDEX idx_child_laborers_birth_date
  ON public.child_laborer_records (birth_date);

CREATE TRIGGER set_child_laborer_records_updated_at
  BEFORE UPDATE ON public.child_laborer_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.audit_child_laborer_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  audit_action TEXT;
  actor_role_text TEXT;
BEGIN
  -- Account deletion uses ON DELETE SET NULL for attribution fields. That
  -- referential cleanup must not create a fresh audit row for the deleted actor.
  IF NEW.updated_by IS NULL THEN
    RETURN NEW;
  END IF;

  audit_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'CREATE'
    WHEN NEW.record_status IS DISTINCT FROM OLD.record_status
      AND NEW.record_status = 'ARCHIVED' THEN 'ARCHIVE'
    WHEN NEW.record_status IS DISTINCT FROM OLD.record_status
      AND OLD.record_status = 'ARCHIVED' THEN 'RESTORE'
    ELSE 'UPDATE'
  END;

  SELECT profile.role::TEXT
  INTO actor_role_text
  FROM public.profiles profile
  WHERE profile.id = NEW.updated_by;

  INSERT INTO public.audit_logs (
    actor_profile_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    barangay_id,
    before_data,
    after_data,
    metadata
  ) VALUES (
    NEW.updated_by,
    actor_role_text,
    audit_action,
    'CHILD_LABORER_RECORD',
    NEW.id,
    NEW.barangay_id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    jsonb_build_object(
      'source', 'child_laborer_trigger',
      'filing_year', NEW.filing_year,
      'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.record_status ELSE NULL END,
      'current_status', NEW.record_status
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_child_laborer_changes ON public.child_laborer_records;
CREATE TRIGGER audit_child_laborer_changes
  AFTER INSERT OR UPDATE ON public.child_laborer_records
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_child_laborer_change();

ALTER TABLE public.child_laborer_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY child_laborers_select_admin ON public.child_laborer_records
  FOR SELECT USING (public.is_admin());
CREATE POLICY child_laborers_insert_admin ON public.child_laborer_records
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND created_by = public.current_profile_id()
    AND updated_by = public.current_profile_id()
  );
CREATE POLICY child_laborers_update_admin ON public.child_laborer_records
  FOR UPDATE USING (public.is_admin()) WITH CHECK (
    public.is_admin()
    AND created_by IS NOT NULL
    AND updated_by = public.current_profile_id()
  );

CREATE POLICY child_laborers_select_sk ON public.child_laborer_records
  FOR SELECT USING (barangay_id = public.current_barangay_id());
CREATE POLICY child_laborers_insert_sk ON public.child_laborer_records
  FOR INSERT WITH CHECK (
    barangay_id = public.current_barangay_id()
    AND created_by = public.current_profile_id()
    AND updated_by = public.current_profile_id()
  );
CREATE POLICY child_laborers_update_sk ON public.child_laborer_records
  FOR UPDATE
  USING (barangay_id = public.current_barangay_id())
  WITH CHECK (
    barangay_id = public.current_barangay_id()
    AND created_by IS NOT NULL
    AND updated_by = public.current_profile_id()
  );

CREATE POLICY require_mfa_aal2 ON public.child_laborer_records
  AS RESTRICTIVE
  FOR ALL TO public
  USING ((SELECT auth.jwt() ->> 'aal') = 'aal2')
  WITH CHECK ((SELECT auth.jwt() ->> 'aal') = 'aal2');

REVOKE ALL ON FUNCTION public.audit_child_laborer_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_child_laborer_change() TO service_role;
