-- Categories, Category Fields, Reference Groups, Reference Options

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  record_type TEXT NOT NULL,
  status category_status NOT NULL DEFAULT 'DRAFT',
  permission_mode category_permission_mode NOT NULL DEFAULT 'ADMIN_ONLY',
  allow_sk_export BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- Category Fields (custom fields per category)
CREATE TABLE category_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type custom_field_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  help_text TEXT NULL,
  options JSONB NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, field_key, version)
);

-- Reference Groups
CREATE TABLE reference_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reference Options
CREATE TABLE reference_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT NOT NULL REFERENCES reference_groups(code),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_code, code)
);

-- Indexes
CREATE INDEX idx_categories_status ON categories (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_category_fields_category ON category_fields (category_id, is_active);
CREATE INDEX idx_reference_options_group ON reference_options (group_code, is_active);

-- Triggers
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_category_fields_updated_at
  BEFORE UPDATE ON category_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
