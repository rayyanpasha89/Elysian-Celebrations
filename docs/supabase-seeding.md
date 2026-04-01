# Supabase Seeding

This repo now includes a real cloud seed script for Supabase:

```bash
npm run seed
```

Prerequisites:

- `NEXT_PUBLIC_SUPABASE_URL` must point to the target Supabase project.
- `SUPABASE_SECRET_KEY` should be set for that same project.
- `CLERK_SECRET_KEY` must be set because the bootstrap creates or updates the Clerk fixture users.
- `supabase/schema.sql` must already be applied, including the newer `saved_vendors` and `vendor_profile_views` tables.

Legacy `SUPABASE_SERVICE_ROLE_KEY` is still supported as a fallback.

What the seed does:

- Upserts catalog rows for vendor categories, destinations, and package tiers.
- Upserts fixture Clerk users plus matching Supabase `users` rows for admin, clients, and vendors.
- Resets and rebuilds full client planning workspaces for the fixture client users:
  - wedding
  - wedding events
  - budget categories and items
  - guests
  - timeline
  - mood board items
  - bookings
  - saved vendors
  - reviews
  - messages
  - notifications
  - contact inquiries
- Seeds vendor services, vendor destinations, and vendor profile views so the dashboards have real data.
- Prints the fixture login emails and shared test password after completion.

Optional environment overrides:

- `ELYSIAN_TEST_USER_PASSWORD`

Notes:

- The script uses the cloud bootstrap in [src/lib/testing/cloud-bootstrap.ts](/Users/rayyan/Documents/elysian-celebrations/src/lib/testing/cloud-bootstrap.ts).
- The seed is intended for testing and demo environments, not production.
