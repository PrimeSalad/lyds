-- Row Level Security Helper Functions

-- Get the current user's profile ID from the JWT
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$;

-- Get the current user's role from the profiles table
CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS TEXT
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = public.current_profile_id();
$$;

-- Check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_account_role() = 'ADMIN';
$$;

-- Get the current user's active barangay assignment
CREATE OR REPLACE FUNCTION public.current_barangay_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barangay_id
  FROM public.account_barangay_assignments
  WHERE profile_id = public.current_profile_id()
    AND is_active = true
  LIMIT 1;
$$;

-- Check if the current user can access a specific category
CREATE OR REPLACE FUNCTION public.can_access_category(p_category_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = p_category_id
      AND deleted_at IS NULL
      AND (
        public.is_admin()
        OR (
          status = 'PUBLISHED'
          AND permission_mode IN ('SK_FILLABLE', 'SK_VIEW_ONLY')
        )
      )
  );
$$;
