# Contributing

## Before coding

- Use Node.js 24+.
- Install root tools with `npm install`, then both applications with `npm run install:all`.
- Copy `frontend/.env.example` and `backend/.env.example` to each application's `.env` file.
- Never commit environment files, Supabase secret keys, access tokens, or account passwords.

## Project conventions

- Use TypeScript and arrow functions; do not introduce classes.
- Use Chakra UI for application components.
- Keep backend changes in route → controller → use case → repository layers.
- Treat `docs/openapi.yaml` as the API contract source; regenerate client types after changes.
- Enforce permissions on the backend even when the frontend also hides a route or action.
- Preserve unanswered imported values as `null`, not false or an empty categorical value.

## Tests and documentation

- Add Vitest coverage for schemas, rules, use cases, and isolated UI logic.
- Add Playwright coverage for cross-page or user-critical behavior.
- Update `CHANGELOG.md`, affected docs, and UI text with the implementation.
- Run the full local gate before committing:

  ```powershell
  npm test
  npm run build
  ```

- For database-related work, also run the read-only checks:

  ```powershell
  npm run db:verify
  npm run db:sync:dry
  ```

Do not apply a live database synchronization merely to validate a code change; review the dry-run output first.
