# Cloud Testing Bootstrap

This app uses Clerk for identity and Supabase for product data. Because of that split, SQL seed alone is not enough for realistic end-to-end testing. The bootstrap path in this repo creates or updates Clerk users and then hydrates the matching Supabase records and relational planning data around them.

## What it seeds

- 1 admin account
- 2 client accounts with weddings, events, budgets, guests, timeline items, mood boards, bookings, messages, notifications
- 6 vendor accounts with profiles, services, destination links, reviews, and analytics-ready bookings
- contact inquiries, destinations, venues, package tiers, blog posts, and testimonials

## Environment

Set these variables before running the bootstrap:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
ELYSIAN_TEST_USER_PASSWORD=ElysianTesting123!
```

Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` values are still accepted as fallbacks.

If `ELYSIAN_TEST_USER_PASSWORD` is omitted, the bootstrap falls back to `ElysianTesting123!`.

## CLI bootstrap

Run:

```bash
npm run seed
```

The script is idempotent for the fixture accounts it owns. Re-running it refreshes the seeded planning data instead of endlessly appending new fixture records.

## Admin-only HTTP bootstrap

For deployed environments, you can enable an admin-only route:

```bash
ENABLE_TEST_DATA_BOOTSTRAP=true
```

Then sign in as an admin and `POST` to:

```bash
/api/admin/testing/bootstrap
```

The route is blocked unless:

- the requester is an authenticated admin
- `ENABLE_TEST_DATA_BOOTSTRAP=true`

## Fixture accounts

After bootstrapping, these accounts are available:

- `testing+admin@elysiancelebrations.app` -> `/admin`
- `testing+priya-arjun@elysiancelebrations.app` -> `/client`
- `testing+aisha-rohan@elysiancelebrations.app` -> `/client`
- `testing+the-story-room@elysiancelebrations.app` -> `/vendor`
- `testing+house-of-petals@elysiancelebrations.app` -> `/vendor`
- `testing+saffron-feast@elysiancelebrations.app` -> `/vendor`
- `testing+velvet-notes@elysiancelebrations.app` -> `/vendor`
- `testing+noor-bridal@elysiancelebrations.app` -> `/vendor`
- `testing+the-wedding-chapter@elysiancelebrations.app` -> `/vendor`

All seeded accounts use the same password from `ELYSIAN_TEST_USER_PASSWORD`.
