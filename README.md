# SK Youth Information Management System

Web application for administering barangays, SK accounts, annual youth records, spreadsheet imports, review workflows, announcements, audit logs, and aggregate reports.

## Production

- Frontend: [lyds-boac-2026.vercel.app](https://lyds-boac-2026.vercel.app)
- API health: [lyds-boac-api-2026.onrender.com/api/v1/health](https://lyds-boac-api-2026.onrender.com/api/v1/health)

## Stack

- React 19, TypeScript, Vite, Chakra UI, Redux Toolkit, and React Router
- Express 5 API with Zod validation and an MVC/module structure
- Supabase Auth and PostgreSQL
- Vitest for unit/integration tests and Playwright for browser journeys
- OpenAPI as the API contract source of truth

## Local setup

Requirements: Node.js 24+ and npm 10+.

1. Install the root tools and both applications:

   ```powershell
   npm install
   npm run install:all
   ```

2. Create local environment files:

   ```powershell
   Copy-Item frontend/.env.example frontend/.env
   Copy-Item backend/.env.example backend/.env
   ```

3. Fill in the Supabase URL and public/server keys in those files.
4. Start the API and frontend in separate terminals:

   ```powershell
   npm run dev:backend
   npm run dev:frontend
   ```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000/api/v1`.

There is no hardcoded default login. An administrator creates an account from **SK Accounts → Add Account** and explicitly sets a strong temporary password. At first sign-in, the account holder must enroll an authenticator app, complete two-factor verification, and replace the temporary password.

## Commands

| Goal | Command |
|---|---|
| Start frontend | `npm run dev:frontend` |
| Start backend | `npm run dev:backend` |
| Lint | `npm run lint` |
| Type-check | `npm run type-check` |
| Unit/integration tests | `npm run test:unit` |
| Browser tests | `npm run test:e2e` |
| Full validation | `npm test` |
| Production builds | `npm run build` |
| Regenerate OpenAPI types | `npm run gen:api-types` |
| Verify Supabase schema/data access | `npm run db:verify` |
| Preview database synchronization | `npm run db:sync:dry` |
| Verify Supabase Auth hardening | `npm run auth:harden:check` |

Install Chromium once before running browser tests:

```powershell
npm exec --prefix frontend -- playwright install chromium
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Authentication and account passwords](docs/AUTHENTICATION.md)
- [Security controls and operations](docs/SECURITY.md)
- [API and OpenAPI workflow](docs/API.md)
- [Script reference](docs/SCRIPTS.md)
- [Contributing](docs/CONTRIBUTING.md)

Database migrations live in `supabase/migrations/`. Generated API types live in `frontend/src/generated/api/` and must not be edited manually.
