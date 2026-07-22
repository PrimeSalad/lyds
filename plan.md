# SK Youth Information Management System
## Detailed Implementation Plan

> Working title: **SK Youth Information Management System**
>
> Repository baseline: `bishopZ/2026-Boilerplate`
>
> Deployment target:
> - Frontend: Vercel
> - Backend API: Render
> - Authentication, PostgreSQL database, and optional file storage: Supabase

---

## 1. Project Purpose

Build a secure web-based information management system for Katipunan ng Kabataan and other configurable Sangguniang Kabataan data-collection categories.

The system will allow:

1. An administrator to create and manage SK official accounts.
2. Each SK official account to be assigned to exactly one barangay at a time.
3. SK officials to view and manage records only for their assigned barangay.
4. SK officials to submit youth records individually or through bulk spreadsheet import.
5. Administrators to view, edit, consolidate, filter, and export records from one barangay or all barangays.
6. Administrators to create data categories or forms and decide whether each category is:
   - Fillable by SK officials
   - Viewable by SK officials but editable only by administrators
   - Completely restricted to administrators
7. All important changes to be recorded in an audit log.
8. The interface to use a restrained green visual system suitable for an official government or organizational dashboard.

The application must not depend on frontend-only permission checks. Barangay restrictions and role permissions must be enforced in the backend and database.

---

## 2. Boilerplate Adaptation

The source boilerplate currently combines the React frontend and Express backend in one application and serves them together through `vite-express`.

This project will keep the useful parts of the boilerplate but reorganize it into two independent applications.

### Keep from the boilerplate

- React 19
- TypeScript
- Vite
- React Router
- Chakra UI
- Redux Toolkit where global state is genuinely needed
- React error boundaries
- Lazy-loaded routes
- Accessibility utilities
- Vitest
- Playwright
- ESLint
- Express 5
- Helmet
- Express rate limiting
- OpenAPI-based API contracts
- Centralized server error handling
- Environment-based configuration

### Replace or remove

- Remove `vite-express`.
- Remove the single combined server/client build.
- Replace the local hardcoded authentication profile with Supabase Auth.
- Replace Passport local username/password authentication.
- Do not store youth records or sensitive data in browser local storage.
- Keep local-storage persistence only for harmless UI preferences such as theme, table density, and language.
- Replace the current MVC-only backend structure with modular clean architecture.
- Create separate `frontend/package.json` and `backend/package.json`.
- Deploy the frontend and backend independently.

---

## 3. Non-Negotiable System Rules

### 3.1 Role rules

The first release has two primary roles:

- `ADMIN`
- `SK_OFFICIAL`

An optional `SUPER_ADMIN` role may be included if multiple administrators will eventually manage separate permissions. If it is not needed at launch, use only `ADMIN` and `SK_OFFICIAL`.

### 3.2 Barangay isolation

- Every active SK official must have one active barangay assignment.
- An SK official must never read, search, update, export, or import data for another barangay.
- The frontend must not accept an arbitrary barangay ID from an SK official and trust it.
- For SK requests, the backend must resolve the barangay from the authenticated account assignment.
- Database Row Level Security must also enforce the same restriction.
- Administrators may work across all barangays.
- Reassigning an SK account must not silently move old records to the new barangay.

### 3.3 Record ownership

- Records belong to a barangay, not to an individual SK account.
- `created_by` and `updated_by` track who performed an action.
- Deactivating an account must not delete the records created by that account.
- Records remain associated with the barangay in which they were created.

### 3.4 Submission integrity

Recommended workflow:

- `DRAFT`
- `SUBMITTED`
- `RETURNED`
- `APPROVED`
- `ARCHIVED`

SK officials can edit:

- Their barangay's `DRAFT` records
- Their barangay's `RETURNED` records

SK officials cannot edit:

- `SUBMITTED` records unless an administrator returns them
- `APPROVED` records
- `ARCHIVED` records

Administrators can edit any non-deleted record, but every administrative edit must be audited.

### 3.5 No destructive hard deletion from the interface

- Use soft deletion for youth records, categories, and reference options.
- Only administrators can archive or restore records.
- Account deletion should normally mean deactivation, not permanent deletion.
- Permanent deletion should be a separate restricted maintenance action.

---

## 4. Proposed Repository Structure

```text
/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   ├── providers/
│   │   │   ├── store/
│   │   │   └── theme/
│   │   │
│   │   ├── core/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── config/
│   │   │   ├── errors/
│   │   │   ├── hooks/
│   │   │   ├── validation/
│   │   │   └── utilities/
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── accounts/
│   │   │   ├── barangays/
│   │   │   ├── categories/
│   │   │   ├── youth-records/
│   │   │   ├── imports/
│   │   │   ├── reports/
│   │   │   ├── reference-data/
│   │   │   └── audit-logs/
│   │   │
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   ├── tables/
│   │   │   ├── forms/
│   │   │   ├── feedback/
│   │   │   └── api-generated/
│   │   │
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   │
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── vercel.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── accounts/
│   │   │   ├── barangays/
│   │   │   ├── categories/
│   │   │   ├── youth-records/
│   │   │   ├── imports/
│   │   │   ├── reports/
│   │   │   ├── reference-data/
│   │   │   └── audit-logs/
│   │   │
│   │   ├── shared/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── interface/
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   ├── supabase/
│   │   │   ├── logging/
│   │   │   └── files/
│   │   │
│   │   ├── interface/
│   │   │   └── http/
│   │   │       ├── controllers/
│   │   │       ├── middleware/
│   │   │       ├── routes/
│   │   │       ├── validators/
│   │   │       └── presenters/
│   │   │
│   │   ├── config/
│   │   ├── composition-root.ts
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── docs/
│   │   └── openapi.yaml
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── render.yaml
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   ├── policies/
│   └── README.md
│
├── playwright/
├── docs/
│   ├── architecture.md
│   ├── authorization.md
│   ├── database.md
│   ├── deployment.md
│   ├── import-format.md
│   └── user-flows.md
│
├── package.json
├── README.md
└── plan.md
```

The root `package.json` is optional and is only for local developer convenience. Vercel and Render must each use their own application directory as the deployment root.

---

## 5. Clean Architecture Rules

Each backend feature module should use this structure:

```text
backend/src/modules/youth-records/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── enums/
│   ├── errors/
│   └── repositories/
├── application/
│   ├── use-cases/
│   ├── dto/
│   ├── ports/
│   └── mappers/
├── infrastructure/
│   ├── repositories/
│   ├── persistence/
│   └── services/
└── interface/
    └── http/
        ├── controller.ts
        ├── routes.ts
        ├── schema.ts
        └── presenter.ts
```

### Dependency direction

```text
Interface -> Application -> Domain
Infrastructure -> Application and Domain
Domain -> nothing framework-specific
```

### Domain layer

Contains:

- Entities
- Value objects
- Business rules
- Repository interfaces
- Domain-specific errors
- Status-transition rules

The domain layer must not import Express, Supabase, React, Chakra UI, or HTTP-specific types.

### Application layer

Contains:

- Use cases
- Input and output DTOs
- Authorization requirements
- Transaction boundaries
- Ports for persistence, clock, file parsing, and audit logging

Examples:

- `CreateYouthRecord`
- `SubmitYouthRecord`
- `ReturnYouthRecord`
- `ApproveYouthRecord`
- `BulkValidateYouthRecords`
- `CommitYouthImport`
- `CreateSkAccount`
- `AssignAccountToBarangay`
- `UpdateCategoryPermissions`
- `GenerateConsolidatedReport`

### Infrastructure layer

Contains:

- Supabase repository implementations
- Supabase Auth admin adapter
- Spreadsheet parser
- Logging adapter
- Storage adapter
- Database transaction or RPC adapter

### Interface layer

Contains:

- Express routes
- Request validation
- Controllers
- HTTP response presenters
- Authentication middleware
- Error middleware

Controllers must remain thin. A controller validates the request, calls one use case, and presents the result.

---

## 6. Frontend Architecture

The frontend should use modular clean boundaries without turning every component into unnecessary abstraction.

Each frontend module may use:

```text
frontend/src/modules/youth-records/
├── domain/
│   ├── models.ts
│   └── rules.ts
├── application/
│   ├── queries.ts
│   ├── mutations.ts
│   └── mappers.ts
├── infrastructure/
│   └── youth-records-api.ts
└── presentation/
    ├── pages/
    ├── components/
    ├── hooks/
    └── schemas/
```

### Frontend state rules

Use local component state for:

- Dialog visibility
- Current tab
- Form field values
- Temporary filters before applying
- Row selection

Use server-state query caching for:

- Account lists
- Barangay lists
- Youth records
- Categories
- Dashboard totals
- Reports
- Audit logs

Use Redux only for genuinely global client state:

- Authenticated profile summary
- UI preferences
- Global notifications if needed
- Feature flags if retained from the boilerplate

Do not duplicate API data in Redux unless there is a clear requirement.

Recommended addition:

- TanStack Query for server state
- React Hook Form for forms
- Zod for client validation

The backend remains the final authority even if the frontend already validates a field.

### 6.1 Font loading and main.tsx setup

The `frontend/index.html` must include the Google Fonts preconnect and stylesheet link in the `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Questrial&display=swap"
  rel="stylesheet"
/>
```

