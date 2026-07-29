-- Allow administrators to permanently remove an account and the unapproved
-- youth information created by it. Approved records remain protected.

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_record_count INTEGER := 0;
  removed_audit_log_count INTEGER := 0;
  removed_import_batch_count INTEGER := 0;
  removed_youth_record_count INTEGER := 0;
  removable_record_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Lock the profile so no new rows can start referencing it while cleanup is
  -- in progress. The authentication user is deleted by the backend afterward.
  PERFORM 1
  FROM public.profiles
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'ACCOUNT_NOT_FOUND';
  END IF;

  SELECT count(*)
  INTO protected_record_count
  FROM public.youth_profiles
  WHERE created_by = p_account_id
    AND (status = 'APPROVED'::public.record_status OR approved_at IS NOT NULL);

  IF protected_record_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCOUNT_HAS_APPROVED_RECORDS';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO removable_record_ids
  FROM public.youth_profiles
  WHERE created_by = p_account_id;

  -- Audit snapshots can contain the youth information being removed, so clear
  -- both the account's actions and the history for its removable records.
  DELETE FROM public.audit_logs
  WHERE actor_profile_id = p_account_id
    OR (
      entity_type = 'YOUTH_RECORD'
      AND entity_id = ANY(removable_record_ids)
    );
  GET DIAGNOSTICS removed_audit_log_count = ROW_COUNT;

  DELETE FROM public.youth_profiles
  WHERE id = ANY(removable_record_ids);
  GET DIAGNOSTICS removed_youth_record_count = ROW_COUNT;

  -- Import rows contain raw and normalized personal information and cascade
  -- from their owning batch.
  DELETE FROM public.import_batches
  WHERE created_by = p_account_id
    OR uploaded_by = p_account_id;
  GET DIAGNOSTICS removed_import_batch_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'removed_youth_records', removed_youth_record_count,
    'removed_import_batches', removed_import_batch_count,
    'removed_audit_logs', removed_audit_log_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(UUID) TO service_role;
