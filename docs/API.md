# API guide

The Express API is served from `http://localhost:4000/api/v1` in development. The frontend authenticates directly with Supabase Auth, then sends the Supabase access token to the API as `Authorization: Bearer <token>`.

There are no application-owned `/api/session`, `/login/password`, `/logout`, or `/api/key` endpoints.

## Contract workflow

- Source contract: `docs/openapi.yaml`
- Generated client definitions: `frontend/src/generated/api/openapi.generated.ts`
- Generation command: `npm run gen:api-types`

Edit the YAML first, regenerate the TypeScript definitions, and commit both files with the implementation. Never hand-edit the generated file. See `skills/api-first/SKILL.md` for the required workflow.

## Route groups

All groups except process health require a valid bearer token.

| Prefix | Purpose | Access |
|---|---|---|
| `/health` | Process and database readiness | Public |
| `/auth` | Current authorization context and account settings | Signed-in user |
| `/youth-records` | Profiles, workflow actions, history | Barangay-scoped; admin-only review actions |
| `/imports` | Template, validation, batches, commit, error files | Barangay-scoped |
| `/reports` | Dashboard, summaries, demographics, barangay reporting, exports | Scoped; cross-barangay view is admin-only |
| `/announcements` | Visible announcements and management | Reads scoped; writes admin-only |
| `/categories` | Filing categories and custom fields | Reads scoped; writes admin-only |
| `/reference-data` | Reference groups and options | Reads signed-in; writes admin-only |
| `/barangays` | Barangay directory and status | Admin-only |
| `/accounts` | Account creation, temporary password reset, status, assignment, deletion | Admin-only |
| `/audit-logs` | Audit history | Admin-only |

The router files under `backend/src/routes/` and `backend/src/modules/*/interface/http/routes.ts` compose these groups. Backend middleware is authoritative even when the frontend also hides inaccessible navigation.

## Request and response conventions

- JSON response bodies wrap successful resources in `data`; paginated lists also include `meta`.
- Validation errors use HTTP 400 with a structured `error` body.
- Authentication failures use 401; authorization/scope failures use 403.
- Creates generally return 201, updates 200, and successful deletes without a body 204.
- Internal provider/database errors return a generic 500 response; raw provider details are not sent to clients.
- CSV/XLSX endpoints return a binary body and a `Content-Disposition` filename.

## Youth-record null semantics

Imported source files can omit demographic and civic answers. Nullable fields remain `null` through detail, edit, update, export, and report flows. Reports label those values **No response** rather than treating them as “No.”

## Adding or changing an endpoint

1. Update `docs/openapi.yaml`.
2. Run `npm run gen:api-types`.
3. Implement route → controller → use case → repository layers as needed.
4. Apply `requireAuth`, `requireAdmin`, and barangay-scope middleware explicitly.
5. Add schema, use-case, HTTP-boundary, and/or Playwright tests proportional to the change.
6. Run `npm test` and `npm run build`.