The `frontend/src/main.tsx` entry point must:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from './app/providers';
import App from './app/App';
import './theme/index.css';  // global CSS reset + font variables

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>,
);
```

The `frontend/src/theme/index.css` global stylesheet:

```css
:root {
  --font-heading: 'Poppins', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Questrial', ui-sans-serif, system-ui, sans-serif;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-body);
  color: #172019;
  background-color: #F6F8F6;
  margin: 0;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

### 6.2 Shared component paths

All shared components are importable from `frontend/src/shared/components/`:

```text
frontend/src/shared/components/
├── StatusBadge.tsx        # Status dot + uppercase label
├── PageHeader.tsx         # Title + description + actions
├── SectionHeader.tsx      # Green-bordered form section
├── FormField.tsx          # Label + input + error + helper
├── EmptyState.tsx         # Icon + message + action
├── ConfirmDialog.tsx      # Destructive action confirmation
├── DataTable.tsx          # Sortable, paginated table wrapper
├── FilterBar.tsx          # Collapsible filter controls
├── SkeletonRow.tsx        # Loading skeleton for tables
├── ErrorAlert.tsx         # Inline error message
└── SuccessToast.tsx       # Auto-dismiss success notification
```

---

## 7. Authentication Design

### 7.1 Supabase Auth flow

1. User enters email and password in the frontend.
2. Frontend signs in using Supabase Auth.
3. Supabase returns a session and access token.
4. Frontend sends the access token to the backend:
   ```http
   Authorization: Bearer <access-token>
   ```
5. Backend verifies the token through the Supabase server SDK.
6. Backend loads the user's internal profile and active barangay assignment.
7. Backend creates an authenticated request context:
   ```ts
   {
     authUserId: string;
     profileId: string;
     role: "ADMIN" | "SK_OFFICIAL";
     barangayId: string | null;
     accountStatus: "ACTIVE" | "INACTIVE";
   }
   ```
8. All use cases receive this authenticated context.

### 7.2 Supabase clients

Backend should define two separate clients:

- `supabaseAdmin`
  - Uses the server-only Supabase secret key.
  - Used only for account invitations, account creation, password recovery administration, banning, and account deletion.
  - Never sent to the browser.

- `supabaseUserClient`
  - Uses the publishable key plus the requesting user's bearer token.
  - Used for normal data access where Row Level Security should apply.

### 7.3 Account login rules

- Inactive accounts cannot use the application.
- An SK account without an active barangay assignment cannot enter the operational dashboard.
- The login screen must not reveal whether a specific email exists.
- Rate-limit login-related backend endpoints.
- Session expiry should return `401` and send the user to the login screen.
- A user may view their own name, role, barangay assignment, and account status.
- Users cannot edit their own role or barangay assignment.

---

## 8. Account Management

### 8.1 Administrator capabilities

Administrators can:

- Create an SK official account.
- Enter the official's full name.
- Enter account email.
- Assign a barangay.
- Send an invitation or create a temporary password.
- Set the account as active or inactive.
- Reassign the account to another barangay.
- Trigger password recovery.
- View account login status and last sign-in time when available.
- View records created or updated by the account.
- View account audit history.

### 8.2 Account form fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| Full name | Text | Yes | Official account holder |
| Email | Email | Yes | Used by Supabase Auth |
| Role | Enum | Yes | `ADMIN` or `SK_OFFICIAL` |
| Barangay | Select | For SK | Required for SK accounts |
| Status | Enum | Yes | `ACTIVE` or `INACTIVE` |
| Contact number | Text | No | Account contact, separate from youth data |
| Position/title | Text | No | Example: SK Chairperson or Secretary |
| Must change password | Boolean | No | Recommended for temporary-password accounts |

### 8.3 Barangay reassignment

When an account changes barangay:

1. End the previous active assignment.
2. Create a new assignment record.
3. Do not update old youth records.
4. Write an audit event containing old and new barangay IDs.
5. Force the user to refresh the session.
6. Clear cached barangay-scoped frontend queries.

---

## 9. Barangay Management

Administrators can:

- Add a barangay.
- Edit barangay name and metadata.
- Activate or deactivate a barangay.
- View assigned SK officials.
- View record totals.
- View import history.
- View submission status.
- Export that barangay's records.

Suggested barangay fields:

| Column | Type |
|---|---|
| `id` | UUID |
| `code` | Text, unique |
| `name` | Text, unique within municipality |
| `municipality` | Text |
| `province` | Text |
| `is_active` | Boolean |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `deleted_at` | Nullable timestamp |

Do not delete a barangay that already has accounts or records. Deactivate it instead.

---

## 10. Category and Form Management

A category represents a dataset or collection form.

Example:

- Category name: `Katipunan ng Kabataan`
- Code: `KK_PROFILE`
- Description: `Official youth profiling dataset`
- Record type: `YOUTH_PROFILE`
- SK visibility: enabled
- SK data entry: enabled
- Admin management: enabled

### 10.1 Category permission modes

Use explicit permission settings instead of a vague single flag.

| Mode | SK View | SK Create | SK Edit Draft | SK Submit | Admin Manage |
|---|---:|---:|---:|---:|---:|
| `SK_FILLABLE` | Yes | Yes | Yes | Yes | Yes |
| `SK_VIEW_ONLY` | Yes | No | No | No | Yes |
| `ADMIN_ONLY` | No | No | No | No | Yes |

Optional advanced mode:

| Mode | Description |
|---|---|
| `SHARED_ENTRY` | Both administrator and SK officials can create records |

### 10.2 Category fields

The standard KK youth profile should use strongly typed database columns.

Administrators may add optional custom fields to a category:

- Short text
- Long text
- Number
- Date
- Yes/no
- Single select
- Multi-select

Custom fields must have:

- Label
- Internal key
- Field type
- Required flag
- Help text
- Sort order
- Active flag
- Options when applicable

Do not allow an administrator to change a field's data type after records already use it. Create a new field version instead.

### 10.3 Publishing category changes

Use category states:

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

Only published categories are available to SK officials.

---

## 11. Youth Profile Data Model

### 11.1 Canonical fields

| User-facing field | Database field | Type | Rule |
|---|---|---|---|
| Name | Name components plus `display_name` | Text | Required |
| Age | `age_at_submission` | Integer | Computed |
| Birthday | `birth_date` | Date | Required |
| Month | Import-only birthday component | Integer | Converted to `birth_date` |
| Day | Import-only birthday component | Integer | Converted to `birth_date` |
| Year | Import-only birthday component | Integer | Converted to `birth_date` |
| Sex assigned at birth | `sex_assigned_at_birth` | Reference/enum | Configurable options |
| Civil status | `civil_status_id` | UUID/reference | Configurable |
| Youth classification | `youth_classification_id` | UUID/reference | Configurable |
| Youth age group | `youth_age_group_id` | UUID/reference | Computed or validated |
| E-mail address | `email` | Nullable email | Normalize lowercase |
| Contact no. | `contact_number` | Nullable text | Store as text, not number |
| Highest educational attainment | `educational_attainment_id` | UUID/reference | Configurable |
| Work status | `work_status_id` | UUID/reference | Configurable |
| Registered voter? | `is_registered_voter` | Boolean | Required |
| Voted last election? | `voted_last_election` | Nullable boolean | Depends on eligibility |
| Attended KK assembly? | `attended_kk_assembly` | Boolean | Required |
| If yes, how many times? | `kk_assembly_count` | Integer | Zero when no; at least one when yes |

### 11.2 Name storage

Recommended fields:

- `first_name`
- `middle_name`
- `last_name`
- `suffix`
- `display_name`

For imports containing only one `NAME` column:

1. Preserve the original value in `display_name`.
2. Do not guess name components unless a reliable parser is defined.
3. Allow administrators to correct the components later.

### 11.3 Age handling

Do not trust a manually entered age as the primary source.

- Compute age from `birth_date`.
- Store `age_at_submission` as a reporting snapshot.
- Validate an imported `AGE` column against the computed age.
- Show a warning when imported age differs.
- Use the computed age unless an administrator explicitly confirms an override.
- Recalculate current age only for live display, not historical submission reports.

### 11.4 Birthday handling

The system must support two input styles:

- One `BIRTHDAY` date column
- Separate `MONTH`, `DAY`, and `YEAR` columns

Both styles must be normalized to one database `birth_date`.

Reject impossible dates such as:

- February 30
- Month 13
- Day 0
- Future birth date

### 11.5 Assembly rule

```text
attended_kk_assembly = false
=> kk_assembly_count must be 0

attended_kk_assembly = true
=> kk_assembly_count must be 1 or greater
```

### 11.6 Voter rule

- `voted_last_election` may be null when the person was not eligible or the question is not applicable.
- The interface must distinguish:
  - Yes
  - No
  - Not applicable
  - Unknown, if allowed by the administrator

---

## 12. Suggested Database Schema

### 12.1 Core account tables

#### `profiles`

```text
id uuid primary key references auth.users(id)
full_name text not null
role account_role not null
account_status account_status not null default 'ACTIVE'
position_title text null
contact_number text null
must_change_password boolean not null default false
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid null
```

#### `account_barangay_assignments`

```text
id uuid primary key
profile_id uuid not null
barangay_id uuid not null
is_active boolean not null default true
started_at timestamptz not null
ended_at timestamptz null
assigned_by uuid not null
created_at timestamptz not null
```

Constraints:

- Only one active assignment per SK profile.
- Admin profiles may have no barangay assignment.
- Assignment history must be preserved.

### 12.2 Category tables

#### `categories`

```text
id uuid primary key
code text unique not null
name text not null
description text null
record_type text not null
status category_status not null
permission_mode category_permission_mode not null
allow_sk_export boolean not null default false
created_by uuid not null
updated_by uuid not null
created_at timestamptz not null
updated_at timestamptz not null
deleted_at timestamptz null
```

#### `category_fields`

```text
id uuid primary key
category_id uuid not null
field_key text not null
label text not null
field_type custom_field_type not null
is_required boolean not null default false
help_text text null
options jsonb null
sort_order integer not null
version integer not null default 1
is_active boolean not null default true
created_at timestamptz not null
updated_at timestamptz not null
unique(category_id, field_key, version)
```

### 12.3 Youth record tables

#### `youth_profiles`

```text
id uuid primary key
category_id uuid not null
barangay_id uuid not null
submission_batch_id uuid null

display_name text not null
first_name text null
middle_name text null
last_name text null
suffix text null

birth_date date not null
age_at_submission integer not null

sex_assigned_at_birth_id uuid null
civil_status_id uuid null
youth_classification_id uuid null
youth_age_group_id uuid null
educational_attainment_id uuid null
work_status_id uuid null

email text null
contact_number text null

is_registered_voter boolean null
voted_last_election boolean null
attended_kk_assembly boolean not null
kk_assembly_count integer not null default 0

status record_status not null default 'DRAFT'
return_reason text null

created_by uuid not null
updated_by uuid not null
submitted_by uuid null
submitted_at timestamptz null
approved_by uuid null
approved_at timestamptz null

version integer not null default 1
created_at timestamptz not null
updated_at timestamptz not null
deleted_at timestamptz null
```

#### `youth_profile_custom_values`

```text
id uuid primary key
youth_profile_id uuid not null
category_field_id uuid not null
value jsonb null
created_at timestamptz not null
updated_at timestamptz not null
unique(youth_profile_id, category_field_id)
```

### 12.4 Reference data

Use configurable tables rather than hardcoded dropdown values.

#### `reference_groups`

Examples:

- `SEX_ASSIGNED_AT_BIRTH`
- `CIVIL_STATUS`
- `YOUTH_CLASSIFICATION`
- `YOUTH_AGE_GROUP`
- `EDUCATIONAL_ATTAINMENT`
- `WORK_STATUS`

#### `reference_options`

```text
id uuid primary key
group_code text not null
code text not null
label text not null
description text null
sort_order integer not null
is_active boolean not null default true
metadata jsonb null
unique(group_code, code)
```

For age groups, `metadata` may contain:

```json
{
  "minimum_age": 15,
  "maximum_age": 17
}
```

### 12.5 Import tables

#### `import_batches`

```text
id uuid primary key
category_id uuid not null
barangay_id uuid not null
file_name text not null
file_type text not null
total_rows integer not null
valid_rows integer not null
invalid_rows integer not null
duplicate_rows integer not null
status import_status not null
created_by uuid not null
committed_by uuid null
created_at timestamptz not null
committed_at timestamptz null
```

#### `import_row_results`

```text
id uuid primary key
import_batch_id uuid not null
row_number integer not null
raw_data jsonb not null
normalized_data jsonb null
validation_errors jsonb null
validation_warnings jsonb null
duplicate_match_id uuid null
is_valid boolean not null
created_at timestamptz not null
```

Do not retain raw import rows forever. Add a cleanup policy, such as deleting raw validation data after 30 or 90 days while preserving the batch summary.

### 12.6 Audit table

#### `audit_logs`

```text
id uuid primary key
actor_profile_id uuid null
actor_role text null
action text not null
entity_type text not null
entity_id uuid null
barangay_id uuid null
before_data jsonb null
after_data jsonb null
metadata jsonb null
ip_address inet null
user_agent text null
request_id text null
created_at timestamptz not null
```

Sensitive fields may be masked in audit payloads where full values are unnecessary.

---

## 13. Indexing Strategy

Create indexes for the most common filters:

```text
youth_profiles(barangay_id)
youth_profiles(category_id)
youth_profiles(status)
youth_profiles(birth_date)
youth_profiles(youth_age_group_id)
youth_profiles(youth_classification_id)
youth_profiles(educational_attainment_id)
youth_profiles(work_status_id)
youth_profiles(is_registered_voter)
youth_profiles(attended_kk_assembly)
youth_profiles(created_at)
youth_profiles(barangay_id, category_id, status)
youth_profiles(barangay_id, lower(display_name))
account_barangay_assignments(profile_id, is_active)
account_barangay_assignments(barangay_id, is_active)
audit_logs(entity_type, entity_id)
audit_logs(actor_profile_id, created_at)
import_batches(barangay_id, created_at)
```

Use trigram or full-text search only if normal indexed search is insufficient.

---

## 14. Duplicate Detection

A duplicate system is required for both individual entry and bulk import.

### 14.1 Definite duplicate candidate

Same:

- Barangay
- Normalized name
- Birth date

### 14.2 Possible duplicate candidate

Any strong combination such as:

- Same email
- Same contact number
- Same birth date and similar name
- Same name and same age group

### 14.3 Duplicate behavior

- Do not silently discard a row.
- Mark it as `POSSIBLE_DUPLICATE`.
- Show the matching record.
- Allow an administrator to:
  - Skip
  - Merge
  - Replace
  - Create anyway with a reason
- SK officials may skip or request administrator review.
- Creating a duplicate despite a warning must be audited.

---

## 15. Bulk Import Workflow

### 15.1 Supported files

Initial support:

- `.xlsx`
- `.csv`

Recommended configurable limits:

- Maximum file size: 10 MB
- Maximum rows per import: 5,000
- One worksheet per import
- Reject password-protected files
- Reject executable or macro-enabled files

### 15.2 Import template

Provide an administrator-approved downloadable template with these headers:

```text
NAME
AGE
BIRTHDAY
MONTH
DAY
YEAR
SEX ASSIGNED AT BIRTH
CIVIL STATUS
YOUTH CLASSIFICATION
YOUTH AGE GROUP
E-MAIL ADDRESS
CONTACT NO.
HIGHEST EDUCATIONAL ATTAINMENT
WORK STATUS
REGISTERED VOTER?
VOTED LAST ELECTION
ATTENDED KK ASSEMBLY
IF YES, HOW MANY TIMES?
```

The template may allow either `BIRTHDAY` or `MONTH`, `DAY`, and `YEAR`. It must clearly explain that both are not required simultaneously.

### 15.3 Import stages

1. User selects category.
2. Barangay is resolved:
   - Automatically for SK officials
   - Selectable by administrators
3. User uploads file.
4. Backend checks file type and size.
5. Backend parses headers.
6. Header mapping screen appears if headers are not exact.
7. Backend normalizes values.
8. Backend validates every row.
9. Backend checks duplicates.
10. Frontend displays:
    - Total rows
    - Valid rows
    - Invalid rows
    - Warning rows
    - Duplicate candidates
11. User downloads an error report if needed.
12. User confirms the commit.
13. Backend commits valid rows in one controlled transaction or chunked transaction.
14. Import batch and audit entries are written.
15. The result page shows created, skipped, and failed rows.

### 15.4 Import validation examples

- Missing name
- Missing or invalid birthday
- Age mismatch
- Invalid email format
- Unknown reference option
- Contact number imported in scientific notation
- Assembly count inconsistent with attendance answer
- Voted-last-election value without registered-voter context
- Duplicate row within the same file
- Duplicate against existing database record

### 15.5 Import safety

- Parsing and validation occur on the backend.
- The browser must not directly insert spreadsheet rows into Supabase.
- Use a deterministic normalization function shared across individual and bulk entry.
- Commit in chunks when the file is large.
- A failed chunk must return explicit row errors.
- The user must never receive a generic success message if some rows failed.

---

## 16. Individual Record Workflow

### SK official

1. Open Katipunan ng Kabataan category.
2. Click `Add youth record`.
3. Complete the form.
4. Save as draft or submit.
5. View the saved record.
6. Edit only while draft or returned.
7. Read an administrator return reason.
8. Resubmit after correction.

### Administrator

1. Select a barangay or all barangays.
2. Add or edit a record.
3. Review submitted records.
4. Approve or return a record.
5. Add a return reason.
6. Archive or restore a record.
7. View record history.

---

## 17. API Design

Use versioned endpoints:

```text
/api/v1
```

### 17.1 Health

```http
GET /api/v1/health
```

### 17.2 Authentication and profile

```http
GET  /api/v1/auth/me
POST /api/v1/auth/logout-event
```

The frontend still signs in and signs out through Supabase Auth. `/auth/me` returns the system profile, role, permissions, and barangay assignment.

### 17.3 Accounts

```http
GET    /api/v1/accounts
POST   /api/v1/accounts
GET    /api/v1/accounts/:accountId
PATCH  /api/v1/accounts/:accountId
POST   /api/v1/accounts/:accountId/activate
POST   /api/v1/accounts/:accountId/deactivate
POST   /api/v1/accounts/:accountId/reset-password
POST   /api/v1/accounts/:accountId/assign-barangay
GET    /api/v1/accounts/:accountId/audit-logs
```

Admin only.

### 17.4 Barangays

```http
GET    /api/v1/barangays
POST   /api/v1/barangays
GET    /api/v1/barangays/:barangayId
PATCH  /api/v1/barangays/:barangayId
POST   /api/v1/barangays/:barangayId/activate
POST   /api/v1/barangays/:barangayId/deactivate
GET    /api/v1/barangays/:barangayId/summary
```

### 17.5 Categories

```http
GET    /api/v1/categories
POST   /api/v1/categories
GET    /api/v1/categories/:categoryId
PATCH  /api/v1/categories/:categoryId
POST   /api/v1/categories/:categoryId/publish
POST   /api/v1/categories/:categoryId/archive
GET    /api/v1/categories/:categoryId/fields
POST   /api/v1/categories/:categoryId/fields
PATCH  /api/v1/categories/:categoryId/fields/:fieldId
```

### 17.6 Youth records

```http
GET    /api/v1/youth-records
POST   /api/v1/youth-records
GET    /api/v1/youth-records/:recordId
PATCH  /api/v1/youth-records/:recordId
POST   /api/v1/youth-records/:recordId/submit
POST   /api/v1/youth-records/:recordId/return
POST   /api/v1/youth-records/:recordId/approve
POST   /api/v1/youth-records/:recordId/archive
POST   /api/v1/youth-records/:recordId/restore
GET    /api/v1/youth-records/:recordId/history
```

Query parameters:

```text
barangayId
categoryId
status
search
sexAssignedAtBirth
civilStatus
youthClassification
youthAgeGroup
educationalAttainment
workStatus
registeredVoter
attendedAssembly
createdFrom
createdTo
page
pageSize
sort
```

For SK officials, a `barangayId` query must be ignored or rejected unless it matches the authenticated assignment.

### 17.7 Imports

```http
POST   /api/v1/imports/validate
GET    /api/v1/imports/:batchId
GET    /api/v1/imports/:batchId/rows
POST   /api/v1/imports/:batchId/commit
POST   /api/v1/imports/:batchId/cancel
GET    /api/v1/imports/:batchId/error-file
GET    /api/v1/imports/template
```

### 17.8 Reports

```http
GET /api/v1/reports/summary
GET /api/v1/reports/by-barangay
GET /api/v1/reports/demographics
GET /api/v1/reports/education
GET /api/v1/reports/employment
GET /api/v1/reports/voter-participation
GET /api/v1/reports/assembly-attendance
GET /api/v1/reports/export
```

### 17.9 Audit logs

```http
GET /api/v1/audit-logs
GET /api/v1/audit-logs/:auditLogId
```

Admin only.

---

## 18. Standard API Response Shape

### Success

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

### Paginated success

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 240,
    "totalPages": 10,
    "requestId": "req_123"
  }
}
```

### Error

```json
{
  "error": {
    "code": "RECORD_VALIDATION_FAILED",
    "message": "The record contains invalid fields.",
    "fields": {
      "birthDate": ["Birth date cannot be in the future."]
    },
    "requestId": "req_123"
  }
}
```

Do not expose stack traces, SQL details, Supabase keys, or internal exception messages.

---

## 19. Authorization Matrix

| Feature | Admin | SK Official |
|---|---:|---:|
| View all barangays | Yes | No |
| View assigned barangay | Yes | Yes |
| Create accounts | Yes | No |
| Assign accounts | Yes | No |
| Manage categories | Yes | No |
| View published SK category | Yes | Based on permission |
| Create youth record | Yes | Assigned barangay only |
| Bulk import | Yes | Assigned barangay only |
| Edit draft/returned record | Yes | Assigned barangay only |
| Edit submitted record | Yes | No |
| Approve record | Yes | No |
| Return record | Yes | No |
| Archive record | Yes | No |
| View all reports | Yes | No |
| View barangay report | Yes | Assigned barangay only |
| Export all barangays | Yes | No |
| Export assigned barangay | Yes | Only when category permits |
| View audit logs | Yes | Limited record history only |
| Manage reference options | Yes | No |

The backend must use a permission service or policy object instead of scattering role checks across controllers.

---

## 20. Supabase Row Level Security

Enable Row Level Security on all public tables containing application data.

Create helper functions such as:

```sql
current_profile_id()
current_account_role()
current_barangay_id()
is_admin()
can_access_category(category_id)
```

Recommended behavior:

### Profiles

- User can read their own profile.
- Admin can read and update all profiles.
- SK officials cannot modify role or status.

### Account assignments

- User can read their own active assignment.
- Admin can manage all assignments.

### Youth profiles

Admin:

- Select all
- Insert all
- Update all
- Archive all

SK official:

- Select records where `barangay_id = current_barangay_id()`
- Insert only when:
  - Category is published
  - Category allows SK entry
  - Inserted barangay matches current assignment
- Update only when:
  - Barangay matches
  - Record status is `DRAFT` or `RETURNED`
  - Category allows SK editing
- No direct delete

### Categories

- Admin can manage all.
- SK official can read only published categories they are allowed to view.

### Audit logs

- Admin read only.
- Insert through controlled backend functions or triggers.
- No update or delete through normal application roles.

### Security notes

- RLS helper functions must use a fixed `search_path`.
- Avoid recursive policies.
- Test every policy with both roles.
- Never expose the Supabase secret key in Vite environment variables.

---

## 21. Audit Logging

Audit these actions:

- Account created
- Account updated
- Account activated or deactivated
- Password reset initiated
- Barangay assignment changed
- Category created
- Category permission changed
- Category published or archived
- Youth record created
- Youth record updated
- Youth record submitted
- Youth record returned
- Youth record approved
- Youth record archived or restored
- Bulk import validated
- Bulk import committed
- Duplicate override accepted
- Report exported
- Reference option changed

Each audit event should include:

- Actor
- Time
- Action
- Entity type
- Entity ID
- Barangay
- Before and after values where appropriate
- Request ID
- IP and user agent when available

Do not allow administrators to edit audit logs.

---

## 22. Reporting and Consolidation

### 22.1 Dashboard metrics

Admin dashboard:

- Total active barangays
- Total SK accounts
- Total youth records
- Draft records
- Submitted records awaiting review
- Approved records
- Records added this month
- Recent imports
- Barangays with no recent submission

SK dashboard:

- Assigned barangay
- Total barangay records
- Draft records
- Returned records needing correction
- Submitted records
- Approved records
- Most recent import
- Available categories

Avoid meaningless vanity metrics.

### 22.2 Consolidated reports

Administrators can view:

- All barangays combined
- One selected barangay
- Multiple selected barangays
- One category
- Date range
- Submission status

Breakdowns:

- Sex assigned at birth
- Civil status
- Youth classification
- Youth age group
- Highest educational attainment
- Work status
- Registered voter
- Voted last election
- KK assembly attendance
- Assembly attendance count
- Records per barangay

### 22.3 Export

Support:

- CSV
- XLSX

Export rules:

- Admin can export all permitted data.
- SK export is limited to assigned barangay and category permission.
- Export actions are audited.
- File names should include category, barangay scope, and date.
- Use readable column headers, not internal database names.
- Do not export soft-deleted records by default.

Example:

```text
KK_Profile_All_Barangays_2026-07-22.xlsx
```

---

## 23. User Interface Plan

### 23.1 Overall direction

The application should look like a serious operational dashboard, not a generic generated landing page.

Use:

- Clear left navigation
- Compact top bar
- Strong page titles
- Real data tables
- Deliberate whitespace
- Consistent forms
- Useful filters
- Visible record status
- Direct action labels

Avoid:

- Decorative blobs
- Excessive gradients
- Glassmorphism
- Giant rounded cards
- Green on every surface
- Random illustrations
- Repeated explanatory paragraphs
- Animated counters
- Excessive motion
- Icons without meaning
- Redundant dashboard cards
- Huge hero sections inside the authenticated application

### 23.2 Layout

Desktop:

- Left sidebar: approximately 240 to 256 px
- Top bar: approximately 64 px
- Main content: responsive maximum width with full-width tables
- Sticky table headers for large datasets
- Filter panel collapses when not needed

Mobile/tablet:

- Sidebar becomes drawer
- Tables become horizontally scrollable
- Critical actions remain visible
- Bulk import is allowed but optimized for desktop
- Forms use one column on narrow screens

### 23.3 Navigation

Admin:

```text
Dashboard
Youth Records
Imports
Reports
Barangays
SK Accounts
Categories
Reference Data
Audit Logs
Settings
```

SK official:

```text
Dashboard
Youth Records
Add Record
Bulk Import
My Submissions
Reports
Profile
```

Only show routes the user can actually access.

### 23.4 Important pages

#### Login

**Layout:** Centered card, `max-w-sm` (384px), vertically centered on `page.bg`.

```
┌──────────────────────────────┐
│                              │
│     [Green shield icon]      │
│       SK Youth IMS           │  ← Poppins 600, 24px, primary.700
│   Sign in to your account    │  ← Questrial 14px, text.secondary
│                              │
│   ┌──────────────────────┐   │
│   │ Email                │   │  ← Poppins 500 11px label, Questrial 14px input
│   └──────────────────────┘   │
│   ┌──────────────────────┐   │
│   │ Password      [eye]  │   │  ← Show/hide toggle (LuEye/LuEyeOff)
│   └──────────────────────┘   │
│                              │
│   [  Sign In  ]              │  ← Primary button, full width, loading state
│                              │
│   Forgot password?           │  ← Text link, primary.600 color
│                              │
│   Invalid credentials        │  ← danger color, only shown on error
│                              │
└──────────────────────────────┘
```

**Rules:**
- No logo animation, no gradient background, no decorative illustrations.
- Error message appears below the form, not in a toast.
- Button shows spinner during submit, disabled while loading.
- Enter key submits the form.
- Autofill support: ` autoComplete="email"` and `autoComplete="current-password"`.
- Password field uses `type="password"` with toggle to `type="text"`.

#### Admin dashboard

**Layout:** Full width within `DashboardLayout`. Sections stacked vertically with `space.6` (24px) gaps.

```
┌─────────────────────────────────────────────────────────┐
│ Admin Dashboard                    [Barangay: All ▾]    │  ← TopBar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │  ← Metric cards row
│  │Total │ │Pending│ │Draft │ │Appro-│ │This  │        │     SimpleGrid 5 cols
│  │Recs  │ │Review │ │     │ │ved   │ │Month │        │     Each: Card.Root
│  │ 1,247│ │  23   │ │  41  │ │ 892  │ │  67  │        │     Text "sm" muted label
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │     Text "2xl" 700 value
│                                                         │
│  ┌─────────────────────────┐ ┌────────────────────────┐│
│  │ Review Queue            │ │ Recent Activity        ││  ← Two columns, 3:2 ratio
│  │                         │ │                        ││
│  │ ● Juan Dela Cruz  5min  │ │ Admin approved 3 recs  ││  ← Activity list
│  │ ● Maria Santos   12min  │ │ SK import from Brgy A  ││     Dot + action + time
│  │ ● Pedro Reyes     1hr   │ │ New account created    ││     Questrial 13px
│  │                         │ │                        ││
│  │ [View All Submissions]  │ │ [View Audit Log]       ││  ← Text links
│  └─────────────────────────┘ └────────────────────────┘│
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Barangay Activity                                │  │  ← Full-width table
│  │                                                  │  │
│  │ Barangay     │ Records │ Pending │ Last Import    │  │  ← DataTable component
│  │ Balaring     │   234   │    12   │ Jul 20, 2026   │  │     Sortable columns
│  │ Cabcabien    │   189   │     8   │ Jul 19, 2026   │  │     Click row → barangay detail
│  │ ...          │         │         │                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Submission Trend (Last 30 Days)                  │  │  ← Line chart or bar chart
│  │ [Chart area]                                     │  │     One chart max per section
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Metric card spec:**
- `Card.Root` with `p={5}`
- Label: `Text fontSize="sm" color="text.muted"` (Questrial 13px)
- Value: `Text fontSize="2xl" fontWeight="700" fontFamily="heading"` (Poppins 24px 700)
- Optional trend indicator: `Text fontSize="xs" color="success"` with arrow icon
- No icons inside metric cards (keeps it clean)

