# Project Context: The A Cappella Workshop

## Purpose

The A Cappella Workshop is a public marketing, registration, and payment web application for a summer a cappella music camp serving middle-school students. The repository/folder is also referred to as AquaWave in local deployment configuration.

The app supports camp marketing pages, registration flow entry points, cart/payment behavior, deposit and full-payment flows, balance lookup/payment, referral codes, visitor stats, and operational data capture for registrations.

## Architecture

- Frontend: React 18, TypeScript, Vite, Wouter routing, TanStack Query, Tailwind CSS, shadcn/ui, and Radix UI primitives.
- Backend: Express with TypeScript, Vite middleware in development, server-side Stripe integration, webhook handling, Google Sheets/Form ingestion, Typeform webhook support, referral/balance logic, and email delivery helpers.
- Shared code: Drizzle schema and shared camp/referral utilities live under `shared/`.
- Data: Drizzle ORM targets Postgres/Neon via `DATABASE_URL`; some development paths can fall back to in-memory storage when database configuration is absent.
- Styling/brand: dark blue visual system with glassmorphism, gradient accents, and reusable UI primitives under `client/src/components/ui`.

## Important Paths

- `client/src/` contains the React application, pages, hooks, context, cart utilities, registration URL helpers, and UI components.
- `server/` contains the Express server, routes, Stripe checkout/webhook handling, Google Sheet CSV ingestion, balance reconciliation, referral code logic, email helpers, and Vite dev-server integration.
- `shared/` contains shared schema and referral/week utility code used across client and server.
- `docs/` contains setup notes for Google Forms, Typeform, and Google Sheet registration workflows.
- `replit.md` is the current architecture and product overview document.
- `cloudflare-deploy.md`, `railway-deploy.md`, `share-local.md`, `wrangler.toml`, and `client/public/_redirects` document deployment and sharing workflows.
- `fraim/` contains synced FRAIM jobs, skills, rules, scripts, docs, and project onboarding artifacts.

## External Integrations

- Stripe Checkout and Stripe webhooks are used for payment processing.
- Google Forms and Google Sheets are used for registration data capture and operational lookup flows.
- Typeform webhook support exists for alternate form intake.
- Brevo transactional email and Gmail SMTP fallback are used for email delivery paths.
- Cloudflare Pages is configured for frontend deployment; Railway is documented as an option for full app/backend hosting.
- `VITE_API_BASE_URL` can point a deployed frontend at a separately hosted backend.

## Local Workflows

- Development server: `npm run dev`
- Full production build: `npm run build`
- Frontend-only build: `npm run build:frontend`
- TypeScript validation: `npm run check`
- Registration sheet verification: `npm run verify:sheets`
- Drizzle schema push: `npm run db:push`
- Temporary local sharing tunnel: `npm run share`

## Known Gaps

- There is no test script and no test suite currently checked in.
- There are no `.github/workflows/` CI workflows currently checked in.
- `drizzle.config.ts` writes migrations to `migrations/`, but no migrations directory was observed during onboarding.
- `server/routes_broken.ts` and `server/routes_clean.ts` appear to be legacy or experimental artifacts; future agents should not treat them as active without confirming against `server/index.ts` and `server/routes.ts`.
- Google Sheets CSV reads may be cached and should not be assumed to reflect form submissions instantly.
