-- LYDO / Youth Profiling complete Supabase schema
-- Paste this in Supabase SQL Editor for a fresh/reset database.
-- WARNING: This drops the app tables, functions, and enum types below.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.import_row_results CASCADE;
DROP TABLE IF EXISTS public.import_batches CASCADE;
DROP TABLE IF EXISTS public.youth_profiles CASCADE;
DROP TABLE IF EXISTS public.reference_options CASCADE;
DROP TABLE IF EXISTS public.reference_groups CASCADE;
DROP TABLE IF EXISTS public.category_fields CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.account_barangay_assignments CASCADE;
DROP TABLE IF EXISTS public.barangays CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.current_profile_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_account_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_barangay_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_category(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.default_category_id() CASCADE;
DROP FUNCTION IF EXISTS public.sync_reference_option_codes() CASCADE;
DROP FUNCTION IF EXISTS public.sync_youth_profile_compat() CASCADE;
DROP FUNCTION IF EXISTS public.sync_import_batch_compat() CASCADE;
DROP FUNCTION IF EXISTS public.sync_import_row_compat() CASCADE;

DROP TYPE IF EXISTS public.announcement_audience CASCADE;
DROP TYPE IF EXISTS public.announcement_status CASCADE;
DROP TYPE IF EXISTS public.import_status CASCADE;
DROP TYPE IF EXISTS public.custom_field_type CASCADE;
DROP TYPE IF EXISTS public.record_status CASCADE;
DROP TYPE IF EXISTS public.category_permission_mode CASCADE;
DROP TYPE IF EXISTS public.category_status CASCADE;
DROP TYPE IF EXISTS public.account_status CASCADE;
DROP TYPE IF EXISTS public.account_role CASCADE;

CREATE TYPE public.account_role AS ENUM ('ADMIN', 'SK_OFFICIAL');
CREATE TYPE public.account_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE public.category_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE public.category_permission_mode AS ENUM (
  'SK_FILLABLE',
  'SK_VIEW_ONLY',
  'ADMIN_ONLY',
  'PUBLIC',
  'RESTRICTED',
  'PRIVATE'
);
CREATE TYPE public.record_status AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'ARCHIVED');
CREATE TYPE public.custom_field_type AS ENUM (
  'TEXT',
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'YES_NO',
  'SELECT',
  'SINGLE_SELECT',
  'MULTI_SELECT'
);
CREATE TYPE public.import_status AS ENUM ('UPLOADING', 'VALIDATING', 'VALIDATED', 'COMMITTING', 'COMMITTED', 'FAILED', 'CANCELLED');
CREATE TYPE public.announcement_status AS ENUM ('PUBLISHED', 'ARCHIVED');
CREATE TYPE public.announcement_audience AS ENUM ('ALL', 'ADMIN', 'SK_OFFICIAL');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.account_role NOT NULL DEFAULT 'SK_OFFICIAL',
  account_status public.account_status NOT NULL DEFAULT 'ACTIVE',
  position_title TEXT,
  contact_number TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.barangays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  district TEXT,
  municipality TEXT,
  province TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.account_barangay_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_active_barangay_assignment
  ON public.account_barangay_assignments(profile_id)
  WHERE is_active = TRUE;

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  record_type TEXT NOT NULL DEFAULT 'YOUTH_PROFILE',
  status public.category_status NOT NULL DEFAULT 'DRAFT',
  permission_mode public.category_permission_mode NOT NULL DEFAULT 'SK_FILLABLE',
  allow_sk_export BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.category_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type public.custom_field_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  help_text TEXT,
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, field_key)
);

CREATE TABLE public.reference_groups (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reference_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT REFERENCES public.reference_groups(code) ON UPDATE CASCADE ON DELETE CASCADE,
  category_code TEXT,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reference_options_group_required CHECK (group_code IS NOT NULL OR category_code IS NOT NULL),
  UNIQUE(group_code, code)
);

