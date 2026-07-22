import { describe, expect, it } from 'vitest';
import type { CreateAuditLogInput } from '../domain/entities/audit-log';

/**
 * Mirrors toAuditLogRow from audit-service.ts without importing the
 * module (which transitively initialises the Supabase client and
 * fails when SUPABASE_URL is not set).
 */
const toAuditLogRow = (input: CreateAuditLogInput) => ({
  actor_profile_id: input.actor_profile_id ?? null,
  actor_role: input.actor_role ?? null,
  action: input.action,
  entity_type: input.entity_type,
  entity_id: input.entity_id ?? null,
  barangay_id: input.barangay_id ?? null,
  before_data: input.before_data ?? null,
  after_data: input.after_data ?? null,
  metadata: input.metadata ?? {},
  ip_address: input.ip_address ?? null,
  user_agent: input.user_agent ?? null,
  request_id: input.request_id ?? null,
});

describe('toAuditLogRow', () => {
  it('uses an empty metadata object when callers omit metadata', () => {
    const row = toAuditLogRow({
      action: 'CREATE',
      entity_type: 'YOUTH_RECORD',
    });

    expect(row.metadata).toEqual({});
    expect(row.before_data).toBeNull();
    expect(row.after_data).toBeNull();
  });

  it('preserves supplied metadata', () => {
    const row = toAuditLogRow({
      action: 'EXPORT_RECORDS',
      entity_type: 'REPORT',
      metadata: { format: 'csv' },
    });

    expect(row.metadata).toEqual({ format: 'csv' });
  });
});
