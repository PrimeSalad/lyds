# Architecture

## Overview

The SK Youth Information Management System is split into a React single-page application and an Express API. Supabase provides email/password authentication and PostgreSQL storage.

```text
Browser (React/Vite, port 5173)
  ├─ Supabase Auth: login, logout, password update
  └─ Bearer-token API requests
             │
             ▼
Express API (port 4000, /api/v1)
  ├─ Auth middleware: verifies Supabase token and active profile
  ├─ Role/scope checks: ADMIN or barangay-scoped SK_OFFICIAL
  ├─ Modules: accounts, barangays, categories, youth/OSY records,
  │           child laborers, imports, reports, announcements, and audit logs
  └─ Supabase service client
             │
             ▼
Supabase Auth + PostgreSQL
```

The API does not serve the frontend bundle. They are separate processes connected through `VITE_API_BASE_URL` and backend CORS settings.

## Repository layout

```text
frontend/
  src/
    modules/                 Feature modules and pages
    infrastructure/          Supabase and HTTP clients
    redux/                   Global application state
    shared/                  Reusable UI, forms, tables, and toast helpers
    generated/api/           Generated OpenAPI TypeScript definitions
  playwright/e2e/            Browser tests

backend/
  src/
    routes/                  /api/v1 router composition
    middleware/              Authentication, authorization, CORS, errors, security
    modules/<feature>/
      interface/http/        Routes, controllers, and request schemas
      application/use-cases/ Business workflows
      domain/                Entities, rules, and errors
      infrastructure/        Supabase repositories
  scripts/                   Database verification and synchronization

supabase/migrations/         Ordered database migrations
docs/openapi.yaml             API contract source of truth
```

## Authentication and authorization

1. The browser signs in with Supabase email/password authentication.
2. The API client attaches the current Supabase access token as `Authorization: Bearer …`.
3. `requireAuth` verifies the token, loads the matching active profile, and resolves the active barangay assignment for an SK official.
4. Admin endpoints also use `requireAdmin`; resource queries apply role and barangay scope on the server.
5. The frontend mirrors these permissions with `AuthGuard`, `AdminGuard`, and role-aware navigation. Server checks remain authoritative.

## Youth record and reporting flow

- Youth Profile and Out-of-School Youth records share the `youth_profiles` field model but belong to different annual category types. Every list, analytics, and export query resolves registry-scoped category IDs before reading rows, preventing cross-registry totals.
- Records move through draft, submitted, returned, approved, and archived states.
- Spreadsheet imports preserve missing answers as `null`; they are not converted to “No.”
- Reports require an active registry filing year, include every in-scope record from that annual dataset only, and expose missing source answers as **No response**.
- SK officials are constrained to their assigned barangay. Administrators can review and report across barangays.
- CSV/XLSX generation is performed by the API.

## Child laborer registry and reporting flow

- Categories are registry-scoped annual datasets: `YOUTH_PROFILE` categories belong to KK Youth profiles, while `CHILD_LABORER` categories belong to protected child laborer records. Child laborer rows retain their own workflow and reporting model while using `category_id` for annual scope and custom fields.
- Reference-data groups use the same registry scope. Child Laborer grade, nature-of-work, and parent/guardian occupation options are maintained independently from Youth reference lists and appear as form suggestions without blocking a more specific verified entry.
- Record lists and forms derive filing-year options only from categories in their own registry, then limit the category selector to that year; the frontend also rejects mixed registry payloads defensively before rendering options.
- The API calculates age from the birthday at December 31 of the filing year, checks same-year duplicate identity, and uses optimistic versions to avoid lost updates.
- Records progress through identified, validated, referred, monitored, and closed states. Archive is a retained state rather than a destructive delete.
- Administrators can work across barangays; SK officials are limited to the active assigned barangay in both application services and database RLS.
- Database triggers keep immutable before/after audit entries for creates, edits, archives, and restores. Direct database access also requires an AAL2 token through a restrictive RLS policy.
- Reports can switch between KK Youth and Child Laborer datasets. Each dataset derives its filing-year choices from its own real categories, and every summary, demographic response, detailed row, and CSV/XLSX export remains scoped to the selected year.

## API contract

`docs/openapi.yaml` is the source of truth. After a contract change, run `npm run gen:api-types` and commit the generated `frontend/src/generated/api/openapi.generated.ts` update with the implementation.

## Validation boundaries

- Zod validates request payloads at the HTTP boundary.
- Application use cases enforce workflow rules.
- Repositories isolate Supabase queries.
- The global error handler returns stable client errors and hides internal provider/database messages for server failures.
- Helmet, CORS, JSON size limits, and bearer authentication are configured in the Express application.

## Testing

- Frontend Vitest tests run in `happy-dom`.
- Backend Vitest tests cover rules, use cases, middleware, and the Express boundary.
- Playwright mocks external data providers while exercising the real UI, routing, role guards, keyboard behavior, responsive layouts, and critical edit/report journeys.
- `npm test` runs lint, type-checking, all unit/integration tests, and Playwright. CI also builds both applications.
