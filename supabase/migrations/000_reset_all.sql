-- FULL RESET: Drop everything and start fresh
-- Run this BEFORE all other migrations

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.youth_profile_custom_values CASCADE;
DROP TABLE IF EXISTS public.youth_profiles CASCADE;
DROP TABLE IF EXISTS public.import_row_results CASCADE;
DROP TABLE IF EXISTS public.import_batches CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.category_fields CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.account_barangay_assignments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.barangays CASCADE;
DROP TABLE IF EXISTS public.reference_options CASCADE;
DROP TABLE IF EXISTS public.reference_groups CASCADE;

-- Drop types
DROP TYPE IF EXISTS public.account_role CASCADE;
DROP TYPE IF EXISTS public.account_status CASCADE;
DROP TYPE IF EXISTS public.category_status CASCADE;
DROP TYPE IF EXISTS public.category_permission_mode CASCADE;
DROP TYPE IF EXISTS public.record_status CASCADE;
DROP TYPE IF EXISTS public.custom_field_type CASCADE;
DROP TYPE IF EXISTS public.import_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.current_profile_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_account_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_barangay_id() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_category(uuid) CASCADE;