**Review queue spec:**
- `Card.Root` with header `Text fontFamily="heading" fontWeight="600" fontSize="lg"` ("Review Queue")
- List items: horizontal flex, `py={3}`, `borderBottom="1px solid" borderColor="border.light"`
- Each item: status dot (6px circle) + name (Questrial 14px) + relative time (Questrial 12px text.muted)
- Click item navigates to record detail
- Empty state: "No records pending review" centered text

#### Youth records list

**Layout:** Full width. Filter bar at top, table below, pagination at bottom.

```
┌─────────────────────────────────────────────────────────┐
│ Youth Records                              [+ Add Record]│  ← Heading + primary CTA
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Filter bar ─────────────────────────────────────┐  │
│  │ [Search records...] [Barangay ▾] [Status ▾]     │  │  ← Row of filters
│  │ [Category ▾] [Sex ▾] [Age Group ▾]  [Clear All] │  │     Collapsible on mobile
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Showing 1-25 of 347 records     [Export ▾] [Columns ▾]│  ← Action bar
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ □ │ Name          │ Age │ Barangay │ Status │ ... │  │  ← DataTable
│  │───│───────────────│─────│──────────│────────│─────│  │     Sticky header
│  │ □ │ Juan Dela Cruz│  17 │ Balaring │DRAFT   │     │  │     Checkbox for bulk
│  │ □ │ Maria Santos  │  16 │ Balaring │SUBMITTED│    │  │     Click row → detail
│  │ □ │ Pedro Reyes   │  15 │ Cabcabien│APPROVED│    │  │     Status = Badge component
│  │   │               │     │          │        │     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [← Prev]  Page 1 of 14  [Next →]                      │  ← Pagination
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Filter bar spec:**
- Horizontal flex, `gap={3}`, wraps on mobile
- Each filter: `Select` component with `size="sm"`, `maxW="160px"`
- Search: `Input` with `size="sm"`, `maxW="280px"`, search icon prefix
- "Clear All" button: `variant="ghost"`, `size="sm"`, only visible when filters active
- Filters collapse into a "Filters" button on mobile that opens a drawer

**Table spec:**
- Uses shared `DataTable` component
- Columns: checkbox, Name (sortable), Age, Barangay (admin only), Status (badge), Created (date), Actions (kebab)
- Status column: `Badge` with dot icon + text, color per status token (24.2)
- Row click navigates to `/youth-records/:id`
- Bulk selection: checkbox column, "Select all" in header
- Bulk actions bar appears when rows selected: "Approve", "Return", "Archive" buttons
- Empty state: "No records found" + "Add your first record" CTA
- Loading state: skeleton rows (8px height bars, surface.muted bg)

**Column visibility:**
- Dropdown menu listing all columns with toggles
- Defaults: Name, Age, Status, Barangay (admin), Created
- Hidden by default: Email, Contact, Education, Work Status

#### Record form

**Layout:** Two-column on desktop (labels left, inputs right), single column on mobile. Sections separated by `Divider`.

```
┌─────────────────────────────────────────────────────────┐
│ [← Back]  Add Youth Record                    [Save Draft]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● Personal Information                                │  ← Section header: Poppins 16px 500
│  ─────────────────────────────────────────────────────  │     with left green border (4px)
│                                                         │
│  First Name *          Middle Name                      │  ← Two-column grid
│  ┌──────────────┐    ┌──────────────┐                   │     Required fields: asterisk
│  │              │    │              │                   │     Labels: Poppins 11px 500 uppercase
│  └──────────────┘    └──────────────┘                   │     overline style
│                                                         │
│  Last Name *          Suffix                            │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │              │    │              │                   │
│  └──────────────┘    └──────────────┘                   │
│                                                         │
│  ● Birthday & Age                                      │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Birth Date *           Age (computed)                  │  ← Age field is read-only
│  ┌──────────────┐    ┌──────────────┐                   │     Shows computed value
│  │ [Date picker]│    │ 17           │                   │     bg=surface.muted
│  └──────────────┘    └──────────────┘                   │
│                                                         │
│  ● Youth Classification                                │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Sex *               Civil Status *                     │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ Male      ▾  │    │ Single    ▾  │                   │  ← Select dropdowns
│  └──────────────┘    └──────────────┘                   │     Populated from reference_data
│                                                         │
│  Youth Classification *    Youth Age Group              │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ In-School  ▾ │    │ 15-17     ▾  │                   │  ← Auto-computed from birth_date
│  └──────────────┘    └──────────────┘                   │
│                                                         │
│  ● Contact Information                                 │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Email                    Contact Number                │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │              │    │              │                   │  ← Optional fields
│  └──────────────┘    └──────────────┘                   │
│                                                         │
│  ● Education & Employment                              │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Highest Education *     Work Status *                  │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ Senior High ▾│    │ Student   ▾  │                   │
│  └──────────────┘    └──────────────┘                   │
│                                                         │
│  ● Voter Participation                                 │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Registered Voter? *     Voted Last Election?           │  ← Radio group (Yes/No/N/A)
│  ○ Yes  ○ No              ○ Yes  ○ No  ○ N/A           │     N/A shown only if not registered
│                                                         │
│  ● KK Assembly Attendance                              │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Attended KK Assembly? *   How Many Times?              │
│  ○ Yes  ○ No               ┌──────────┐                 │  ← Number input, shown only
│                            │ 3        │                 │     when "Yes" selected
│                            └──────────┘                 │     Min=1 when visible
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Cancel]                              [Save & Submit]  │  ← Two CTAs at bottom
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Form rules:**
- Use React Hook Form + Zod for validation
- Labels: `Text as="label" fontSize="xs" fontWeight="500" fontFamily="heading" textTransform="uppercase" letterSpacing="0.08em" color="text.secondary"` (Poppins overline)
- Required indicator: red asterisk after label
- Error state: border `danger.DEFAULT`, message below field in `Text fontSize="xs" color="danger"`
- Section headers: left green border (`borderLeft="4px solid" borderColor="primary.600"`), Poppins 16px 500
- Age auto-computes from birth_date on blur, shown in read-only input
- Assembly count field conditionally renders based on "Attended" radio value
- "Voted last election" radio group shows "N/A" option only when "Registered Voter" is "No"
- Save Draft: saves as `DRAFT` status, stays on page
- Save & Submit: validates all required fields, saves as `SUBMITTED`, navigates to list
- Conflict handling: if record was modified since load, show `409` modal with "Refresh to see latest" action

