# Elysian Celebrations

Luxury destination wedding planning platform built with Next.js, Clerk, and Supabase.

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
