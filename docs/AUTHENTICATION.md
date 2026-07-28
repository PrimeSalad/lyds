# Authentication and account passwords

The application uses Supabase Auth for email/password login. It does not contain a hardcoded `test` account or a generated default password.

## Sign-in flow

1. The login page calls `supabase.auth.signInWithPassword()` with the registered email and password.
2. Supabase stores the browser session.
3. The frontend API client reads the access token and sends it as a bearer token to `/api/v1/*`.
4. Backend `requireAuth` verifies the token with Supabase, loads the corresponding profile, rejects inactive accounts, and loads the active barangay assignment for an `SK_OFFICIAL`.

The frontend redirects unauthenticated users to `/login`. Administrator-only screens are protected by both frontend routing and backend `requireAdmin` middleware.

## Creating an account and its password

An administrator opens **SK Accounts → Add Account** and enters:

- the account email;
- the account holder's details and role;
- a temporary password of 8–72 characters, entered twice;
- a barangay assignment when the role is `SK_OFFICIAL`.

That exact temporary password is the new account's first password—there is no separate hidden or automatically generated password. The server creates the Supabase Auth user and profile together; if profile creation fails, it removes the partially created auth user.

Share temporary passwords through a private channel. Never place them in source control, audit notes, screenshots, or issue comments.

## Changing or resetting a password

- Any signed-in user can set a new password under **Account Settings**.
- An administrator can open an existing account's edit screen and set a new temporary password. Leaving both password fields blank keeps the current password.
- Passwords must contain 8–72 characters.

The system never displays an existing password because Supabase stores password verifiers, not recoverable plaintext passwords.

## Deactivation and deletion

- **Deactivate** immediately blocks application access while preserving the account and its historical references. It can be reversed.
- **Delete permanently** removes the Supabase login; the database profile and assignments are removed by configured cascades. Self-deletion is blocked.
- If linked data prevents permanent removal, deactivate the account instead.

## Environment variables

Frontend (`frontend/.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`

Backend (`backend/.env`):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `FRONTEND_URL` / `CORS_ORIGINS`

Do not expose `SUPABASE_SECRET_KEY` to the frontend. Production values belong in the deployment platform's secret manager, not committed files.