#### Import page

**Layout:** Centered step flow, `max-w-2xl` (672px).

```
┌─────────────────────────────────────────────────────────┐
│ [← Back]  Bulk Import                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ──●──────────○──────────○──────────○──────────○─────  │  ← Step indicator
│  Upload     Map        Preview    Resolve    Confirm    │     Active: primary.600
│  │          Columns    Errors     Duplicates │          │     Completed: primary.400
│  │                               │           │          │     Pending: border.DEFAULT
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Step 1: Upload File                             │  │  ← Current step content
│  │                                                  │  │
│  │  Category: [Katipunan ng Kabataan ▾]             │  │  ← Pre-selected for SK
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │                                          │    │  │  ← Drop zone
│  │  │     📎 Drop .xlsx or .csv here           │    │  │     dashed border
│  │  │        or [Browse files]                 │    │  │     On hover: primary.100 bg
│  │  │                                          │    │  │     Max 10MB, 5000 rows
│  │  └──────────────────────────────────────────┘    │  │
│  │                                                  │  │
│  │  [Download Template]                             │  │  ← Secondary button
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Step 2: Map Columns                             │  │  ← Shows after file upload
│  │                                                  │  │
│  │  File Column        →  System Field              │  │  ← Mapping table
│  │  NAME               →  Display Name *            │  │     Auto-mapped if headers match
│  │  AGE                →  Age (computed)            │  │     Dropdown for each system field
│  │  BIRTHDAY           →  Birth Date *              │  │     Unmapped columns: "Ignore"
│  │  SEX ASSIGNED...    →  Sex *                     │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Step 3: Review Validation                       │  │  ← After mapping
│  │                                                  │  │
│  │  Total rows: 247    Valid: 231    Invalid: 12    │  │  ← Summary stats
│  │  Warnings: 4        Duplicates: 0                │  │     Color-coded badges
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │  ← Error table
│  │  │ Row │ Name          │ Error               │  │  │     Scrollable, max-h-96
│  │  │  12 │ (empty)       │ Name is required    │  │  │     Each error: red text
│  │  │  45 │ Juan Dela Cruz│ Invalid email format │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  │  [Download Error Report]                         │  │  ← CSV export of errors
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Step 4: Resolve Duplicates                      │  │  ← Only if duplicates found
│  │                                                  │  │
│  │  Row 23: "Maria Santos" matches existing record  │  │
│  │  [Skip] [Merge] [Replace] [Create Anyway]       │  │  ← Each action audited
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Cancel]                    [Confirm Import →]         │  ← Confirm disabled until valid
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Step indicator spec:**
- Horizontal line with numbered dots
- Active dot: `primary.600` fill, white number
- Completed dot: `primary.400` fill, white check icon
- Pending dot: `border.DEFAULT` outline, `text.muted` number
- Step labels below dots: `caption` (12px Poppins), active = `text.primary`, pending = `text.muted`

**Drop zone spec:**
- `border: 2px dashed {colors.border.DEFAULT}`
- `borderRadius: {radii.lg}` = `8px`
- `p={8}` centered content
- Hover/dragover: `borderColor: primary.500`, `bg: primary.50`
- File input hidden, triggered by "Browse files" button
- Accept: `.xlsx,.csv`
- On file select: show filename + size + "Remove" button
- Loading state during upload: spinner + "Uploading..."

**Error table spec:**
- Compact table, `maxH="384px"` with overflow scroll
- Columns: Row #, Field, Error message, Severity (warning/error)
- Error text: `danger` color
- Warning text: `warning` color
- Click row highlights the mapped column in step 2

#### Reports

**Layout:** Filter bar at top, metric summary, then detail table or chart.

```
┌─────────────────────────────────────────────────────────┐
│ Reports                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Barangay ▾] [Category ▾] [Status ▾] [Date Range]    │  ← Filter bar
│  Scope: All Barangays              [Export CSV] [Export XLSX]│  ← Export buttons
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │  ← Summary metrics
│  │Total │ │Male  │ │Female│ │With  │                  │     Same card style as
│  │ 1,247│ │  612 │ │  635 │ │Email │                  │     dashboard metrics
│  └──────┘ └──────┘ └──────┘ └──────┘                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Demographics Breakdown                           │  │  ← Chart or table
│  │                                                  │  │     One visualization at a time
│  │ [Bar chart: Youth by Age Group]                  │  │     Switch between chart types
│  │                                                  │  │     using tab buttons
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Detailed Breakdown                               │  │  ← Full DataTable
│  │                                                  │  │
│  │ Category       │ Count │ %    │ Trend            │  │
│  │ In-School      │  412  │ 33%  │ ↑ +5%            │  │
│  │ Out-of-School  │  289  │ 23%  │ ↓ -2%            │  │
│  │ ...            │       │      │                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Chart spec:**
- Use Recharts (already in boilerplate dependencies)
- Colors: primary.600 for bars, primary.400 for secondary series
- Grid lines: `border.light` color, dashed
- Axis labels: `caption` (12px Questrial), `text.muted`
- Tooltip: `surface` bg, `shadow.md`, `body-sm` font
- Responsive: reflow to horizontal bar on mobile
- Empty state: "No data for selected filters" centered

