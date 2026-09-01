# Production Readiness - 2026-09-01

This report records the verified state of `codex/production-readiness`. It is a
local and linked-Supabase release gate, not deployment authorization.

## Closed In This Pass

- Layer 2 Save is one atomic operation across event details, catalogue venue,
  menus/items, logistics, tasks, requirements, and vendor/service selections.
- Existing confirmed/commercial bookings cannot be removed from the planner.
- Existing selections remain saveable after a vendor pauses inquiries; new
  selections from that vendor remain blocked.
- Message history uses exact counts plus cursor pagination (40 recent messages,
  then booking-scoped older pages) with bounded dashboard panes.
- Client ownership invariants and singleton plan/budget/guest containers are
  enforced in PostgreSQL.
- An authenticated regression harness covers 9 cross-role product journeys and
  every one of the 48 portal navigation destinations.
- Catalogue venue creation and edits persist the selected `venue_id`, activating
  capacity, availability, and destination validation during ordinary planner use.

## Database State

- Local and remote migration histories match through
  `20260901042506_protect_workspace_booking_financial_history.sql`.
- `save_event_workspace` and `save_event_planning` are executable by
  `service_role` only; `public`, `anon`, and `authenticated` are denied.
- Supabase schema lint reports no errors in `public`.
- Generated TypeScript database contracts include 45 tables, 18 functions, and
  7 enums.

## Verification Record

- `npm run lint` - passed.
- `npx tsc --noEmit --pretty false` - passed.
- `npm run build` - passed; 67 static pages generated and every dynamic route
  compiled, including `/api/wedding/events/[id]/workspace`.
- `npm audit --omit=dev` - zero vulnerabilities.
- `npm run test:ownership` - 14 cases, rollback clean.
- `npm run test:event-plan` - 5 cases.
- `npm run test:planning-atomic` - 15 cases, rollback clean.
- `npm run test:venue` - 6 cases.
- `npm run test:readiness` - 8 cases.
- `npm run test:abuse-controls` - rate boundary, grants, RLS, and media quota
  reservations passed.
- `npm run test:payments` - 8 cases, rollback clean.
- `npm run test:billing` - invoice state/security checks, rollback clean.
- `npm run test:journeys` - 9 authenticated groups in 34.2 seconds; fixture
  identities, financial rows, messages, and rate-limit rows were removed.
- Live client browser - drilled hub to day to function to Basics, verified the
  labelled venue/guest controls, clicked Save, observed the disabled `Saving...`
  state and success toast, and confirmed the editor stayed open with Save
  re-enabled after authoritative refresh.
- `npm run db:migrations` - local/remote parity confirmed.
- `npm run db:push:dry-run` - remote database up to date.

## External Launch Gates

1. Replace Clerk development credentials with production keys.
2. Decide whether Elysian collects the full client total or only its fee, select
   the online payment provider, complete KYC, and provide checkout/webhook
   credentials. Manual invoice and reconciliation flows are ready meanwhile.
3. Receive explicit approval to merge/deploy. This branch remains intentionally
   local and has not been deployed in this pass.

After those gates are satisfied, run `npm run test:journeys` against the launch
candidate and perform a final production canary before opening traffic.
