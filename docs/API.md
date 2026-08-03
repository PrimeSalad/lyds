# API guide

The Express API is served from `http://localhost:4000/api/v1` in development. The frontend authenticates directly with Supabase Auth, then sends the Supabase access token to the API as `Authorization: Bearer <token>`.

There are no application-owned `/api/session`, `/login/password`, `/logout`, or `/api/key` endpoints.

## Contract workflow

- Source contract: `docs/openapi.yaml`
- Generated client definitions: `frontend/src/generated/api/openapi.generated.ts`
- Generation command: `npm run gen:api-types`

Edit the YAML first, regenerate the TypeScript definitions, and commit both files with the implementation. Never hand-edit the generated file. See `skills/api-first/SKILL.md` for the required workflow.

## Route groups

All groups except process health require a valid bearer token with a verified `aal2` claim. A password-only (`aal1`) token receives `403 MFA_REQUIRED`; the backend remains authoritative even if a caller bypasses the browser UI.

| Prefix | Purpose | Access |
|---|---|---|
| `/health` | Process and database readiness | Public |
| `/auth` | Current authorization context, account settings, and password-change completion | AAL2 signed-in user |
| `/youth-records` | Profiles, workflow actions, history | Barangay-scoped; admin-only review actions |
| `/child-laborers` | Yearly child laborer registry, status summaries, archival, and consolidation exports | AAL2 and barangay-scoped; administrators can access all barangays |
| `/imports` | Youth/Child registry validation, batches, atomic commit, template, and error files | Barangay-scoped |
| `/reports` | Dashboard, summaries, demographics, barangay reporting, exports | Scoped; cross-barangay view is admin-only |
| `/announcements` | Visible announcements and management | Reads scoped; writes admin-only |
| `/categories` | Registry-scoped annual categories and custom fields (`recordType=YOUTH_PROFILE` or `CHILD_LABORER`) | Reads scoped; writes admin-only |
| `/reference-data` | Registry-scoped reference groups and options (`recordType=YOUTH_PROFILE` or `CHILD_LABORER`) | Reads signed-in; writes admin-only |
| `/barangays` | Barangay directory and status | Admin-only |
| `/accounts` | Account creation, temporary password and 2FA reset, status, assignment, and guarded permanent deletion with unapproved-data cleanup | AAL2 admin-only |
| `/audit-logs` | Audit history | Admin-only |

The router files under `backend/src/routes/` and `backend/src/modules/*/interface/http/routes.ts` compose these groups. Backend middleware is authoritative even when the frontend also hides inaccessible navigation.

The public `GET /health` response includes `deploymentCommit` when Render supplies its runtime Git revision. This non-secret marker makes production rollout verification deterministic without exposing environment configuration.

## Request and response conventions

- JSON response bodies wrap successful resources in `data`; paginated lists also include `meta`.
- Validation errors use HTTP 400 with a structured `error` body.
- Authentication failures use 401; missing MFA, authorization, and scope failures use 403.
- Creates generally return 201, updates 200, and successful deletes without a body 204.
- Internal provider/database errors return a generic 500 response; raw provider details are not sent to clients.
- CSV/XLSX endpoints return a binary body and a `Content-Disposition` filename.

## Youth-record null semantics

Imported source files can omit demographic and civic answers. Nullable fields remain `null` through detail, edit, update, export, and report flows. Reports label those values **No response** rather than treating them as “No.”

## Annual report scoping

`GET /reports/summary` and `GET /reports/demographics` require `filingYear`. The API resolves that year to `YOUTH_PROFILE` category IDs before querying profiles, so workflow totals, profile/demographic responses, and civic-participation responses cannot silently combine annual datasets. Optional barangay, category, and status filters are applied inside the selected year; a category from another year produces an empty scoped result rather than falling back to overall data.

The Reports UI derives Youth and Child Laborer year choices only from real categories in the selected registry. Every visible metric, response table/chart, detailed row, CSV, and XLSX export follows the active filing year.

## Child laborer annual records

`/child-laborers` stores a separate protected registry for each filing year. Birth date is required, while `age` is calculated as of December 31 of that filing year so historical consolidations do not change over time. Every active record has one of the `IDENTIFIED`, `VALIDATED`, `REFERRED`, `MONITORED`, or `CLOSED` statuses; archival retains the row and its audit history without including it in active totals or default exports.

A record can be marked `VALIDATED` only when remarks document the validation. Records without remarks remain `IDENTIFIED`, and report validation percentages are calculated from these current persisted statuses rather than from the spreadsheet name or visible table page.

Child laborer writes also normalize known imported variants into professional, canonical wording for nature of work and parent/guardian occupation. Equivalent field notes are standardized as complete sentences, while blank remarks remain blank and do not become validation evidence.

The Child Laborer form loads maintained `CHILD_LABORER_HIGHEST_GRADE`, `CHILD_LABORER_NATURE_OF_WORK`, and `CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION` options as suggestions. Administrators maintain those lists through registry-scoped Reference Data. The persisted fields remain text so a verified detail that is more specific than the maintained list is not discarded.

`GET /child-laborers/summary` accepts the same category, filing year, barangay, status, and search scope used by the report registry. It summarizes the complete filtered dataset—not only the visible table page—with school attendance, workflow status, gender, filing-year age bands, barangay concentration, leading canonical nature-of-work categories, and reporting-quality indicators. The completeness percentage measures the presence of highest grade, parent or guardian occupation, and a specified nature of work across all matched records; `Not Reported` remains incomplete.

Every child laborer write requires a published `CHILD_LABORER` category. The category owns the filing year and can define additional custom fields; the API rejects cross-registry categories, year mismatches, unavailable SK permissions, and missing required custom values.

The export endpoint requires a filing year and produces either CSV or the print-ready official XLSX column layout. Child CSV exports follow the active category, year, barangay, status, and search filters. Youth and Child CSV output embeds registry/year metadata and custom values so it can be validated and committed through `/imports` without column remapping. User-entered spreadsheet cells are neutralized when they begin with formula control characters. SK accounts are always restricted to their active barangay assignment even if a different `barangayId` is supplied.

## Adding or changing an endpoint

1. Update `docs/openapi.yaml`.
2. Run `npm run gen:api-types`.
3. Implement route → controller → use case → repository layers as needed.
4. Apply `requireAuth`, `requireAdmin`, and barangay-scope middleware explicitly.
5. Add schema, use-case, HTTP-boundary, and/or Playwright tests proportional to the change.
6. Run `npm test` and `npm run build`.
