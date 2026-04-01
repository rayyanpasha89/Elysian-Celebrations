# Supabase Remote Workflow

This repo now has a proper remote-first Supabase workflow, so schema changes and one-off queries do not have to be done manually in the dashboard.

## Required environment

Add these to `.env` for local use:

```bash
SUPABASE_ACCESS_TOKEN=...
SUPABASE_PROJECT_ID=...
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

Notes:

- `SUPABASE_PROJECT_ID` is the project ref, not the display name.
- `SUPABASE_DB_URL` should be the direct Postgres connection string from Supabase.
- `SUPABASE_ACCESS_TOKEN` is used by the Supabase CLI for linked-project operations. If you prefer, you can also run `npx supabase login` once locally.
- If you already have a valid `SUPABASE_DB_URL`, the helper commands can use `--db-url` directly for pull, push, and migration list without requiring `SUPABASE_ACCESS_TOKEN`.

## Everyday commands

Link the repo to the remote project:

```bash
npm run db:link
```

This step still requires either `SUPABASE_ACCESS_TOKEN` or an interactive `supabase login`.

List local vs remote migrations:

```bash
npm run db:migrations
```

Push pending migrations to the linked remote project:

```bash
npm run db:push
```

Push migrations and seed data:

```bash
npm run db:push:seed
```

Pull the remote schema into a new migration file:

```bash
npm run db:pull -- sync_from_remote
```

Run an ad-hoc SQL query against the remote database:

```bash
npm run db:query -- --sql "select now();"
```

Run a SQL file against the remote database:

```bash
npm run db:query -- --file ./queries/check.sql
```

## Important repo detail

The repo now includes a real baseline migration:

- `supabase/migrations/20260331000000_baseline_schema.sql`

That baseline is generated from the current `supabase/schema.sql`, so a fresh remote project can be brought up with CLI migrations instead of hand-running the schema in the dashboard.

The existing follow-up migration remains:

- `supabase/migrations/20260401000000_add_manager_role.sql`

## Existing remote projects

If your remote database was created manually before these migrations existed, do not blindly apply the baseline migration on top of it.

Recommended path:

1. Back up the remote database.
2. Run `npm run db:migrations` to inspect local vs remote state.
3. If the remote schema already matches the baseline, mark history appropriately with Supabase migration repair before continuing.
4. Use `npm run db:push` only after local migration history and remote state are aligned.

## CI/CD

This repo also includes a GitHub Actions workflow:

- `.github/workflows/supabase-db-push.yml`

Set these GitHub repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

That workflow will apply migrations from `main` automatically whenever the migration files change.