**Export spec:**
- File name: `{Category}_{BarangayScope}_{YYYY-MM-DD}.xlsx`
- Column headers: human-readable, not database names
- Formula injection protection: prefix cells starting with `=`, `+`, `-`, `@` with single quote
- Export action is audited
- Download triggers browser save dialog

#### Account management page

**Layout:** DataTable with inline actions, detail drawer/modal on click.

```
┌─────────────────────────────────────────────────────────┐
│ SK Accounts                              [+ Add Account]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search...] [Status ▾] [Barangay ▾]                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Name          │ Email         │ Barangay │ Status │  │
│  │───────────────│───────────────│──────────│────────│  │
│  │ Juan Dela Cruz│ juan@mail.com │ Balaring │ ●Active│  │  ← Status badge with dot
│  │ Maria Santos  │ maria@mail.com│ Cabcabien│ ●Active│  │
│  │ Pedro Reyes   │ pedro@mail.com│ —        │○Inactive│ │  ← No barangay = "—"
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Click row → Drawer opens:                              │
│  ┌─────────────────────────────────┐                    │
│  │ [×]  Juan Dela Cruz             │  ← Drawer header  │
│  │      SK Official · Active       │                    │
│  │                                 │                    │
│  │ Email: juan@mail.com            │  ← Detail fields  │
│  │ Barangay: Balaring              │     Questrial 14px │
│  │ Last sign-in: Jul 20, 2026     │                    │
│  │                                 │                    │
│  │ [Edit] [Reassign] [Deactivate] │  ← Action buttons  │
│  │                                 │                    │
│  │ Audit History                   │  ← Collapsible     │
│  │ Jul 20: Login from 192.168...  │     Section         │
│  │ Jul 18: Record created          │                    │
│  └─────────────────────────────────┘                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Account form (add/edit):**
- Modal dialog, `maxW="640px"`
- Fields: Full Name, Email, Role (radio: Admin / SK Official), Barangay (select, shown only for SK), Status (radio: Active / Inactive), Contact Number, Position/Title
- "Must Change Password" checkbox for temp-password accounts
- On submit: if creating, sends invitation via Supabase Auth
- On reassign: shows current barangay, dropdown for new barangay, confirmation dialog explaining records stay in old barangay

#### Barangay management page

**Layout:** DataTable with summary columns, detail page on click.

```
┌─────────────────────────────────────────────────────────┐
│ Barangays                                [+ Add Barangay]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search...] [Status ▾]                                 │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Code   │ Name         │ SK Officials │ Records   │  │
│  │────────│──────────────│──────────────│───────────│  │
│  │ BRG-01 │ Balaring     │     3        │   234     │  │
│  │ BRG-02 │ Cabcabien    │     2        │   189     │  │
│  │ BRG-03 │ Dalupirit    │     0        │     0     │  │  ← 0 officials = warning color
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Click row → Barangay detail page:                      │
│  - Overview card (name, code, municipality, status)     │
│  - Assigned SK officials list                          │
│  - Record summary by category                          │
│  - Import history                                      │
│  - [Edit] [Deactivate] actions                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Category management page

**Layout:** Cards for each category, click to edit.

```
┌─────────────────────────────────────────────────────────┐
│ Categories                              [+ Add Category]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────┐ ┌────────────────────┐  │
│  │ KK_PROFILE                 │ │ COMMUNITY_PROJECT  │  │  ← Card per category
│  │ Katipunan ng Kabataan      │ │ Community Project  │  │
│  │                            │ │ Tracking           │  │
│  │ Status: ●Published         │ │ Status: ○Draft     │  │  ← Badge
│  │ Permission: SK Fillable    │ │ Permission: Admin  │  │
│  │ Records: 1,247             │ │   Only             │  │
│  │ Fields: 18                 │ │ Records: 0         │  │
│  │                            │ │ Fields: 5          │  │
│  │ [Edit] [Fields] [Archive]  │ │ [Edit] [Fields]    │  │
│  └────────────────────────────┘ └────────────────────┘  │
│                                                         │
│  Click [Fields] → Field manager:                        │
│  - Drag-to-reorder list of fields                       │
│  - Each field: label, type, required, help text         │
│  - Add field button at bottom                           │
│  - Cannot change type of field with existing data       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Audit logs page

**Layout:** Filterable table, read-only.

```
┌─────────────────────────────────────────────────────────┐
│ Audit Logs                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Actor ▾] [Action ▾] [Entity ▾] [Date Range]          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Timestamp        │ Actor    │ Action    │ Entity  │  │
│  │──────────────────│──────────│───────────│─────────│  │
│  │ Jul 22 09:15 AM  │ Admin A  │ APPROVED  │ Record  │  │
│  │ Jul 22 09:12 AM  │ SK Juan  │ SUBMITTED │ Record  │  │
│  │ Jul 22 08:45 AM  │ Admin A  │ CREATED   │ Account │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Click row → Detail modal:                              │
│  - Full before/after JSON diff                          │
│  - IP address, user agent                               │
│  - Request ID                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 24. Green Design System

### 24.1 Palette

```text
Primary 900:       #14532D
Primary 800:       #166534
Primary 700:       #166534
Primary 600:       #15803D
Primary 500:       #16A34A
Primary 400:       #22C55E
Primary 300:       #4ADE80
Primary 200:       #86EFAC
Primary 100:       #DCFCE7
Primary 50:        #F0FDF4

Page background:   #F6F8F6
Surface:           #FFFFFF
Surface muted:     #F1F5F2
Surface raised:    #FFFFFF
Border:            #D9E2DB
Border light:      #E8EDE9

Text primary:      #172019
Text secondary:    #5B675E
Text muted:        #7B877E
Text inverse:      #FFFFFF

Info:              #2563EB
Info light:        #DBEAFE
Warning:           #B45309
Warning light:     #FEF3C7
Danger:            #B91C1C
Danger light:      #FEE2E2
Success:           #15803D
Success light:     #DCFCE7
```

### 24.2 Semantic status tokens

Use these in component props, not raw hex:

| Token | Badge bg | Badge text | Dot color | When |
|---|---|---|---|---|
| `DRAFT` | `surface.muted` | `text.secondary` | `text.muted` | Record not yet submitted |
| `SUBMITTED` | `info.light` | `info` | `info` | Pending admin review |
| `RETURNED` | `warning.light` | `warning` | `warning` | Sent back for correction |
| `APPROVED` | `success.light` | `success` | `success` | Admin approved |
| `ARCHIVED` | `surface.muted` | `text.muted` | `text.muted` | Soft-deleted / inactive |
| `ACTIVE` | `success.light` | `success` | `success` | Account / barangay active |
| `INACTIVE` | `surface.muted` | `text.muted` | `text.muted` | Account / barangay inactive |

### 24.3 Usage rules

