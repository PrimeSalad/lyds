-- Pin function lookup paths and remove direct client execution of privileged
-- SECURITY DEFINER functions. Backend operations continue through service_role.
DO $$
DECLARE
  function_record record;
  mutable_path_functions constant text[] := ARRAY[
    'current_profile_id',
    'current_account_role',
    'is_admin',
    'current_barangay_id',
    'can_access_category',
    'get_user_barangay_id',
    'update_updated_at_column',
    'sync_reference_option_codes',
    'default_category_id',
    'sync_youth_profile_compat',
    'sync_import_batch_compat',
    'sync_import_row_compat'
  ];
  privileged_functions constant text[] := ARRAY[
    'annual_kk_rollover_schedule_status',
    'audit_youth_profile_change',
    'commit_youth_import_batch',
    'get_user_barangay_id',
    'prepare_account_deletion',
    'rollover_annual_kk_youth_profiles'
  ];
BEGIN
  FOR function_record IN
    SELECT procedure.oid::regprocedure::text AS signature
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = ANY(mutable_path_functions)
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', function_record.signature);
  END LOOP;

  FOR function_record IN
    SELECT procedure.oid::regprocedure::text AS signature, procedure.proname
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = ANY(privileged_functions)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_record.signature
    );

    IF function_record.proname IN ('annual_kk_rollover_schedule_status', 'rollover_annual_kk_youth_profiles') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres, service_role', function_record.signature);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_record.signature);
    END IF;
  END LOOP;
END
$$;
