import { createClient } from '@supabase/supabase-js';

// Server-only admin client (secret key) — account management, invitations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

// User-scoped client — RLS applies (for data access)
// Created per-request with the user's bearer token
export const createSupabaseUserClient = (accessToken: string) => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );
};
