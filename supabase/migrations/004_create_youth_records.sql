-- Youth Profiles and Custom Values

CREATE TABLE youth_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  barangay_id UUID NOT NULL REFERENCES barangays(id),
  submission_batch_id UUID NULL,

  display_name TEXT NOT NULL,
  first_name TEXT NULL,
  middle_name TEXT NULL,
  last_name TEXT NULL,
  suffix TEXT NULL,

  birth_date DATE NOT NULL,
  age_at_submission INTEGER NOT NULL,

  sex_assigned_at_birth_id UUID NULL REFERENCES reference_options(id),
  civil_status_id UUID NULL REFERENCES reference_options(id),
  youth_classification_id UUID NULL REFERENCES reference_options(id),
  youth_age_group_id UUID NULL REFERENCES reference_options(id),
  educational_attainment_id UUID NULL REFERENCES reference_options(id),
  work_status_id UUID NULL REFERENCES reference_options(id),

  email TEXT NULL,
  contact_number TEXT NULL,

  is_registered_voter BOOLEAN NULL,
  voted_last_election BOOLEAN NULL,
  attended_kk_assembly BOOLEAN NOT NULL DEFAULT false,
  kk_assembly_count INTEGER NOT NULL DEFAULT 0,

  status record_status NOT NULL DEFAULT 'DRAFT',
  return_reason TEXT NULL,

  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID NOT NULL REFERENCES profiles(id),
  submitted_by UUID NULL REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ NULL,
  approved_by UUID NULL REFERENCES profiles(id),
  approved_at TIMESTAMPTZ NULL,

  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- Custom field values
CREATE TABLE youth_profile_custom_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_profile_id UUID NOT NULL REFERENCES youth_profiles(id) ON DELETE CASCADE,
  category_field_id UUID NOT NULL REFERENCES category_fields(id),
  value JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(youth_profile_id, category_field_id)
);

-- Indexes for youth_profiles
CREATE INDEX idx_youth_profiles_barangay ON youth_profiles (barangay_id);
CREATE INDEX idx_youth_profiles_category ON youth_profiles (category_id);
CREATE INDEX idx_youth_profiles_status ON youth_profiles (status);
CREATE INDEX idx_youth_profiles_birth_date ON youth_profiles (birth_date);
CREATE INDEX idx_youth_profiles_age_group ON youth_profiles (youth_age_group_id);
CREATE INDEX idx_youth_profiles_classification ON youth_profiles (youth_classification_id);
CREATE INDEX idx_youth_profiles_education ON youth_profiles (educational_attainment_id);
CREATE INDEX idx_youth_profiles_work ON youth_profiles (work_status_id);
CREATE INDEX idx_youth_profiles_voter ON youth_profiles (is_registered_voter);
CREATE INDEX idx_youth_profiles_assembly ON youth_profiles (attended_kk_assembly);
CREATE INDEX idx_youth_profiles_created ON youth_profiles (created_at);
CREATE INDEX idx_youth_profiles_barangay_category_status ON youth_profiles (barangay_id, category_id, status);
CREATE INDEX idx_youth_profiles_barangay_name ON youth_profiles (barangay_id, lower(display_name));
CREATE INDEX idx_youth_profiles_custom_values ON youth_profile_custom_values (youth_profile_id);

-- Triggers
CREATE TRIGGER set_youth_profiles_updated_at
  BEFORE UPDATE ON youth_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_youth_profile_custom_values_updated_at
  BEFORE UPDATE ON youth_profile_custom_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
