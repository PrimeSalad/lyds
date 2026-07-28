# API security headers

The Express service is API-only. `backend/src/middleware/security-headers.ts` applies Helmet before all `/api/v1` routes, and `backend/src/app.test.ts` verifies the most important response headers at the real HTTP boundary.

## Active policy

- Content Security Policy denies scripts, styles, images, fonts, connections, objects, forms, framing, and base URLs. The API never serves application HTML.
- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` prevent framing.
- `X-Content-Type-Options: nosniff` prevents MIME sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` limits cross-origin referrer details.
- Cross-origin opener/resource policies default to `same-origin`.
- `Permissions-Policy` disables camera, microphone, location, payment, USB, interest-cohort, browsing-topics, and attribution-reporting features.
- `X-Powered-By` is removed.
- Production enables HSTS for two years with subdomains and preload, CSP upgrade-insecure-requests, and cross-origin embedder policy `require-corp`.

## CORS

`backend/src/middleware/cors.ts` reads comma-separated allowed origins from `CORS_ORIGINS`. If the variable is empty, cross-origin browser access is disabled. Allowed request headers are `Content-Type` and `Authorization`; allowed methods are GET, POST, PATCH, DELETE, and OPTIONS.

Use exact production origins. Do not use a wildcard together with credentials.

## Error disclosure

The global error handler maps internal failures to a generic `INTERNAL_ERROR` response. Health readiness failures also return a generic database-unavailable message. Provider and database error details belong in server-side diagnostics, never client JSON.
