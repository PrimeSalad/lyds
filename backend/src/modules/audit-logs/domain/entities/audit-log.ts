export interface AuditLog {
  id: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  barangay_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
}

export interface CreateAuditLogInput {
  actor_profile_id?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  barangay_id?: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
}
