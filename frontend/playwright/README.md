# Playwright browser tests

The suite exercises the current SK Youth application UI against an automatically managed Vite server on port 5173. API and Supabase calls are mocked with deterministic, non-secret data, so the tests do not mutate a live project.

## Run

From the repository root:

```powershell
npm exec --prefix frontend -- playwright install chromium
npm run test:e2e
```

Or from `frontend/`:

```powershell
npm run test:e2e
```

## Coverage

- Supabase email/password login success and failure
- keyboard skip-link behavior
- all primary list, detail, and create routes rendering without browser errors
- administrator route protection for SK officials
- small-phone and mobile-landscape layout checks
- reduced-motion preference handling
- reports including imported **No response** values
- editing an imported record without changing unanswered booleans to “No”

Shared network fixtures and runtime-error capture live in `playwright/e2e/helpers/mock-app.ts`.

Keep browser tests focused on cross-page and user-critical behavior. Put pure rules, schemas, and use-case branches in Vitest.
