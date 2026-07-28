# Technology choices

| Area | Choice | Role in this system |
|---|---|---|
| Language | TypeScript | Shared static checking across the browser and API. |
| Frontend | React 19 + Vite | Client-side application, fast development server, and production bundle. |
| UI | Chakra UI | Accessible primitives and the application design system. |
| Routing | React Router | Lazy-loaded protected and administrator routes. |
| State | Redux Toolkit | Authentication context and cross-page application state. |
| Forms | React Hook Form + Zod where applicable | Typed input handling and reusable validation. |
| Backend | Express 5 | API routing and middleware composition. |
| Validation | Zod | Request-boundary validation and stable error handling. |
| Auth/data | Supabase | Email/password authentication, PostgreSQL, and administrative user operations. |
| Spreadsheet I/O | ExcelJS | KK templates, import parsing, validation reports, and XLSX exports. |
| Unit/integration testing | Vitest | Frontend logic, backend domains/use cases, middleware, and HTTP integration. |
| Browser testing | Playwright | Login, routing, authorization, accessibility, responsive UI, reports, and edit journeys. |
| API contract | OpenAPI | Contract-first documentation and generated frontend TypeScript definitions. |
| Security | Helmet + CORS | API response hardening and explicit browser-origin policy. |

The Vite frontend and Express backend are independent processes. Authentication is Supabase bearer-token based; Passport, local hardcoded users, cookie sessions, and `vite-express` are not part of this application.
