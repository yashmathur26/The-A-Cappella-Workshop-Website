# Project Rules: The A Cappella Workshop

## Validation

- Run `npm run check` after TypeScript changes when practical.
- Run `npm run build` before considering broad frontend/backend changes complete.
- Run `npm run verify:sheets` after changes that affect Google Forms, Google Sheets, registration ingestion, balance lookup, or sheet verification behavior.
- Do not claim automated test coverage exists unless a test suite has been added; this repo currently has type/build validation but no checked-in test runner.

## Payments And Webhooks

- Preserve Stripe webhook signature verification. Stripe webhook routes that require raw request bodies must remain registered before generic JSON body parsing.
- Treat payment, balance, referral, and registration flows as high-risk changes. Prefer small scoped edits and explicit validation.
- Do not log secrets, payment credentials, webhook secrets, personally identifying registration data, or customer payment details.

## Registration Data

- Prefer webhook-backed registration updates over polling Google Sheets CSV when immediate correctness matters.
- Do not assume Google Sheets CSV data is fresh; cached reads can lag after form submission.
- Keep registration, balance, and referral logic consistent across `server/`, `shared/`, and related client pages.

## Source Of Truth

- Treat `server/index.ts` and `server/routes.ts` as active backend entry/routing files unless current evidence shows otherwise.
- Do not use `server/routes_broken.ts` or `server/routes_clean.ts` as implementation sources without first confirming their purpose; they appear to be legacy or experimental artifacts.
- Use `shared/schema.ts` and shared utilities under `shared/` for cross-client/server types and business rules where possible.

## Frontend And Design

- Follow the existing React/Vite, Wouter, TanStack Query, Tailwind, shadcn/ui, and Radix UI patterns already present in `client/src/`.
- Keep public-facing UI aligned with the existing dark blue/glassmorphism brand and reusable components under `client/src/components/ui`.
- Keep deployed frontend/backend separation in mind: production frontend calls may depend on `VITE_API_BASE_URL`.

## Deployment

- Use `npm run build:frontend` for Cloudflare Pages frontend-only validation.
- Use `npm run build` for full app/server bundle validation.
- Preserve `client/public/_redirects` behavior for SPA routing on static hosts.
