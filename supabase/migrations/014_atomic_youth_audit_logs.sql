-- Keep audit rows in the same PostgreSQL transaction as youth record changes.
-- A failed audit insert now rolls back the profile write instead of returning a
-- false failure after the profile has already been committed.

UPDATE public.audit_logs
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.audit_logs
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

CREATE OR REPLACE FUNCTION public.audit_youth_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_action TEXT;
  actor_id UUID;
  actor_role_text TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    actor_id := COALESCE(NEW.created_by, NEW.updated_by, NEW.submitted_by);
  ELSE
    actor_id := COALESCE(NEW.updated_by, NEW.submitted_by, NEW.approved_by, OLD.updated_by);
    audit_action := CASE
      WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'SUBMITTED' THEN 'SUBMIT'
      WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'APPROVED' THEN 'APPROVE'
      WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'RETURNED' THEN 'RETURN'
      WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'ARCHIVED' THEN 'ARCHIVE'
      WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'DRAFT' THEN 'RESTORE'
      ELSE 'UPDATE'
    END;
  END IF;

  SELECT profile.role::TEXT
  INTO actor_role_text
  FROM public.profiles profile
  WHERE profile.id = actor_id;

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
    actor_id,
    actor_role_text,
    audit_action,
    'YOUTH_RECORD',
    NEW.id,
    NEW.barangay_id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    jsonb_build_object(
      'source', 'youth_profile_trigger',
      'initial_status', CASE WHEN TG_OP = 'INSERT' THEN NEW.status ELSE NULL END,
      'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      'current_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_youth_profile_changes ON public.youth_profiles;
CREATE TRIGGER audit_youth_profile_changes
  AFTER INSERT OR UPDATE ON public.youth_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_youth_profile_change();