- Primary green is for active navigation, main actions, links, and selected states.
- Do not use bright green backgrounds for large page areas.
- Use white or very light neutral surfaces.
- Use semantic colors for statuses (see 24.2).
- Use green for success only when it does not conflict with primary action styling.
- Use one border tone consistently.
- Every interactive element must have a visible focus ring (`box-shadow: 0 0 0 3px var(--chakra-colors-primary-100)`).
- Status badges must include a colored dot icon + text, never color alone (WCAG).

### 24.4 Components

- Border radius: `6px` default, `8px` cards, `12px` modals
- Buttons: `40px` default height (`md`), `36px` compact (`sm`), `48px` large (`lg`)
- Inputs: `40px` height, `44px` on touch devices
- Selects: same as inputs
- Tables: compact rows (36-40px), sticky header, alternating row hint on hover
- Shadows: only `sm` (cards) and `md` (modals/dropdowns), never decorative
- Focus ring: `3px` primary-100 outline, 2px offset
- Motion: `150ms` ease-out for transitions, `200ms` for modals, no decorative animation
- Skeleton loaders: `surface.muted` background with `surface` shimmer
- Empty states: centered icon + message + action button, not blank pages

### 24.5 Typography — Poppins + Questrial

Use a two-font system: **Questrial** for body text and UI, **Poppins** for headings and emphasis.

**Google Fonts import:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Questrial&display=swap"
  rel="stylesheet"
/>
```

**Font stack:**

```css
:root {
  --font-heading: 'Poppins', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Questrial', ui-sans-serif, system-ui, sans-serif;
}
```

**Chakra theme tokens (TypeScript):**

```ts
tokens: {
  fonts: {
    heading: { value: "'Poppins', ui-sans-serif, system-ui, sans-serif" },
    body: { value: "'Questrial', ui-sans-serif, system-ui, sans-serif" },
  },
}
```

**Type scale:**

| Token | Font | Weight | Size | Line height | Letter spacing | Use |
|---|---|---|---|---|---|---|
| `display` | Poppins | 700 | 30px | 1.2 | -0.02em | Page titles |
| `h1` | Poppins | 600 | 24px | 1.3 | -0.01em | Section headings |
| `h2` | Poppins | 600 | 20px | 1.35 | 0 | Subsection headings |
| `h3` | Poppins | 500 | 16px | 1.4 | 0 | Card titles, group labels |
| `body-lg` | Questrial | 400 | 16px | 1.6 | 0.01em | Lead paragraphs |
| `body` | Questrial | 400 | 14px | 1.6 | 0.01em | Default body text |
| `body-sm` | Questrial | 400 | 13px | 1.5 | 0.01em | Table cells, secondary info |
| `caption` | Questrial | 400 | 12px | 1.4 | 0.02em | Labels, timestamps, helper text |
| `overline` | Poppins | 500 | 11px | 1.4 | 0.08em | UPPERCASE section labels, status chips |
| `mono` | monospace | 400 | 13px | 1.5 | 0 | Codes, IDs, technical values |

**Rules:**

- Body text is always Questrial. Never use Poppins for body paragraphs.
- Headings are always Poppins. Never use Questrial for headings.
- Do not use font weights below 400 or above 700.
- Minimum body text size: 13px on desktop, 14px on mobile.
- Maximum line length for body text: 65-75 characters.
- Table data uses `body-sm` (13px Questrial).
- Form labels use `caption` weight 500 (Poppins).
- Status badges use `overline` (11px Poppins uppercase, letter-spacing 0.08em).

### 24.6 Full Chakra theme configuration

The theme file at `frontend/src/theme/index.ts` must define these tokens:

```ts
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        primary: {
          900: { value: '#14532D' },
          800: { value: '#166534' },
          700: { value: '#166534' },
          600: { value: '#15803D' },
          500: { value: '#16A34A' },
          400: { value: '#22C55E' },
          300: { value: '#4ADE80' },
          200: { value: '#86EFAC' },
          100: { value: '#DCFCE7' },
          50: { value: '#F0FDF4' },
        },
        page: { bg: { value: '#F6F8F6' } },
        surface: {
          DEFAULT: { value: '#FFFFFF' },
          muted: { value: '#F1F5F2' },
          raised: { value: '#FFFFFF' },
        },
        border: {
          DEFAULT: { value: '#D9E2DB' },
          light: { value: '#E8EDE9' },
        },
        text: {
          primary: { value: '#172019' },
          secondary: { value: '#5B675E' },
          muted: { value: '#7B877E' },
          inverse: { value: '#FFFFFF' },
        },
        info: { DEFAULT: { value: '#2563EB' }, light: { value: '#DBEAFE' } },
        warning: { DEFAULT: { value: '#B45309' }, light: { value: '#FEF3C7' } },
        danger: { DEFAULT: { value: '#B91C1C' }, light: { value: '#FEE2E2' } },
        success: { DEFAULT: { value: '#15803D' }, light: { value: '#DCFCE7' } },
      },
      fonts: {
        heading: { value: "'Poppins', ui-sans-serif, system-ui, sans-serif" },
        body: { value: "'Questrial', ui-sans-serif, system-ui, sans-serif" },
      },
      fontSizes: {
        xs: { value: '11px' },
        sm: { value: '13px' },
        md: { value: '14px' },
        lg: { value: '16px' },
        xl: { value: '20px' },
        '2xl': { value: '24px' },
        '3xl': { value: '30px' },
      },
      radii: {
        sm: { value: '4px' },
        md: { value: '6px' },
        lg: { value: '8px' },
        xl: { value: '12px' },
      },
      shadows: {
        sm: { value: '0 1px 2px rgba(0,0,0,0.05)' },
        md: { value: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)' },
        lg: { value: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)' },
      },
    },
    semanticTokens: {
      colors: {
        'focus.ring': { value: '{colors.primary.100}' },
        'focus.outline': { value: '{colors.primary.500}' },
      },
    },
  },
  globalCss: {
    body: {
      fontFamily: "'Questrial', ui-sans-serif, system-ui, sans-serif",
      color: 'text.primary',
      bg: 'page.bg',
      fontSize: 'md',
      lineHeight: '1.6',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    '*, *::before, *::after': {
      borderColor: 'border.DEFAULT',
    },
    ':focus-visible': {
      outline: '3px solid var(--chakra-colors-primary-500)',
      outlineOffset: '2px',
      borderRadius: 'md',
    },
  },
});

export const system = createSystem(defaultConfig, config);
```

### 24.7 Component token specifications

Every shared component must reference tokens, never raw values.

#### Buttons

| Prop | Token | Value |
|---|---|---|
| `size=sm` height | `sizes.8` | `32px` |
| `size=md` height | `sizes.10` | `40px` (default) |
| `size=lg` height | `sizes.12` | `48px` |
| `borderRadius` | `radii.md` | `6px` |
| `fontWeight` | — | `500` (Poppins) |
| `fontSize` | `fontSizes.md` | `14px` |
| Primary `bg` | `colors.primary.600` | `#15803D` |
| Primary `hover.bg` | `colors.primary.700` | `#166534` |
| Primary `active.bg` | `colors.primary.800` | `#166534` |
| Primary `color` | `colors.text.inverse` | `#FFFFFF` |
| Secondary `border` | `1px solid` `colors.border.DEFAULT` | `#D9E2DB` |
| Secondary `bg` | `colors.surface.DEFAULT` | `#FFFFFF` |
| Secondary `hover.bg` | `colors.surface.muted` | `#F1F5F2` |
| Danger `bg` | `colors.danger.DEFAULT` | `#B91C1C` |
| Danger `hover.bg` | `#991B1B` | — |
| Disabled `opacity` | — | `0.5` |
| Focus ring | `box-shadow` | `0 0 0 3px {colors.primary.100}` |
| Loading spinner | `borderColor` `text.inverse` with `transparent` | — |

#### Inputs, Selects, Textareas

| Token | Value |
|---|---|
| Height | `40px` (desktop), `44px` (`@media (pointer: coarse)`) |
| Border | `1px solid {colors.border.DEFAULT}` |
| Border radius | `{radii.md}` = `6px` |
| Background | `{colors.surface.DEFAULT}` |
| Font | `{fonts.body}`, `{fontSizes.md}` = `14px Questrial` |
| Padding | `0 12px` |
| Placeholder color | `{colors.text.muted}` |
| Focus border | `{colors.primary.500}` |
| Focus ring | `box-shadow: 0 0 0 3px {colors.primary.100}` |
| Error border | `{colors.danger.DEFAULT}` |
| Error ring | `box-shadow: 0 0 0 3px {colors.danger.light}` |
| Disabled bg | `{colors.surface.muted}` |
| Disabled opacity | `0.6` |

#### Tables

| Token | Value |
|---|---|
| Header bg | `{colors.surface.muted}` |
| Header font | `{fonts.heading}`, `500`, `{fontSizes.sm}` = `13px Poppins` |
| Header color | `{colors.text.secondary}` |
| Header text-transform | `uppercase` |
| Header letter-spacing | `0.04em` |
| Row height | `40px` |
| Row font | `{fonts.body}`, `{fontSizes.sm}` = `13px Questrial` |
| Row color | `{colors.text.primary}` |
| Row hover bg | `{colors.surface.muted}` |
| Row border-bottom | `1px solid {colors.border.light}` |
| Cell padding | `0 16px` |
| Sticky header | `position: sticky; top: 0; z-index: 10` |
| Sortable header | `cursor: pointer` + sort icon |
| Status cell | Badge component with dot icon |

#### Cards

| Token | Value |
|---|---|
| Background | `{colors.surface.DEFAULT}` |
| Border | `1px solid {colors.border.light}` |
| Border radius | `{radii.lg}` = `8px` |
| Shadow | `{shadows.sm}` |
| Padding | `20px` (default), `16px` (compact) |
| Header padding | `0 0 12px 0` with `border-bottom: 1px solid {colors.border.light}` |

#### Modals / Dialogs

| Token | Value |
|---|---|
| Overlay bg | `rgba(0,0,0,0.45)` |
| Dialog bg | `{colors.surface.DEFAULT}` |
| Dialog border radius | `{radii.xl}` = `12px` |
| Dialog shadow | `{shadows.lg}` |
| Dialog max-width | `480px` (confirm), `640px` (form), `800px` (detail) |
| Dialog padding | `24px` |
| Header font | `{fonts.heading}`, `{fontSizes.xl}` = `20px Poppins 600` |
| Close button | Top-right, `variant="ghost"`, `size="sm"` |
| Focus trap | First interactive element receives focus |
| Backdrop click | Closes only non-required modals |

#### Badges / Status chips

| Token | Value |
|---|---|
| Font | `{fonts.heading}`, `{fontSizes.xs}` = `11px Poppins 500` |
| Text-transform | `uppercase` |
| Letter-spacing | `0.08em` |
| Padding | `2px 8px` |
| Border radius | `{radii.sm}` = `4px` |
| Dot icon | 6px circle before text, same color as text |

#### Toasts / Notifications

| Token | Value |
|---|---|
| Position | `bottom-right` |
| Max-width | `380px` |
| Auto-dismiss | `4000ms` |
| Font | `{fonts.body}`, `{fontSizes.sm}` |
| Border radius | `{radii.lg}` = `8px` |
| Shadow | `{shadows.md}` |
| Success | Left border `4px {colors.success.DEFAULT}` |
| Error | Left border `4px {colors.danger.DEFAULT}` |
| Warning | Left border `4px {colors.warning.DEFAULT}` |
| Info | Left border `4px {colors.info.DEFAULT}` |

### 24.8 Spacing system

Use an 8px base grid. All spacing values must be multiples of 4 or 8:

