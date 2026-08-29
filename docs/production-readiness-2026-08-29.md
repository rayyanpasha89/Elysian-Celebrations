# Production Readiness - 2026-08-29

This report records the exact state verified on branch
`codex/production-readiness`. It is a local and linked-Supabase verification
report, not a claim that this branch is deployed to Vercel.

## Completed In This Branch

- Patched the remaining production dependency advisory and retained a zero
  vulnerability `npm audit --omit=dev` result.
- Made invalid or missing `NEXT_PUBLIC_SITE_URL` values fall back safely for
  metadata, robots, and sitemap generation.
- Repaired migration-from-zero compatibility for the day/event planning schema.
- Moved whole-event creation into `public.create_event_plan`, one reviewed
  Postgres transaction with explicit server-only execution rights.
- Added normalized `wedding_events.venue_id` while preserving the text snapshot
  and custom-area fallback. Venue validity, activity, destination, and capacity
  are enforced server-side and in the database.
- Persisted catalogue venue IDs from onboarding through event creation and later
  function edits.
- Activated a directional payment ledger: `CLIENT_IN` receipts and `VENDOR_OUT`
  payouts have separate visibility, totals, schedule/settle/void actions, and
  database invariants.
- Replaced artificial full-screen route delays with real loading/error boundaries.
- Corrected dashboard time states, event-platform copy, INR package prices,
  no-review states, marketplace categories, and manager/vendor summaries.
- Completed vendor operations settings with persisted tax ID and
  `accepting_inquiries`; paused vendors cannot be discovered or booked.
- Restricted public vendor detail projection to an explicit allow-list, blocking
  tax ID and internal user-ID leakage.
- Rebuilt mobile vendor-detail inspection as an accessible modal sheet while
  retaining the desktop sticky brief rail.

## Automated Verification

All checks below passed on 2026-08-29 with Node 22:

- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run test:readiness` - 8 focused cases
- `npm run test:abuse-controls`
- `npm run test:event-plan` - 5 transaction/rollback cases
- `npm run test:venue` - 6 venue-integrity cases
- `npm run test:payments` - 8 ledger cases with full rollback
- `npm audit --omit=dev` - 0 vulnerabilities
- `npm run build` - Next.js 16.2.12 production build, 67 static pages generated
- `npm run db:migrations` - local and remote histories match through
  `20260829061409`
- `npm run db:push:dry-run` - remote database is up to date, no pending migration

## API And Browser Verification

- Production-mode auth bypass was disabled during verification.
- Signed-out protected pages redirect to Clerk login.
- Signed-out protected APIs return `401`.
- Client, vendor, manager, and admin cross-role page/API checks reject or redirect
  mismatched roles to the correct portal.
- Public vendor discovery remains available without exposing tax IDs or internal
  user IDs.
- Pausing a vendor removes it from discovery and returns `409` for a new booking;
  the remote test state was restored afterward.
- Tax ID normalization, maximum length, malformed-payload atomicity, and public
  projection were tested against the linked Supabase project; original test data
  was restored.
- Every public marketing/auth route, all seven destination slugs, and all six
  blog slugs returned `200`; an unknown route returned `404`.
- The fresh production artifact rendered the landing and Clerk login pages with
  no CSP rejection, refused-resource, failed-resource, runtime, or horizontal
  overflow errors.
- Application-wide CSP, frame denial, nosniff, referrer policy, permissions
  policy, COOP, and production HSTS headers were present.
- Manual responsive checks covered onboarding Step 5, the Layer 2 radial planner,
  scoped editor actions, client dashboard states, vendor discovery/modal,
  vendor settings, and admin package pricing.

## Launch Blockers And Intentional Deferrals

1. Replace Clerk development keys with production credentials and repeat login,
   role, webhook, and account-state tests.
2. The user requested no deployment yet. Do not merge to `main`, push a production
   deployment, or treat `https://elysian-events-v2.vercel.app/` as this branch.
3. Critical browser paths are manually verified but not yet encoded as an
   authenticated CI end-to-end suite.
4. Messaging intentionally uses role-checked polling. Direct Supabase Realtime
   remains deferred until a Clerk-to-Supabase JWT bridge exists.
5. The nested per-function editor save is not yet one database transaction,
   although initial whole-plan creation is atomic.
6. Budget/guest singleton ownership, message pagination, split budget allocation,
   and catalogue drag ordering remain architectural/product follow-ups rather
   than broken launch controls.

## Deployment Rule

The current branch is intentionally local. A production release requires an
explicit user instruction after production Clerk credentials are configured.
