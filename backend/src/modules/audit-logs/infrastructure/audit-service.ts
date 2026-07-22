import { supabaseAdmin } from '../../../config/supabase';
import type { AuditLog, CreateAuditLogInput } from '../domain/entities/audit-log';

const TABLE = 'audit_logs';

export const toAuditLogRow = (input: CreateAuditLogInput) => ({
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

export const auditService = {
  async log(input: CreateAuditLogInput): Promise<AuditLog> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(toAuditLogRow(input))
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findAll(options: {
    page?: number;
    pageSize?: number;
    entity_type?: string;
    action?: string;
  } = {}): Promise<{ data: AuditLog[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from(TABLE)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (options.entity_type) {
      query = query.eq('entity_type', options.entity_type);
    }
    if (options.action) {
      query = query.eq('action', options.action);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data ?? [],
      total: count ?? 0,
    };
  },

  async findById(id: string): Promise<AuditLog | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },
};
