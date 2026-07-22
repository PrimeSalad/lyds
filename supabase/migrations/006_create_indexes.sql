-- Additional Indexes (beyond those created inline in table definitions)

-- These are covered by inline CREATE INDEX statements in the migration files:
-- youth_profiles: barangay_id, category_id, status, birth_date, age_group, classification, education, work, voter, assembly, created_at
-- youth_profiles: composite (barangay_id, category_id, status), (barangay_id, lower(display_name))
-- account_barangay_assignments: (profile_id, is_active), (barangay_id, is_active)
-- audit_logs: (entity_type, entity_id), (actor_profile_id, created_at)
-- import_batches: (barangay_id, created_at), (category_id)
-- category_fields: (category_id, is_active)
-- reference_options: (group_code, is_active)
-- youth_profile_custom_values: (youth_profile_id)

-- No additional indexes needed beyond what's already created.
