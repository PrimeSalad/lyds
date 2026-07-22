-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_barangay_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE youth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE youth_profile_custom_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_row_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (id = public.current_profile_id());

-- Admin can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT
  USING (public.is_admin());

-- Admin can insert profiles
CREATE POLICY profiles_insert_admin ON profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin can update all profiles
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE
  USING (public.is_admin());

-- Users can update their own profile (limited fields enforced in backend)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (id = public.current_profile_id());

-- ============================================
-- BARANGAYS
-- ============================================

-- Anyone authenticated can read active barangays (for dropdowns)
CREATE POLICY barangays_select_authenticated ON barangays
  FOR SELECT
  USING (true);

-- Admin can insert barangays
CREATE POLICY barangays_insert_admin ON barangays
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin can update barangays
CREATE POLICY barangays_update_admin ON barangays
  FOR UPDATE
  USING (public.is_admin());

-- Admin can delete (soft) barangays
CREATE POLICY barangays_delete_admin ON barangays
  FOR DELETE
  USING (public.is_admin());

-- ============================================
-- ACCOUNT BARANGAY ASSIGNMENTS
-- ============================================

-- Users can read their own assignments
CREATE POLICY assignments_select_own ON account_barangay_assignments
  FOR SELECT
  USING (profile_id = public.current_profile_id());

-- Admin can read all assignments
CREATE POLICY assignments_select_admin ON account_barangay_assignments
  FOR SELECT
  USING (public.is_admin());

-- Admin can manage all assignments
CREATE POLICY assignments_insert_admin ON account_barangay_assignments
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY assignments_update_admin ON account_barangay_assignments
  FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- CATEGORIES
-- ============================================

-- Admin can read all categories
CREATE POLICY categories_select_admin ON categories
  FOR SELECT
  USING (public.is_admin());

-- SK can read published categories they have access to
CREATE POLICY categories_select_sk ON categories
  FOR SELECT
  USING (
    status = 'PUBLISHED'
    AND permission_mode IN ('SK_FILLABLE', 'SK_VIEW_ONLY')
    AND deleted_at IS NULL
  );

-- Admin can manage categories
CREATE POLICY categories_insert_admin ON categories
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY categories_update_admin ON categories
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY categories_delete_admin ON categories
  FOR DELETE
  USING (public.is_admin());

-- ============================================
-- CATEGORY FIELDS
-- ============================================

-- Anyone who can see the category can see its fields
CREATE POLICY category_fields_select ON category_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_fields.category_id
        AND (
          public.is_admin()
          OR (c.status = 'PUBLISHED' AND c.permission_mode IN ('SK_FILLABLE', 'SK_VIEW_ONLY'))
        )
    )
  );

-- Admin can manage category fields
CREATE POLICY category_fields_insert_admin ON category_fields
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY category_fields_update_admin ON category_fields
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY category_fields_delete_admin ON category_fields
  FOR DELETE
  USING (public.is_admin());

-- ============================================
-- REFERENCE GROUPS & OPTIONS
-- ============================================

-- Anyone authenticated can read reference data
CREATE POLICY reference_groups_select ON reference_groups
  FOR SELECT
  USING (true);

CREATE POLICY reference_options_select ON reference_options
  FOR SELECT
  USING (true);

-- Admin can manage reference data
CREATE POLICY reference_groups_insert_admin ON reference_groups
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY reference_groups_update_admin ON reference_groups
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY reference_options_insert_admin ON reference_options
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY reference_options_update_admin ON reference_options
  FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- YOUTH PROFILES
-- ============================================

-- Admin can do everything with youth profiles
CREATE POLICY youth_profiles_select_admin ON youth_profiles
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY youth_profiles_insert_admin ON youth_profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY youth_profiles_update_admin ON youth_profiles
  FOR UPDATE
  USING (public.is_admin());

-- SK can read records in their assigned barangay
CREATE POLICY youth_profiles_select_sk ON youth_profiles
  FOR SELECT
  USING (
    barangay_id = public.current_barangay_id()
  );

-- SK can insert records in their assigned barangay (category must allow it)
CREATE POLICY youth_profiles_insert_sk ON youth_profiles
  FOR INSERT
  WITH CHECK (
    barangay_id = public.current_barangay_id()
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND c.status = 'PUBLISHED'
        AND c.permission_mode = 'SK_FILLABLE'
    )
  );

-- SK can update draft/returned records in their assigned barangay
CREATE POLICY youth_profiles_update_sk ON youth_profiles
  FOR UPDATE
  USING (
    barangay_id = public.current_barangay_id()
    AND status IN ('DRAFT', 'RETURNED')
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND c.permission_mode = 'SK_FILLABLE'
    )
  );

-- ============================================
-- YOUTH PROFILE CUSTOM VALUES
-- ============================================

-- Admin can manage all custom values
CREATE POLICY custom_values_select_admin ON youth_profile_custom_values
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY custom_values_insert_admin ON youth_profile_custom_values
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY custom_values_update_admin ON youth_profile_custom_values
  FOR UPDATE
  USING (public.is_admin());

-- SK can read custom values for records in their barangay
CREATE POLICY custom_values_select_sk ON youth_profile_custom_values
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.youth_profiles yp
      WHERE yp.id = youth_profile_custom_values.youth_profile_id
        AND yp.barangay_id = public.current_barangay_id()
    )
  );

-- SK can manage custom values for draft/returned records in their barangay
CREATE POLICY custom_values_insert_sk ON youth_profile_custom_values
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.youth_profiles yp
      WHERE yp.id = youth_profile_custom_values.youth_profile_id
        AND yp.barangay_id = public.current_barangay_id()
        AND yp.status IN ('DRAFT', 'RETURNED')
    )
  );

CREATE POLICY custom_values_update_sk ON youth_profile_custom_values
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.youth_profiles yp
      WHERE yp.id = youth_profile_custom_values.youth_profile_id
        AND yp.barangay_id = public.current_barangay_id()
        AND yp.status IN ('DRAFT', 'RETURNED')
    )
  );

-- ============================================
-- IMPORT BATCHES
-- ============================================

-- Admin can see all imports
CREATE POLICY import_batches_select_admin ON import_batches
  FOR SELECT
  USING (public.is_admin());

-- SK can see imports for their barangay
CREATE POLICY import_batches_select_sk ON import_batches
  FOR SELECT
  USING (barangay_id = public.current_barangay_id());

-- Admin can create imports
CREATE POLICY import_batches_insert_admin ON import_batches
  FOR INSERT
  WITH CHECK (public.is_admin());

-- SK can create imports for their barangay
CREATE POLICY import_batches_insert_sk ON import_batches
  FOR INSERT
  WITH CHECK (barangay_id = public.current_barangay_id());

-- Admin can update imports
CREATE POLICY import_batches_update_admin ON import_batches
  FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- IMPORT ROW RESULTS
-- ============================================

-- Admin can see all row results
CREATE POLICY import_rows_select_admin ON import_row_results
  FOR SELECT
  USING (public.is_admin());

-- SK can see row results for batches in their barangay
CREATE POLICY import_rows_select_sk ON import_row_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_batches ib
      WHERE ib.id = import_row_results.import_batch_id
        AND ib.barangay_id = public.current_barangay_id()
    )
  );

-- Admin can insert row results
CREATE POLICY import_rows_insert_admin ON import_row_results
  FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================
-- AUDIT LOGS
-- ============================================

-- Admin can read all audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (public.is_admin());

-- Insert is handled by backend functions/triggers only
CREATE POLICY audit_logs_insert_admin ON audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());

-- No update or delete policies (audit logs are immutable)
