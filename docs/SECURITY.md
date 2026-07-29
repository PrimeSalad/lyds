# Security controls and operations

This system uses defense in depth. The browser improves the user journey, but the Express API and PostgreSQL row-level security remain authoritative.

## Identity and access

- Email/password authentication is provided by Supabase Auth; public signup and anonymous users are disabled.
- TOTP authenticator 2FA is mandatory for every administrator and SK official. Protected access requires an `aal2` JWT.
- The frontend guard blocks protected routes before MFA, the API returns `403 MFA_REQUIRED` for non-AAL2 tokens, and restrictive RLS policies deny direct data access without AAL2.
- Backend role and active-account checks are applied after token verification. Existing admin and barangay-scope RLS policies still restrict accessible rows.
- A different administrator can reset lost 2FA factors. Self-reset is blocked and every recovery reset is audited.

## Passwords and sessions

- Passwords are 12–72 characters and require lowercase, uppercase, numeric, and approved special-character groups.
- New and administrator-reset accounts must replace the temporary password. A password change requires the current password.
- Refresh-token rotation is enabled with a short reuse interval; access tokens expire after one hour.
- The frontend signs out an inactive browser session after 30 minutes by default.
- Supabase sends security notifications for password, email, linked identity, and MFA enrollment changes.

## API, browser, and data protection

- All protected API routes verify Supabase tokens server-side and require AAL2. Admin-only routes add a separate role check.
- Express applies global IP-based abuse limiting, bounded JSON bodies, an explicit CORS allowlist, Helmet headers, and generic provider-error responses.
- Vercel responses set CSP, HSTS, MIME-sniffing protection, clickjacking denial, strict referrer and permissions policies, and cross-origin isolation headers.
- The frontend shell loads its fonts and scripts from the same origin; no third-party font or inline speculative script is required.
- Incoming direct PostgreSQL and pooler connections must use SSL; Supabase HTTP APIs enforce HTTPS independently.
- RLS is enabled on every application table. Service-role credentials remain backend-only and are never included in browser variables.
- Child laborer records receive the same AAL2 gate plus independent administrator/assigned-barangay RLS policies. The API repeats barangay scoping before every list, read, write, summary, archive, restore, and export operation.
- Child laborer records use non-destructive archival, optimistic versions, duplicate detection, bounded validated fields, immutable database-trigger audit snapshots, and formula-injection neutralization for CSV/XLSX exports.
- Operator-account deletion cannot erase protected child records or become blocked by their attribution foreign keys; creator/updater links are safely detached while the annual record remains restricted and auditable.
- Database function search paths are pinned, and privileged security-definer maintenance functions are executable only by trusted backend/database roles.
- Permanent account deletion is guarded: only unapproved data can be erased; approved records preserve accountability and require deactivation instead.
- Audit logs capture account security and data-workflow actions and cannot be updated or deleted through normal RLS access.

## Operational checks

Run these before a security-sensitive deployment:

```powershell
npm test
npm run auth:harden:check
npm run db:verify
npm run db:sync:dry
```

Apply reviewed pending database migrations with `npm run db:sync`. Apply the expected Supabase Auth settings with `npm run auth:harden`. Store `SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`, and database credentials only in the deployment platform secret manager or uncommitted backend environment file.

If an authenticator device is lost, verify the account holder through an approved out-of-band process before using **Reset 2FA**. Review audit logs after recovery and any suspected incident.

## Platform-dependent controls

The live Supabase Security Advisor has one remaining warning: breached-password screening through Have I Been Pwned is available only on Supabase Pro and above. The current controls compensate with a 12-character multi-group password policy, mandatory TOTP, and rate limiting, but upgrading the project and enabling leaked-password protection is still recommended. CAPTCHA likewise requires provider credentials and a coordinated frontend setup; do not enable it until those credentials and the challenge widget are ready.
