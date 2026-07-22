-- Profiles, Barangays, and Account Barangay Assignments

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role account_role NOT NULL,
  account_status account_status NOT NULL DEFAULT 'ACTIVE',
  position_title TEXT NULL,
  contact_number TEXT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL
);

-- Barangays table
CREATE TABLE barangays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  municipality TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: barangay name within municipality
CREATE UNIQUE INDEX idx_barangays_name_municipality
  ON barangays (name, municipality)
  WHERE deleted_at IS NULL;

-- Account Barangay Assignments
CREATE TABLE account_barangay_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barangay_id UUID NOT NULL REFERENCES barangays(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active assignment per profile
CREATE UNIQUE INDEX idx_one_active_assignment_per_profile
  ON account_barangay_assignments (profile_id)
  WHERE is_active = true;

-- Indexes for assignment lookups
CREATE INDEX idx_assignments_profile_active
  ON account_barangay_assignments (profile_id, is_active);

CREATE INDEX idx_assignments_barangay_active
  ON account_barangay_assignments (barangay_id, is_active);

-- Trigger to auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_barangays_updated_at
  BEFORE UPDATE ON barangays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
