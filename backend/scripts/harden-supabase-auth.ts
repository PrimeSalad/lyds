import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desiredConfig = {
  disable_signup: true,
  external_anonymous_users_enabled: false,
  mfa_totp_enroll_enabled: true,
  mfa_totp_verify_enabled: true,
  mfa_phone_enroll_enabled: false,
  mfa_phone_verify_enabled: false,
  mfa_max_enrolled_factors: 1,
  password_min_length: 12,
  password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()_+-=[]{};'\\\\:\"|<>?,./`~",
  security_update_password_require_reauthentication: true,
  refresh_token_rotation_enabled: true,
  security_refresh_token_reuse_interval: 10,
  mailer_notifications_password_changed_enabled: true,
  mailer_notifications_email_changed_enabled: true,
  mailer_notifications_identity_linked_enabled: true,
  mailer_notifications_identity_unlinked_enabled: true,
  mailer_notifications_mfa_factor_enrolled_enabled: true,
  mailer_notifications_mfa_factor_unenrolled_enabled: true,
} as const;

const getProjectRef = () => {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const match = process.env.SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
  if (!match?.[1]) throw new Error('Set SUPABASE_PROJECT_REF or a valid SUPABASE_URL.');
  return match[1];
};

const requestConfig = async (method: 'GET' | 'PATCH', body?: typeof desiredConfig) => {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Set SUPABASE_ACCESS_TOKEN to inspect or update the Auth configuration.');

  const response = await fetch(`https://api.supabase.com/v1/projects/${getProjectRef()}/config/auth`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const providerError = await response.json().catch(() => null) as { message?: unknown; error?: unknown } | null;
    const detail = typeof providerError?.message === 'string'
      ? providerError.message
      : typeof providerError?.error === 'string' ? providerError.error : 'Request rejected.';
    throw new Error(`Supabase Auth configuration request failed (${response.status}): ${detail}`);
  }
  return await response.json() as Record<string, unknown>;
};

const requestSslEnforcement = async (method: 'GET' | 'PUT') => {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Set SUPABASE_ACCESS_TOKEN to inspect or update SSL enforcement.');

  const response = await fetch(`https://api.supabase.com/v1/projects/${getProjectRef()}/ssl-enforcement`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: method === 'PUT' ? JSON.stringify({ requestedConfig: { database: true } }) : undefined,
  });
  if (!response.ok) throw new Error(`Supabase SSL enforcement request failed (${response.status}).`);
  return await response.json() as { currentConfig?: { database?: boolean } };
};

const requestSecurityAdvisors = async () => {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Set SUPABASE_ACCESS_TOKEN to inspect the security advisors.');
  const response = await fetch(`https://api.supabase.com/v1/projects/${getProjectRef()}/advisors/security`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Supabase Security Advisor request failed (${response.status}).`);
  return await response.json() as { lints?: Array<{ name?: string; level?: string }> };
};

export const hardenSupabaseAuth = async (checkOnly = false) => {
  if (!checkOnly) await requestConfig('PATCH', desiredConfig);
  if (!checkOnly) await requestSslEnforcement('PUT');
  const actual = await requestConfig('GET');
  const ssl = await requestSslEnforcement('GET');
  const advisors = await requestSecurityAdvisors();

  const mismatches = Object.entries(desiredConfig)
    .filter(([key, expected]) => actual[key] !== expected)
    .map(([key]) => key);

  if (mismatches.length > 0) {
    throw new Error(`Supabase Auth hardening check failed for: ${mismatches.join(', ')}`);
  }
  if (ssl.currentConfig?.database !== true) {
    throw new Error('Supabase database SSL enforcement is not enabled.');
  }

  const unexpectedAdvisors = (advisors.lints ?? [])
    .filter((lint) => lint.name !== 'auth_leaked_password_protection')
    .map((lint) => lint.name ?? lint.level ?? 'unknown');
  if (unexpectedAdvisors.length > 0) {
    throw new Error(`Supabase Security Advisor reported: ${unexpectedAdvisors.join(', ')}`);
  }

  console.log(`Supabase security hardening verified (${Object.keys(desiredConfig).length} Auth controls and database SSL).`);
  if ((advisors.lints ?? []).some((lint) => lint.name === 'auth_leaked_password_protection')) {
    console.log('Security Advisor note: leaked-password protection requires Supabase Pro or above.');
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  hardenSupabaseAuth(process.argv.includes('--check')).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
