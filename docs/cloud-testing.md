# Cloud Testing Bootstrap

This app uses Clerk for identity and Supabase for product data. Because of that split, SQL seed alone is not enough for realistic end-to-end testing. The bootstrap path in this repo creates or updates Clerk users and then hydrates the matching Supabase records and relational planning data around them.

## What it seeds

- 1 admin account
- 3 client accounts with weddings, structured days/functions, budgets, guests, timeline items, mood boards, bookings, messages, notifications
- 1 platform manager account for the cross-event operations walkthrough
- 7 vendor accounts with profiles, services, destination links, reviews, and analytics-ready bookings
- contact inquiries, destinations, venues, package tiers, blog posts, and testimonials

## Environment

Set these variables before running the bootstrap:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
SUPABASE_SECRET_KEY=...
ELYSIAN_TEST_USER_PASSWORD=...
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are still accepted as fallbacks.

`ELYSIAN_TEST_USER_PASSWORD` is required. Keep its value in your local or deployment secret store; the bootstrap never returns or prints it.

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

- `testing+clerk_test_admin@elysiancelebrations.app` -> `/admin`
- `testing+clerk_test_priya-arjun@elysiancelebrations.app` -> `/client`
- `testing+clerk_test_aisha-rohan@elysiancelebrations.app` -> `/client`
- `rayyanh799@gmail.com` -> `/client` (Reeva & Vansh Evara presentation workspace)
- `testing+clerk_test_evara-manager@elysiancelebrations.app` -> `/manager`
- `testing+clerk_test_the-story-room@elysiancelebrations.app` -> `/vendor`
- `testing+clerk_test_house-of-petals@elysiancelebrations.app` -> `/vendor`
- `testing+clerk_test_saffron-feast@elysiancelebrations.app` -> `/vendor`
- `testing+clerk_test_velvet-notes@elysiancelebrations.app` -> `/vendor`
- `testing+clerk_test_atlas-logistics@elysiancelebrations.app` -> `/vendor`
- `testing+clerk_test_noor-bridal@elysiancelebrations.app` -> `/vendor`
- `testing+clerk_test_the-wedding-chapter@elysiancelebrations.app` -> `/vendor`

The Reeva & Vansh workspace uses the real Gmail identity and preserves its existing sign-in method; use Google or the verification code delivered to that mailbox. The remaining fixture addresses use Clerk's `+clerk_test` convention. In the development Clerk instance, choose **Use another method**, select the full test address, and follow [Clerk's documented test email-code flow](https://clerk.com/docs/guides/development/testing/test-emails-and-phones). A password is not required for that route.

## Local auth bypass

For dashboard QA on `localhost`, you can temporarily bypass Clerk email
verification without removing Clerk from the product:

```bash
ELYSIAN_TEST_AUTH_BYPASS=1
NEXT_PUBLIC_ELYSIAN_TEST_AUTH_BYPASS=1
ELYSIAN_TEST_AUTH_DEFAULT_ROLE=client
```

When enabled outside production, `/client`, `/vendor`, `/manager`, and `/admin`
skip Clerk protection and resolve to the first matching Supabase user for that
role. Use `?testRole=client`, `?testRole=vendor`, `?testRole=manager`, or
`?testRole=admin` to switch roles. Remove those flags, or set them to `false`,
to return to the normal Clerk flow.
