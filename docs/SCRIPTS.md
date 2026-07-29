# Available scripts

Run these commands from the repository root unless noted otherwise.

## Installation and development

| Command | Purpose |
|---|---|
| `npm install` | Install root tooling used for OpenAPI generation. |
| `npm run install:all` | Clean-install frontend and backend dependencies from their lockfiles. |
| `npm run dev:frontend` | Start Vite at `http://localhost:5173`. |
| `npm run dev:backend` | Start the Express API at `http://localhost:4000`. |

The two development servers run separately. Copy each application's `.env.example` to `.env` and configure Supabase before using live data.

## Quality and tests

| Command | Purpose |
|---|---|
| `npm run lint` | Lint frontend and backend. |
| `npm run type-check` | Type-check frontend and backend without emitting files. |
| `npm run test:frontend` | Run frontend Vitest tests. |
| `npm run test:backend` | Run backend Vitest tests. |
| `npm run test:unit` | Run both Vitest suites. |
| `npm run test:e2e` | Run Playwright against an automatically managed Vite server on port 5173. |
| `npm test` | Run lint, type-checking, unit/integration tests, and Playwright. |

Install the browser binary once with:

```powershell
npm exec --prefix frontend -- playwright install chromium
```

Playwright supplies non-secret test-only environment values and mocks Supabase/API network calls. A live backend or production credentials are not required for the browser suite.

## Build and API generation

| Command | Purpose |
|---|---|
| `npm run build` | Build the frontend and compile the backend to their respective `dist/` folders. |
| `npm run gen:api-types` | Generate frontend types from `docs/openapi.yaml`. |

Never hand-edit `frontend/src/generated/api/openapi.generated.ts`.

## Database operations

| Command | Purpose |
|---|---|
| `npm run db:verify` | Verify Supabase connectivity and expected schema/data access. |
| `npm run db:sync:dry` | Preview pending migration synchronization without applying it. |
| `npm run db:sync` | Apply pending synchronization. Review the dry run first. |
| `npm run db:baseline` | Mark an existing compatible database as the migration baseline. |
| `npm run auth:harden:check` | Read and verify the expected Supabase Auth controls and database SSL enforcement. |
| `npm run auth:harden` | Apply and verify signup, MFA, password, refresh-token, security-notification, and database SSL controls. |

Database commands use `backend/.env` and may affect the configured Supabase project. Prefer the read-only verification and dry-run commands during routine validation.

The Auth hardening commands use the Supabase Management API and require `SUPABASE_ACCESS_TOKEN` plus `SUPABASE_PROJECT_REF` in `backend/.env`. They never print keys or secret configuration values.

## Pre-commit workflow

```powershell
npm test
npm run build
npm run db:verify
npm run db:sync:dry
```

GitHub Actions runs the full test suite and both production builds on pull requests and pushes to `main`.
