-- Import Batches, Import Row Results, and Audit Logs

-- Import Batches
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  barangay_id UUID NOT NULL REFERENCES barangays(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  status import_status NOT NULL DEFAULT 'PENDING',
  created_by UUID NOT NULL REFERENCES profiles(id),
  committed_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ NULL
);

-- Import Row Results
CREATE TABLE import_row_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB NULL,
  validation_errors JSONB NULL,
  validation_warnings JSONB NULL,
  duplicate_match_id UUID NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID NULL REFERENCES profiles(id),
  actor_role TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  barangay_id UUID NULL,
  before_data JSONB NULL,
  after_data JSONB NULL,
  metadata JSONB NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  request_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_import_batches_barangay ON import_batches (barangay_id, created_at);
CREATE INDEX idx_import_batches_category ON import_batches (category_id);
CREATE INDEX idx_import_row_results_batch ON import_row_results (import_batch_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_profile_id, created_at);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);
