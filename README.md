# Elysian Celebrations

Premium multi-day event planning and operations platform built with Next.js,
Clerk, and Supabase.

## Project memory

Future agents should read [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) after `AGENTS.md` before changing product flows, dashboard UX, Supabase schema, or deployment wiring.

## Local development

1. Copy `.env.example` to `.env` and fill in Clerk and Supabase keys.
2. Start the app:

```bash
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).

## Cloud testing bootstrap

Use the shared seed command to create realistic Clerk + Supabase fixture data:

```bash
npm run seed
```

That bootstrap creates testing users, client/vendor/admin data, bookings, messages, reviews, notifications, and planning records.

Full instructions live in [docs/cloud-testing.md](docs/cloud-testing.md).

## Supabase schema

The project keeps its schema and SQL seed references under [`supabase/`](./supabase/). The application itself uses Clerk for auth and Supabase for product data, so the cloud bootstrap is the reliable way to stand up a usable test environment.

## Remote Supabase workflow

For remote-first schema changes, linked-project pushes, and ad-hoc SQL queries, use the CLI workflow documented in [docs/supabase-remote-workflow.md](docs/supabase-remote-workflow.md).

Key commands:

```bash
npm run db:link
npm run db:migrations
npm run db:push
npm run db:query -- --sql "select now();"
```

## Release verification

The focused database suites use rollback-only fixtures; the authenticated
journey starts an isolated local Next.js server and removes all test identities
and product data after completion.

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run test:ownership
npm run test:event-plan
npm run test:planning-atomic
npm run test:venue
npm run test:readiness
npm run test:abuse-controls
npm run test:payments
npm run test:billing
npm run test:journeys
npm run db:migrations
npm run db:push:dry-run
npm audit --omit=dev
npm run build
```

The latest verified gate is recorded in
[`docs/production-readiness-2026-09-01.md`](./docs/production-readiness-2026-09-01.md).