| Token | Value | Use |
|---|---|---|
| `space.1` | `4px` | Inline icon-to-text gap |
| `space.2` | `8px` | Tight element gaps, badge padding |
| `space.3` | `12px` | Form field gaps |
| `space.4` | `16px` | Card padding, table cell padding |
| `space.5` | `20px` | Section padding |
| `space.6` | `24px` | Page content padding, modal padding |
| `space.8` | `32px` | Large section gaps |
| `space.10` | `40px` | Page top/bottom padding |
| `space.12` | `48px` | Major section separators |
| `space.16` | `64px` | Page-level vertical rhythm |

### 24.9 Shadow and elevation system

| Level | Token | Use |
|---|---|---|
| 0 | none | Flat elements, inline text |
| 1 | `{shadows.sm}` | Cards at rest, table rows |
| 2 | `{shadows.md}` | Cards on hover, dropdowns, popovers |
| 3 | `{shadows.lg}` | Modals, dialogs, drawers |

Never use `box-shadow` for decorative purposes. Every shadow must indicate spatial hierarchy.

---

## 25. Accessibility Requirements

- Keyboard-accessible navigation
- Visible focus states (3px primary-500 outline, 2px offset)
- Proper labels for every form control (visible, not placeholder-only)
- Error summary at the top of invalid forms with anchor links to each field
- Inline field errors linked with `aria-describedby`
- Accessible modal focus management (trap focus, return focus on close)
- Status must not rely on color alone (dot icon + text + color)
- Table headers use `<th>` with `scope="col"`
- Screen-reader text for icon-only controls (`aria-label`)
- Confirmation dialogs for destructive actions
- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI components
- Skip-to-content link retained from the boilerplate
- Loading and success announcements through `aria-live="polite"`
- All images have descriptive `alt` text
- Form error messages use `role="alert"` for immediate screen reader announcement
- Tab order matches visual order
- No keyboard traps in modals or dropdowns

---

## 25A. Shared Component Library

All shared components live in `frontend/src/shared/components/`. Every component must reference Chakra tokens only, never raw values.

### 25A.1 StatusBadge

Renders a colored dot + uppercase text for record/account statuses.

```tsx
// frontend/src/shared/components/StatusBadge.tsx
import { Badge, HStack, Circle, Text } from '@chakra-ui/react';

type Status = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'ARCHIVED' | 'ACTIVE' | 'INACTIVE';

const statusConfig: Record<Status, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: 'surface.muted',  color: 'text.secondary',  label: 'Draft' },
  SUBMITTED: { bg: 'info.light',     color: 'info',            label: 'Submitted' },
  RETURNED:  { bg: 'warning.light',  color: 'warning',         label: 'Returned' },
  APPROVED:  { bg: 'success.light',  color: 'success',         label: 'Approved' },
  ARCHIVED:  { bg: 'surface.muted',  color: 'text.muted',      label: 'Archived' },
  ACTIVE:    { bg: 'success.light',  color: 'success',         label: 'Active' },
  INACTIVE:  { bg: 'surface.muted',  color: 'text.muted',      label: 'Inactive' },
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const config = statusConfig[status];
  return (
    <Badge bg={config.bg} color={config.color} px="8px" py="2px" borderRadius="4px"
           textTransform="uppercase" letterSpacing="0.08em" fontSize="xs" fontWeight="500"
           fontFamily="heading">
      <HStack gap="4px">
        <Circle size="6px" bg={config.color} />
        <Text>{config.label}</Text>
      </HStack>
    </Badge>
  );
};
```

### 25A.2 PageHeader

Consistent page header with title, description, and optional actions.

```tsx
// frontend/src/shared/components/PageHeader.tsx
import { Box, Flex, Heading, Text } from '@chakra-ui/react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <Flex justify="space-between" align="flex-start" mb={6}>
    <Box>
      <Heading as="h1" size="2xl" fontFamily="heading" fontWeight="600" color="text.primary">
        {title}
      </Heading>
      {description && (
        <Text mt={1} color="text.secondary" fontFamily="body">
          {description}
        </Text>
      )}
    </Box>
    {actions && <Flex gap={3}>{actions}</Flex>}
  </Flex>
);
```

### 25A.3 SectionHeader

Form section divider with left green border.

```tsx
// frontend/src/shared/components/SectionHeader.tsx
import { Flex, Text } from '@chakra-ui/react';

export const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <Flex align="center" mb={4} mt={6}>
    <Text
      pl={3}
      borderLeft="4px solid"
      borderColor="primary.600"
      fontFamily="heading"
      fontWeight="500"
      fontSize="lg"
      color="text.primary"
    >
      {children}
    </Text>
  </Flex>
);
```

### 25A.4 FormField

Reusable form field wrapper with label, input, error, and helper text.

```tsx
// frontend/src/shared/components/FormField.tsx
import { Field, Input, Textarea, Select, type BoxProps } from '@chakra-ui/react';

type FormFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'tel';
  as?: 'input' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
} & BoxProps;

export const FormField = ({
  label, name, required, error, helperText,
  type = 'text', as = 'input', options, placeholder, disabled, readOnly, ...props
}: FormFieldProps) => (
  <Field.Root required={required} invalid={!!error} {...props}>
    <Field.Label
      fontSize="xs" fontWeight="500" fontFamily="heading"
      textTransform="uppercase" letterSpacing="0.08em" color="text.secondary"
    >
      {label}
    </Field.Label>
    {as === 'textarea' ? (
      <Textarea name={name} placeholder={placeholder} disabled={disabled} />
    ) : as === 'select' ? (
      <Select name={name} placeholder={placeholder} disabled={disabled}>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Select>
    ) : (
      <Input name={name} type={type} placeholder={placeholder} disabled={disabled}
             readOnly={readOnly} bg={readOnly ? 'surface.muted' : undefined} />
    )}
    {helperText && !error && <Field.HelperText>{helperText}</Field.HelperText>}
    {error && <Field.ErrorText>{error}</Field.ErrorText>}
  </Field.Root>
);
```

### 25A.5 EmptyState

Consistent empty state for lists and tables.

```tsx
// frontend/src/shared/components/EmptyState.tsx
import { Box, Text, VStack } from '@chakra-ui/react';
import { LuInbox } from 'react-icons/lu';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <VStack py={12} gap={4} color="text.muted">
    <LuInbox size={40} strokeWidth={1.5} />
    <Text fontFamily="heading" fontWeight="500" fontSize="lg" color="text.secondary">
      {title}
    </Text>
    {description && <Text fontSize="sm">{description}</Text>}
    {action && <Box mt={2}>{action}</Box>}
  </VStack>
);
```

### 25A.6 ConfirmDialog

Reusable confirmation dialog for destructive actions.

```tsx
// frontend/src/shared/components/ConfirmDialog.tsx
import { Dialog, Button, VStack, Text } from '@chakra-ui/react';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'default';
};

export const ConfirmDialog = ({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, variant = 'default',
}: ConfirmDialogProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange} placement="center">
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content maxW="480px">
        <Dialog.CloseTrigger />
        <Dialog.Header>
          <Dialog.Title fontFamily="heading" fontWeight="600">{title}</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Text fontFamily="body" color="text.secondary">{description}</Text>
        </Dialog.Body>
        <Dialog.Footer>
          <VStack w="full" gap={3}>
            <Button
              w="full"
              colorPalette={variant === 'danger' ? 'red' : 'green'}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button w="full" variant="ghost" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
          </VStack>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
);
```

---

## 25B. Responsive Design Breakpoints

### Breakpoint tokens

| Name | Min width | Target |
|---|---|---|
| `xs` | 0 | Small phones |
| `sm` | 480px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Layout behavior by breakpoint

| Element | xs-sm | md | lg+ |
|---|---|---|---|
| Sidebar | Hidden, hamburger drawer | Hidden, hamburger drawer | Fixed 256px |
| TopBar | Full width, compressed | Full width | Full width |
| Content padding | `16px` | `24px` | `24px` |
| Tables | Horizontal scroll | Full width | Full width |
| Filter bar | Stacked vertically | Horizontal wrap | Horizontal |
| Metric cards | 1 column | 2 columns | 4-5 columns |
| Forms | Single column | Single column | Two columns |
| Modals | Full width, bottom sheet | Centered, max-width | Centered, max-width |
| Import step flow | Full width | `max-w-2xl` centered | `max-w-2xl` centered |

### Mobile sidebar drawer

```tsx
// On md and below, Sidebar becomes a Drawer
<MediaQuery maxWidth="1023px">
  <Drawer.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
    <Drawer.Positioner>
      <Drawer.Content>
        <Drawer.Body>
          <SidebarLinks />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Positioner>
  </Drawer.Root>
</MediaQuery>
```

- Trigger: hamburger icon in TopBar (left side)
- Backdrop click closes drawer
- Navigation link click closes drawer
- Focus returns to hamburger button on close

### Table responsive behavior

- On `md` and below: table wraps in `overflow-x: auto` container
- Sticky first column (Name) on scroll
- Column priority: Name > Status > Actions > Age > Barangay > Created
- Hide low-priority columns on mobile, show in column visibility menu

### Touch targets

- All interactive elements: minimum `40px` height on `@media (pointer: coarse)`
- Button gap in mobile: minimum `8px`
- Form inputs: `44px` height on touch devices
- Kebab menu trigger: `40px` tap area even if icon is smaller

---

## 26. Validation Rules

Use shared validation specifications where possible.

### Text

- Trim leading and trailing whitespace.
- Collapse accidental repeated spaces for name comparison.
- Preserve original display formatting.
- Reject control characters.
- Apply reasonable maximum lengths.

### Email

- Convert to lowercase.
- Validate format.
- Do not require email for every youth record unless the category requires it.

### Contact number

- Store as text.
- Preserve leading zero.
- Strip spaces and hyphens for duplicate comparison.
- Display in a readable format.
- Do not perform arithmetic on phone numbers.

### Reference values

- Accept only active configured options.
- During import, support case-insensitive matching and approved aliases.
- Unknown values must produce validation errors or mapping prompts.

### Concurrency

Include `version` in update requests.

If a record changed after the user opened it:

```http
409 Conflict
```

Show the user that the record was updated by someone else and require refresh before saving.

---

## 27. Privacy and Security Controls

Because the system stores personal information, apply these controls from the start:

- HTTPS only in production
- Strict CORS allowlist
- Secure authentication tokens
- Server-side authorization
- Supabase RLS
- Rate limiting
- Helmet security headers
- Request size limits
- Spreadsheet file limits
- Input validation
- Output encoding
- No sensitive data in logs
- No secret keys in frontend code
- No youth data in local storage
- Automatic session handling
- Audit trails
- Soft deletion
- Database backups
- Least-privilege access
- Export auditing
- Optional export watermark or generated-by metadata
- Optional inactivity timeout for shared office computers

Use environment-aware error handling:

- Detailed errors in development
- Safe errors in production

---

## 28. Backend Middleware Order

Recommended Express middleware order:

```text
1. Request ID
2. Structured request logger
3. Helmet
4. CORS
5. JSON/body size limits
6. Rate limiting
7. Authentication token extraction
8. Supabase token verification
9. Account/profile context loader
10. Route-level authorization
11. Controllers
12. Not-found handler
13. Global error handler
```

Do not use frontend route fallbacks in the backend because the backend is API-only.

---

## 29. Environment Variables

### Frontend `.env.example`

```env
VITE_APP_NAME=SK Youth Information Management System
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ENABLE_I18N=false
```

Never add a Supabase secret key to a `VITE_` variable.

### Backend `.env.example`

```env
NODE_ENV=development
PORT=4000

FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

LOG_LEVEL=info
MAX_IMPORT_FILE_MB=10
MAX_IMPORT_ROWS=5000
IMPORT_RAW_DATA_RETENTION_DAYS=30
```

Use Render secret environment variables for production values.

---

## 30. Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Optional root commands

