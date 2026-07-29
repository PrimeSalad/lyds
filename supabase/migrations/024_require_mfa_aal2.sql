-- Require a verified second factor for every direct client access path.
-- Existing role/barangay policies still determine which rows an AAL2 user may use.
-- The backend service-role client bypasses RLS and separately enforces AAL2 in requireAuth.
DO $$
DECLARE
  table_name text;
  protected_tables constant text[] := ARRAY[
    'profiles',
    'barangays',
    'account_barangay_assignments',
    'categories',
    'category_fields',
    'reference_groups',
    'reference_options',
    'youth_profiles',
    'youth_profile_custom_values',
    'import_batches',
    'import_row_results',
    'audit_logs',
    'announcements'
  ];
BEGIN
  FOREACH table_name IN ARRAY protected_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS require_mfa_aal2 ON public.%I', table_name);
      EXECUTE format(
        'CREATE POLICY require_mfa_aal2 ON public.%I AS RESTRICTIVE FOR ALL TO public USING ((SELECT auth.jwt() ->> ''aal'') = ''aal2'') WITH CHECK ((SELECT auth.jwt() ->> ''aal'') = ''aal2'')',
        table_name
      );
    END IF;
  END LOOP;
END
$$;
