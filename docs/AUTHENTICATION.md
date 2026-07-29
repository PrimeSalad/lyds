# Authentication and account passwords

The application uses Supabase Auth for email/password login plus mandatory authenticator-app two-factor authentication (TOTP). It does not contain a hardcoded `test` account or a generated default password.

## Sign-in flow

1. The login page calls `supabase.auth.signInWithPassword()` with the registered email and password.
2. A new account must enroll a TOTP authenticator by scanning the QR code and verifying a six-digit code. An enrolled account must enter a current code on each new password session.
3. Supabase upgrades the session from `aal1` to `aal2` only after the second factor succeeds.
4. The frontend API client sends the access token to `/api/v1/*`. The backend verifies the token and rejects every protected request that is not `aal2`.
5. Restrictive database RLS policies also require the JWT `aal` claim to be `aal2` for direct browser access. Existing role and barangay policies remain in force.
6. The backend loads the corresponding profile, rejects inactive accounts, and loads the active barangay assignment for an `SK_OFFICIAL`.

The frontend redirects unauthenticated users to `/login`. Administrator-only screens are protected by both frontend routing and backend `requireAdmin` middleware.

## Creating an account and its password

An administrator opens **SK Accounts → Add Account** and enters:

- the account email;
- the account holder's details and role;
- a temporary password of 12–72 characters with upper- and lowercase letters, a number, and one of `!@#$%^&*`, entered twice;
- a barangay assignment when the role is `SK_OFFICIAL`.

That exact temporary password is the new account's first password—there is no separate hidden or automatically generated password. The server creates the Supabase Auth user and profile together; if profile creation fails, it removes the partially created auth user.

Share temporary passwords through a private channel. Never place them in source control, audit notes, screenshots, or issue comments. The account is forced to replace its temporary password after completing 2FA.

## Changing or resetting a password

- Any signed-in user can set a new password under **Account Settings** after entering the current password.
- An administrator can open an existing account's edit screen and set a new temporary password. Leaving both password fields blank keeps the current password.
- Passwords must contain 12–72 characters with all required character groups.

The system never displays an existing password because Supabase stores password verifiers, not recoverable plaintext passwords.

## Two-factor recovery

If an account holder loses the authenticator device, a different administrator can use **SK Accounts → Reset 2FA**. The action removes the enrolled factors, is recorded in the audit log, and forces fresh enrollment on the next password sign-in. Self-reset is blocked so a signed-in administrator cannot remove their own second factor. Confirm the account holder's identity outside the system before using this recovery control.

## Sessions

- The browser signs out locally after 30 minutes without keyboard or pointer activity. Configure this with `VITE_SESSION_IDLE_TIMEOUT_MINUTES`.
- Supabase access tokens expire after one hour and refresh-token rotation remains enabled.
- Normal sign-out revokes the Supabase session. Protected API and database access require a current AAL2 access token.

## Deactivation and deletion

- **Deactivate** immediately blocks application access while preserving the account and its historical references. It can be reversed.
- **Delete permanently** removes the Supabase login, profile, barangay assignment, audit entries, import files/results, and youth records created by that account when those youth records have never been approved. Self-deletion is blocked.
- An account that created an approved youth record cannot be permanently deleted. Deactivate it instead so the approved record and its accountable history remain intact.
- Yearly child laborer records are statutory data rather than account-owned drafts, so deleting an operator account retains those rows and safely clears their creator/updater attribution links. The records remain protected by barangay scope, MFA, and audit controls.

## Environment variables

Frontend (`frontend/.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`
- `VITE_SESSION_IDLE_TIMEOUT_MINUTES`

Backend (`backend/.env`):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `FRONTEND_URL` / `CORS_ORIGINS`
- `API_RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX_REQUESTS`
- `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` only for authenticated infrastructure scripts

Do not expose `SUPABASE_SECRET_KEY` to the frontend. Production values belong in the deployment platform's secret manager, not committed files.