```json
{
  "scripts": {
    "dev:frontend": "npm --prefix frontend run dev",
    "dev:backend": "npm --prefix backend run dev",
    "test:frontend": "npm --prefix frontend test",
    "test:backend": "npm --prefix backend test",
    "build": "npm --prefix frontend run build && npm --prefix backend run build"
  }
}
```

The root scripts are convenience wrappers only.

---

## 31. Vercel Deployment

Create one Vercel project using:

```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

Frontend environment variables:

```text
VITE_API_BASE_URL=https://<render-service>/api/v1
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Create `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This enables direct navigation to React Router paths such as:

```text
/youth-records
/reports
/accounts/123
```

Configure the actual production domain in Supabase Auth redirect settings.

---

## 32. Render Deployment

Create one Render web service using:

```text
Root Directory: backend
Runtime: Node
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /api/v1/health
```

Recommended `backend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Render environment variables:

```text
NODE_ENV=production
FRONTEND_URL=https://<vercel-domain>
CORS_ORIGINS=https://<vercel-domain>
SUPABASE_URL=<supabase-project-url>
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-only-secret>
```

The Express server must listen on `process.env.PORT`.

---

## 33. Supabase Setup

1. Create project.
2. Configure Auth email/password provider.
3. Configure approved frontend redirect URLs.
4. Create migrations.
5. Create enums.
6. Create tables.
7. Create indexes.
8. Create helper functions.
9. Enable RLS.
10. Create policies.
11. Create audit triggers or audit functions.
12. Seed barangays.
13. Seed reference data.
14. Seed the `Katipunan ng Kabataan` category.
15. Create the first administrator account through a secure bootstrap script.
16. Test policies using admin and SK accounts.
17. Enable scheduled backups appropriate to the selected Supabase plan.
18. Confirm that no public storage bucket contains youth spreadsheets.

---

## 34. Testing Strategy

### 34.1 Backend unit tests

Test:

- Age calculation
- Birthday normalization
- Assembly attendance rules
- Voter-answer rules
- Status transitions
- Barangay authorization policy
- Category permission policy
- Duplicate normalization
- Duplicate scoring
- Import row validation
- Account reassignment rules

### 34.2 Backend integration tests

Test:

- Authenticated request context
- Admin CRUD
- SK barangay isolation
- Category permissions
- Import validation and commit
- Report filters
- Audit event creation
- Pagination and sorting
- Optimistic concurrency
- RLS policies

### 34.3 Frontend tests

Test:

- Route guards
- Role-based navigation
- Record form validation
- Conditional assembly count
- Import stepper
- Error-table rendering
- Filter behavior
- Permission-hidden actions
- Session expiry behavior

### 34.4 End-to-end Playwright scenarios

1. Admin logs in.
2. Admin creates Barangay A and Barangay B.
3. Admin creates one SK account for each barangay.
4. Barangay A account submits a record.
5. Barangay A account cannot access Barangay B record by URL or API.
6. Admin views both records.
7. Admin returns a record.
8. SK corrects and resubmits it.
9. Admin approves it.
10. SK uploads a valid spreadsheet.
11. Invalid spreadsheet rows show row-level errors.
12. Duplicate spreadsheet row is flagged.
13. Admin exports all-barangay report.
14. Audit log contains the expected events.

### 34.5 Security tests

- Missing token
- Expired token
- Invalid token
- Inactive account
- No barangay assignment
- Cross-barangay record ID guessing
- Role manipulation in request payload
- Oversized file
- Invalid MIME type
- Spreadsheet formula injection on export
- Malformed JSON
- Repeated login attempts
- Unauthorized export
- Direct Supabase table access under RLS

---

## 35. Spreadsheet Formula Injection Protection

When exporting CSV or XLSX, values beginning with the following characters can be interpreted as spreadsheet formulas:

```text
=
+
-
@
```

Escape or safely prefix user-controlled values before export.

This applies especially to:

- Names
- Email
- Contact number
- Custom text fields

---

## 36. Logging and Monitoring

Backend logs should be structured.

Include:

- Request ID
- Route
- Method
- Status code
- Duration
- Authenticated profile ID when available
- Role
- Barangay scope
- Error code

Do not log:

- Passwords
- Access tokens
- Secret keys
- Full spreadsheet rows
- Full personal-data payloads

Recommended operational endpoints:

```http
GET /api/v1/health
GET /api/v1/health/ready
```

Use the simple health endpoint for Render health checks.

---

## 37. Migration Steps from the Boilerplate

### Step 1: Rebrand

- Change application title and metadata.
- Remove sample product pages and test-user language.
- Replace boilerplate branding.
- Keep accessibility and error-boundary infrastructure.

### Step 2: Split directories

- Move React code from `src/client` to `frontend/src`.
- Move Express code from `src/server` to `backend/src`.
- Move frontend public assets to `frontend/public`.
- Give both applications independent TypeScript and package configuration.
- Remove `vite-express`.

### Step 3: Frontend standalone setup

- Configure Vite entry.
- Configure React Router SPA.
- Configure Chakra theme.
- Configure Supabase browser client.
- Configure API client.
- Add route guards.
- Add Vercel rewrite.

### Step 4: Backend standalone setup

- Create normal Express startup.
- Add CORS.
- Add environment validation.
- Add Supabase clients.
- Add bearer-token middleware.
- Add authenticated profile loader.
- Add error mapper.
- Add `/api/v1/health`.

### Step 5: Database

- Add migrations.
- Add account tables.
- Add barangays.
- Add categories.
- Add reference data.
- Add youth records.
- Add imports.
- Add audit logs.
- Add indexes and constraints.
- Add RLS policies.

### Step 6: Accounts and authorization

- Admin bootstrap.
- Account creation.
- Account deactivation.
- Barangay assignment.
- Role and permission middleware.
- RLS tests.

### Step 7: Youth records

- List page.
- Individual form.
- Record details.
- Status workflow.
- History.
- Duplicate check.

### Step 8: Bulk import

- Template.
- Upload.
- Parse.
- Map.
- Validate.
- Preview.
- Resolve duplicates.
- Commit.
- Error export.

### Step 9: Categories

- Category list.
- Category create/edit.
- Permission mode.
- Custom fields.
- Publish/archive.

### Step 10: Reports and exports

- Dashboard.
- Barangay summary.
- Consolidated summary.
- Filtered report.
- XLSX/CSV export.
- Export audit.

### Step 11: Testing and deployment

- Unit tests.
- Integration tests.
- E2E tests.
- Vercel deployment.
- Render deployment.
- Supabase production policies.
- Production smoke test.

---

## 38. Implementation Phases

### Phase 1: Foundation

Deliver:

- Split repository
- Frontend on Vite
- Backend on Express
- Supabase connection
- Environment validation
- Health endpoint
- Base green theme
- Login
- Authenticated profile context

Acceptance criteria:

- Frontend deploys independently to Vercel.
- Backend deploys independently to Render.
- User can log in through Supabase.
- Backend rejects invalid sessions.
- No hardcoded test account remains.

### Phase 2: Admin and barangays

Deliver:

- Barangay management
- Account management
- Account assignment
- Account deactivation
- Permission middleware
- RLS policies

Acceptance criteria:

- Admin can create an SK account and assign a barangay.
- SK can see only their assignment.
- Cross-barangay API access is denied.

### Phase 3: Categories and reference data

Deliver:

- Category management
- Permission modes
- Reference option management
- Seeded KK category

Acceptance criteria:

- Admin can mark a category as SK-fillable, SK-view-only, or admin-only.
- SK navigation changes according to permission.
- Backend independently enforces the same permission.

### Phase 4: Individual youth records

Deliver:

- Record form
- Record list
- Filters
- Status workflow
- Duplicate warnings
- Record history

Acceptance criteria:

- SK can create a record only in assigned barangay.
- SK cannot edit approved records.
- Admin can consolidate and edit.
- All changes are audited.

### Phase 5: Bulk import

Deliver:

- Template
- Upload
- Header mapping
- Validation preview
- Error report
- Duplicate review
- Commit

Acceptance criteria:

- Invalid rows are never silently inserted.
- The result counts match actual inserted rows.
- Importing to another barangay is impossible for SK users.

### Phase 6: Reports and export

Deliver:

- Admin dashboard
- SK dashboard
- Consolidated reports
- Barangay reports
- CSV/XLSX export

Acceptance criteria:

- Admin can report across all barangays.
- SK report is scoped to assigned barangay.
- Export is audited.

### Phase 7: Hardening

Deliver:

- E2E suite
- RLS tests
- Rate limits
- Import protections
- Monitoring
- Accessibility review
- Production deployment checklist

---

## 39. Seed Data

Seed at minimum:

### Category

```text
Code: KK_PROFILE
Name: Katipunan ng Kabataan
Record type: YOUTH_PROFILE
Permission mode: SK_FILLABLE
Status: PUBLISHED
```

### Reference groups

- Sex assigned at birth
- Civil status
- Youth classification
- Youth age group
- Highest educational attainment
- Work status

Reference values must be confirmed by the project owner before production. Do not permanently hardcode unverified labels into domain logic.

---

## 40. Definition of Done

The first production release is complete only when:

- Frontend and backend are in separate folders.
- Frontend deploys on Vercel.
- Backend deploys on Render.
- Supabase Auth is active.
- Secret key is backend-only.
- Admin can manage accounts.
- Admin can assign one barangay to each SK official.
- SK access is restricted to assigned barangay.
- Admin can view all barangays.
- Individual youth record entry works.
- Bulk XLSX/CSV import works.
- Import preview shows row-level errors.
- Duplicate detection works.
- Categories support explicit SK/admin permission modes.
- Admin can consolidate and export records.
- Record status workflow works.
- Audit logs exist.
- RLS policies are tested.
- Cross-barangay access tests pass.
- Frontend route guards work.
- Backend authorization works without relying on frontend checks.
- The UI follows the green design system.
- The interface avoids decorative or redundant generated-dashboard patterns.
- All critical use cases have tests.
- Production environment variables are documented.
- A production smoke test passes.

---

## 41. Recommended First Development Tickets

1. Split boilerplate into `frontend` and `backend`.
2. Remove `vite-express` and local Passport authentication.
3. Create environment validation in both apps.
4. Configure Supabase browser and server clients.
5. Implement bearer-token authentication middleware.
6. Create `profiles`, `barangays`, and assignment migrations.
7. Add RLS helper functions and initial policies.
8. Bootstrap first administrator.
9. Build admin account management.
10. Build barangay management.
11. Seed KK category and reference data.
12. Build youth-profile domain rules.
13. Build youth record CRUD and status workflow.
14. Build admin and SK record tables.
15. Build bulk import validation.
16. Build duplicate detection.
17. Build reports and exports.
18. Add audit logging.
19. Complete E2E isolation tests.
20. Deploy and run production smoke tests.

---

## 42. Final Architecture Summary

```text
Vercel
└── React 19 + Vite + Chakra UI frontend
    ├── Supabase Auth browser session
    ├── Role-aware interface
    ├── Individual data entry
    ├── Bulk import workflow
    ├── Reports and exports
    └── Calls Render API with bearer token

Render
└── Express 5 TypeScript backend
    ├── Verifies Supabase token
    ├── Loads profile and barangay assignment
    ├── Executes clean-architecture use cases
    ├── Enforces role and category policies
    ├── Parses and validates spreadsheets
    ├── Produces reports and exports
    └── Writes audit events

Supabase
├── Auth
├── PostgreSQL
├── Row Level Security
├── Migrations
├── Reference data
└── Optional private storage
```

This separation keeps deployment simple, makes the access rules testable, prevents accidental cross-barangay access, and preserves the useful frontend and backend foundations of the selected boilerplate without retaining its combined runtime structure.
