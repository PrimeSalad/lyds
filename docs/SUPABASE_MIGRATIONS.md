# Supabase migrations

Database changes live in `supabase/migrations/` and deploy through the Supabase CLI. Do not paste new schema changes into the remote SQL Editor; direct remote edits bypass migration history.

## One-time setup for the existing project

1. Add `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF` to `backend/.env`.
2. Run `npm run db:baseline` once. This verifies the existing schema, records legacy migrations `001` through `011` as already applied, and applies migrations `012` onward.
3. Run `npm run db:verify` to confirm the runtime schema and all 61 official Boac barangays.

The baseline command is specifically for the existing database that was originally created through the SQL Editor. Do not use it for a blank project.

## Normal workflow

- `npm run db:sync:dry` previews pending remote migrations.
- `npm run db:sync` verifies the schema, links the configured project, applies pending migrations, and verifies again.
- New migration files must be additive and idempotent where practical.
- Destructive reset utilities belong in `supabase/manual/`, never in `supabase/migrations/`.

The `Supabase Migrations` GitHub Actions workflow runs automatically when migration files reach `main`. Configure its production environment with the five Supabase secrets used in the workflow.