CREATE OR REPLACE FUNCTION public.sync_reference_option_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.group_code IS NULL THEN
    NEW.group_code = NEW.category_code;
  END IF;

  IF NEW.category_code IS NULL THEN
    NEW.category_code = NEW.group_code;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reference_options_sync_codes
  BEFORE INSERT OR UPDATE ON public.reference_options
  FOR EACH ROW EXECUTE FUNCTION public.sync_reference_option_codes();

INSERT INTO public.barangays (code, name, municipality, province, is_active, deleted_at) VALUES
  ('174001001', 'Agot', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001002', 'Agumaymayan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001003', 'Amoingon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001004', 'Apitong', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001005', 'Balagasan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001006', 'Balaring', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001007', 'Balimbing', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001008', 'Balogo', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001009', 'Bangbangalon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001010', 'Bamban', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001011', 'Bantad', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001012', 'Bantay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001013', 'Bayuti', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001014', 'Binunga', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001015', 'Boi', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001016', 'Boton', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001017', 'Buliasnin', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001018', 'Bunganay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001019', 'Maligaya', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001020', 'Caganhao', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001021', 'Canat', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001022', 'Catubugan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001023', 'Cawit', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001024', 'Daig', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001025', 'Daypay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001026', 'Duyay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001027', 'Ihatub', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001028', 'Isok II Pob.', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001029', 'Hinapulan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001030', 'Laylay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001031', 'Lupac', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001032', 'Mahinhin', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001033', 'Mainit', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001034', 'Malbog', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001035', 'Malusak', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001036', 'Mansiwat', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001037', 'Mataas Na Bayan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001038', 'Maybo', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001039', 'Mercado', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001040', 'Murallon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001041', 'Ogbac', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001042', 'Pawa', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001043', 'Pili', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001044', 'Poctoy', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001045', 'Poras', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001046', 'Puting Buhangin', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001047', 'Puyog', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001048', 'Sabong', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001049', 'San Miguel', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001050', 'Santol', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001051', 'Sawi', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001052', 'Tabi', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001053', 'Tabigue', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001054', 'Tagwak', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001055', 'Tambunan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001056', 'Tampus', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001057', 'Tanza', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001058', 'Tugos', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001059', 'Tumagabok', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001060', 'Tumapon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001061', 'Isok I', 'Boac', 'Marinduque', TRUE, NULL)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  municipality = EXCLUDED.municipality,
  province = EXCLUDED.province,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW();

INSERT INTO public.reference_groups (code, name, description) VALUES
  ('SEX_ASSIGNED_AT_BIRTH', 'Sex Assigned at Birth', 'Biological sex at birth'),
  ('SEX', 'Sex', 'Compatibility group for imports and reports'),
  ('CIVIL_STATUS', 'Civil Status', 'Legal civil status'),
  ('YOUTH_CLASSIFICATION', 'Youth Classification', 'Youth classification category'),
  ('YOUTH_AGE_GROUP', 'Youth Age Group', 'Age group bracket'),
  ('EDUCATIONAL_ATTAINMENT', 'Highest Educational Attainment', 'Highest level of education completed'),
  ('WORK_STATUS', 'Work Status', 'Current employment status')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO public.reference_options (group_code, code, label, sort_order) VALUES
  ('SEX_ASSIGNED_AT_BIRTH', 'MALE', 'Male', 1),
  ('SEX_ASSIGNED_AT_BIRTH', 'FEMALE', 'Female', 2),
  ('SEX', 'MALE', 'Male', 1),
  ('SEX', 'FEMALE', 'Female', 2),
  ('CIVIL_STATUS', 'SINGLE', 'Single', 1),
  ('CIVIL_STATUS', 'MARRIED', 'Married', 2),
  ('CIVIL_STATUS', 'WIDOWED', 'Widowed', 3),
  ('CIVIL_STATUS', 'SEPARATED', 'Separated', 4),
  ('CIVIL_STATUS', 'DIVORCED', 'Divorced', 5),
  ('YOUTH_CLASSIFICATION', 'IN_SCHOOL', 'In-School Youth', 1),
  ('YOUTH_CLASSIFICATION', 'OUT_OF_SCHOOL', 'Out-of-School Youth', 2),
  ('YOUTH_CLASSIFICATION', 'YOUTH_WHO_WORK', 'Youth Who Work', 3),
  ('YOUTH_CLASSIFICATION', 'YOUTH_WITH_DISABILITY', 'Youth with Disability', 4),
  ('YOUTH_CLASSIFICATION', 'YOUTH_IN_CONFLICT', 'Youth in Conflict with the Law', 5),
  ('YOUTH_CLASSIFICATION', 'INDIGENOUS_YOUTH', 'Indigenous Youth', 6),
  ('EDUCATIONAL_ATTAINMENT', 'NONE', 'None', 1),
  ('EDUCATIONAL_ATTAINMENT', 'ELEMENTARY', 'Elementary Level', 2),
  ('EDUCATIONAL_ATTAINMENT', 'ELEMENTARY_GRAD', 'Elementary Graduate', 3),
  ('EDUCATIONAL_ATTAINMENT', 'HIGH_SCHOOL', 'High School Level', 4),
  ('EDUCATIONAL_ATTAINMENT', 'HIGH_SCHOOL_GRAD', 'High School Graduate', 5),
  ('EDUCATIONAL_ATTAINMENT', 'SENIOR_HIGH', 'Senior High School Level', 6),
  ('EDUCATIONAL_ATTAINMENT', 'SENIOR_HIGH_GRAD', 'Senior High School Graduate', 7),
  ('EDUCATIONAL_ATTAINMENT', 'COLLEGE', 'College Level', 8),
  ('EDUCATIONAL_ATTAINMENT', 'COLLEGE_GRAD', 'College Graduate', 9),
  ('EDUCATIONAL_ATTAINMENT', 'POST_GRAD', 'Post Graduate', 10),
  ('WORK_STATUS', 'EMPLOYED', 'Employed', 1),
  ('WORK_STATUS', 'SELF_EMPLOYED', 'Self-Employed', 2),
  ('WORK_STATUS', 'UNEMPLOYED', 'Unemployed', 3),
  ('WORK_STATUS', 'STUDENT', 'Student', 4),
  ('WORK_STATUS', 'NON_WORKING', 'Not Working', 5)
ON CONFLICT (group_code, code) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO public.reference_options (group_code, code, label, sort_order, metadata) VALUES
  ('YOUTH_AGE_GROUP', 'CHILD_YOUTH', 'Child Youth (15-17)', 1, '{"minimum_age": 15, "maximum_age": 17}'::jsonb),
  ('YOUTH_AGE_GROUP', 'CORE_YOUTH', 'Core Youth (18-24)', 2, '{"minimum_age": 18, "maximum_age": 24}'::jsonb),
  ('YOUTH_AGE_GROUP', 'YOUNG_ADULT', 'Young Adult (25-30)', 3, '{"minimum_age": 25, "maximum_age": 30}'::jsonb)
ON CONFLICT (group_code, code) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  is_active = TRUE;

INSERT INTO public.categories (
  code,
  name,
  description,
  record_type,
  status,
  permission_mode,
  allow_sk_export
) VALUES (
  'KK_PROFILE',
  'KK Youth Profile',
  'Default youth profiling category for SK and LYDO records.',
  'YOUTH_PROFILE',
  'PUBLISHED',
  'SK_FILLABLE',
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  record_type = EXCLUDED.record_type,
  status = EXCLUDED.status,
  permission_mode = EXCLUDED.permission_mode,
  allow_sk_export = EXCLUDED.allow_sk_export,
  deleted_at = NULL;

CREATE OR REPLACE FUNCTION public.default_category_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.categories
  WHERE code = 'KK_PROFILE'
    AND deleted_at IS NULL
  LIMIT 1;
$$;

CREATE TABLE public.youth_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL DEFAULT public.default_category_id() REFERENCES public.categories(id),
  barangay_id UUID NOT NULL REFERENCES public.barangays(id),
  submission_batch_id UUID,
  display_name TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,
  ext_name TEXT,
  birth_date DATE NOT NULL,
  age_at_submission INTEGER,
  sex_assigned_at_birth_id UUID REFERENCES public.reference_options(id),
  sex_id UUID REFERENCES public.reference_options(id),
  civil_status_id UUID REFERENCES public.reference_options(id),
  youth_classification_id UUID REFERENCES public.reference_options(id),
  youth_age_group_id UUID REFERENCES public.reference_options(id),
  educational_attainment_id UUID REFERENCES public.reference_options(id),
  work_status_id UUID REFERENCES public.reference_options(id),
  email TEXT,
  contact_number TEXT,
  purok TEXT,
  is_registered_voter BOOLEAN,
  is_registered_sk_voter BOOLEAN,
  is_registered_national_voter BOOLEAN,
  voted_last_election BOOLEAN NOT NULL DEFAULT FALSE,
  attended_kk_assembly BOOLEAN NOT NULL DEFAULT FALSE,
  kk_assembly_count INTEGER NOT NULL DEFAULT 0 CHECK (kk_assembly_count >= 0),
  custom_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.record_status,
  youth_profile_status public.record_status,
  return_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID NULL REFERENCES public.profiles(id),
  submitted_by UUID NULL REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID NULL REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT youth_status_required CHECK (status IS NOT NULL AND youth_profile_status IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.sync_youth_profile_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  built_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL AND NEW.youth_profile_status IS NULL THEN
      NEW.status = 'DRAFT';
      NEW.youth_profile_status = 'DRAFT';
    ELSIF NEW.status IS NULL THEN
      NEW.status = NEW.youth_profile_status;
    ELSIF NEW.youth_profile_status IS NULL THEN
      NEW.youth_profile_status = NEW.status;
    ELSE
      NEW.youth_profile_status = NEW.status;
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.youth_profile_status = NEW.status;
    ELSIF NEW.youth_profile_status IS DISTINCT FROM OLD.youth_profile_status THEN
      NEW.status = NEW.youth_profile_status;
    END IF;
  END IF;

  IF NEW.suffix IS NULL AND NEW.ext_name IS NOT NULL THEN
    NEW.suffix = NEW.ext_name;
  ELSIF NEW.ext_name IS NULL AND NEW.suffix IS NOT NULL THEN
    NEW.ext_name = NEW.suffix;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.sex_assigned_at_birth_id IS NULL AND NEW.sex_id IS NOT NULL THEN
      NEW.sex_assigned_at_birth_id = NEW.sex_id;
    ELSIF NEW.sex_id IS NULL AND NEW.sex_assigned_at_birth_id IS NOT NULL THEN
      NEW.sex_id = NEW.sex_assigned_at_birth_id;
    END IF;
  ELSE
    IF NEW.sex_assigned_at_birth_id IS DISTINCT FROM OLD.sex_assigned_at_birth_id THEN
      NEW.sex_id = NEW.sex_assigned_at_birth_id;
    ELSIF NEW.sex_id IS DISTINCT FROM OLD.sex_id THEN
      NEW.sex_assigned_at_birth_id = NEW.sex_id;
    END IF;
  END IF;

  IF NEW.is_registered_voter IS NULL AND NEW.is_registered_sk_voter IS NULL THEN
    NEW.is_registered_voter = FALSE;
    NEW.is_registered_sk_voter = FALSE;
  ELSIF NEW.is_registered_voter IS NULL THEN
    NEW.is_registered_voter = NEW.is_registered_sk_voter;
  ELSIF NEW.is_registered_sk_voter IS NULL THEN
    NEW.is_registered_sk_voter = NEW.is_registered_voter;
  END IF;

  IF NEW.is_registered_national_voter IS NULL THEN
    NEW.is_registered_national_voter = FALSE;
  END IF;

  IF NEW.age_at_submission IS NULL AND NEW.birth_date IS NOT NULL THEN
    NEW.age_at_submission = date_part('year', age(CURRENT_DATE, NEW.birth_date))::INTEGER;
  END IF;

  IF NEW.display_name IS NULL OR btrim(NEW.display_name) = '' THEN
    built_name = btrim(concat_ws(' ', NULLIF(NEW.first_name, ''), NULLIF(NEW.middle_name, ''), NULLIF(NEW.last_name, ''), NULLIF(NEW.suffix, '')));
    NEW.display_name = COALESCE(NULLIF(built_name, ''), 'Youth Record');
  END IF;

  IF NEW.updated_by IS NULL THEN
    NEW.updated_by = NEW.created_by;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER youth_profiles_sync_compat
  BEFORE INSERT OR UPDATE ON public.youth_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_youth_profile_compat();

CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
  category_id UUID NOT NULL DEFAULT public.default_category_id() REFERENCES public.categories(id),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  status public.import_status NOT NULL DEFAULT 'UPLOADING',
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT import_batch_actor_required CHECK (uploaded_by IS NOT NULL OR created_by IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.sync_import_batch_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by = NEW.created_by;
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by = NEW.uploaded_by;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER import_batches_sync_compat
  BEFORE INSERT OR UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.sync_import_batch_compat();

CREATE TABLE public.import_row_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE,
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_valid BOOLEAN NOT NULL DEFAULT FALSE,
  validation_errors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  validation_warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  duplicate_match_id UUID REFERENCES public.youth_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT import_row_batch_required CHECK (batch_id IS NOT NULL OR import_batch_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.sync_import_row_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.batch_id IS NULL THEN
    NEW.batch_id = NEW.import_batch_id;
  END IF;

  IF NEW.import_batch_id IS NULL THEN
    NEW.import_batch_id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER import_rows_sync_compat
  BEFORE INSERT OR UPDATE ON public.import_row_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_import_row_compat();

ALTER TABLE public.youth_profiles
  ADD CONSTRAINT youth_profiles_submission_batch_fk
  FOREIGN KEY (submission_batch_id) REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience public.announcement_audience NOT NULL DEFAULT 'ALL',
  barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
  status public.announcement_status NOT NULL DEFAULT 'PUBLISHED',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER barangays_set_updated_at BEFORE UPDATE ON public.barangays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER category_fields_set_updated_at BEFORE UPDATE ON public.category_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reference_groups_set_updated_at BEFORE UPDATE ON public.reference_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reference_options_set_updated_at BEFORE UPDATE ON public.reference_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER youth_profiles_set_updated_at BEFORE UPDATE ON public.youth_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER import_batches_set_updated_at BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_profiles_role_status ON public.profiles(role, account_status);
CREATE INDEX idx_barangays_name ON public.barangays(name);
CREATE INDEX idx_categories_status ON public.categories(status, permission_mode) WHERE deleted_at IS NULL;
CREATE INDEX idx_category_fields_category ON public.category_fields(category_id, sort_order) WHERE is_active = TRUE;
CREATE INDEX idx_reference_options_group ON public.reference_options(group_code, is_active, sort_order);
CREATE INDEX idx_reference_options_category_code ON public.reference_options(category_code, is_active, sort_order);
CREATE INDEX idx_youth_profiles_barangay_status ON public.youth_profiles(barangay_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_youth_profiles_yps_status ON public.youth_profiles(barangay_id, youth_profile_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_youth_profiles_category ON public.youth_profiles(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_youth_profiles_search ON public.youth_profiles USING gin (to_tsvector('simple', coalesce(display_name, '')));
CREATE INDEX idx_import_batches_barangay ON public.import_batches(barangay_id, created_at DESC);
CREATE INDEX idx_import_rows_batch ON public.import_row_results(batch_id, row_number);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_announcements_visible ON public.announcements(status, audience, barangay_id, expires_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT p.role::TEXT
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.account_status = 'ACTIVE'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(public.current_account_role() = 'ADMIN', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.current_barangay_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT a.barangay_id
  FROM public.account_barangay_assignments a
  WHERE a.profile_id = auth.uid()
    AND a.is_active = TRUE
  ORDER BY a.started_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_category(category_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = category_id
      AND c.deleted_at IS NULL
      AND (
        public.is_admin()
        OR (
          c.status = 'PUBLISHED'
          AND c.permission_mode <> 'ADMIN_ONLY'
          AND c.permission_mode <> 'PRIVATE'
        )
      )
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_barangay_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_row_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (public.is_admin() OR id = auth.uid());
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY profiles_update_admin_or_self ON public.profiles
  FOR UPDATE USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (public.is_admin() OR id = auth.uid());

CREATE POLICY barangays_select_active ON public.barangays
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY barangays_write_admin ON public.barangays
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY assignments_select ON public.account_barangay_assignments
  FOR SELECT USING (public.is_admin() OR profile_id = auth.uid());
CREATE POLICY assignments_write_admin ON public.account_barangay_assignments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY categories_select ON public.categories
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      public.is_admin()
      OR (status = 'PUBLISHED' AND permission_mode <> 'ADMIN_ONLY' AND permission_mode <> 'PRIVATE')
    )
  );
CREATE POLICY categories_write_admin ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY category_fields_select ON public.category_fields
  FOR SELECT USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.categories c
      WHERE c.id = category_fields.category_id
        AND c.deleted_at IS NULL
        AND (
          public.is_admin()
          OR (c.status = 'PUBLISHED' AND c.permission_mode <> 'ADMIN_ONLY' AND c.permission_mode <> 'PRIVATE')
        )
    )
  );
CREATE POLICY category_fields_write_admin ON public.category_fields
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY reference_groups_select ON public.reference_groups
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY reference_groups_write_admin ON public.reference_groups
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY reference_options_select ON public.reference_options
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY reference_options_write_admin ON public.reference_options
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY youth_profiles_select ON public.youth_profiles
  FOR SELECT USING (
    public.is_admin()
    OR (
      barangay_id = public.current_barangay_id()
      AND public.can_access_category(category_id)
      AND deleted_at IS NULL
    )
  );
CREATE POLICY youth_profiles_insert ON public.youth_profiles
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      barangay_id = public.current_barangay_id()
      AND public.can_access_category(category_id)
    )
  );
CREATE POLICY youth_profiles_update ON public.youth_profiles
  FOR UPDATE USING (
    public.is_admin()
    OR (
      barangay_id = public.current_barangay_id()
      AND public.can_access_category(category_id)
      AND status IN ('DRAFT', 'RETURNED', 'SUBMITTED')
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      barangay_id = public.current_barangay_id()
      AND public.can_access_category(category_id)
    )
  );

CREATE POLICY import_batches_select ON public.import_batches
  FOR SELECT USING (public.is_admin() OR barangay_id = public.current_barangay_id());
CREATE POLICY import_batches_insert ON public.import_batches
  FOR INSERT WITH CHECK (public.is_admin() OR barangay_id = public.current_barangay_id());
CREATE POLICY import_batches_update ON public.import_batches
  FOR UPDATE USING (public.is_admin() OR barangay_id = public.current_barangay_id())
  WITH CHECK (public.is_admin() OR barangay_id = public.current_barangay_id());

CREATE POLICY import_rows_select ON public.import_row_results
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_row_results.batch_id
        AND b.barangay_id = public.current_barangay_id()
    )
  );
CREATE POLICY import_rows_insert ON public.import_row_results
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_row_results.batch_id
        AND b.barangay_id = public.current_barangay_id()
    )
  );
CREATE POLICY import_rows_update ON public.import_row_results
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_row_results.batch_id
        AND b.barangay_id = public.current_barangay_id()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_row_results.batch_id
        AND b.barangay_id = public.current_barangay_id()
    )
  );

CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT USING (public.is_admin());
CREATE POLICY audit_logs_insert_authenticated ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (
    status = 'PUBLISHED'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      audience = 'ALL'
      OR audience::TEXT = public.current_account_role()
      OR public.is_admin()
    )
    AND (
      barangay_id IS NULL
      OR barangay_id = public.current_barangay_id()
      OR public.is_admin()
    )
  );
CREATE POLICY announcements_write_admin ON public.announcements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

-- Bootstrap after you create an admin user in Supabase Auth:
-- Replace the UUID with the Auth user id, then run this separately if needed.
-- INSERT INTO public.profiles (id, full_name, role, account_status, must_change_password)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'System Administrator', 'ADMIN', 'ACTIVE', FALSE)
-- ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', account_status = 'ACTIVE', must_change_password = FALSE;
