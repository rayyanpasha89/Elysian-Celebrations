# Elysian Development History Since “Define Elysian”

## Product Definition Locked

Elysian was defined as an event-planning, commercial-control, and live-delivery
platform rather than a wedding-only directory. The operating model now connects
clients, vendors, Elysian administrators, and event-scoped operations employees
around the same persisted event data.

The commercial contract was made explicit: Elysian publishes and collects the
complete client price, while vendors see and receive only their agreed payout.
The Elysian fee and client collection are never exposed through vendor views.

## Development Delivered

1. Locked the full-client-price billing model, vendor settlement boundary, and
   provider-gated payment architecture.
2. Patched framework and dependency releases, repaired production builds, and
   kept the app on the current Next.js 16 route-handler conventions.
3. Closed release-review gaps across billing, booking ownership, role redirects,
   dashboard summaries, and persistence behavior.
4. Added the Shobiz fit-gap and walkthrough interpretation without treating a
   future pilot proposal as shipped scope.
5. Built event-scoped employee profiles, role templates, explicit permissions,
   active/inactive state, event assignment, event role, shift, and handoff notes.
6. Built the manager Live Operations queue and an event command center with the
   event pulse, client anchor, function readiness, selected partners, run of
   show, logistics, and permission-filtered finance.
7. Added live internal updates, incidents, decisions, and escalations with
   severity, owner, due time, acknowledgement, resolution, reporter, and audit
   timestamps.
8. Added an internal/external communication boundary so live operations records
   do not become an unstructured substitute for client and vendor messaging.
9. Broadened portal language and workflows beyond weddings to conferences,
   corporate events, retreats, launches, performances, festivals, hospitality,
   private celebrations, and custom event formats.
10. Hardened event scope, cross-event foreign keys, role authorization, private
    vendor-payout isolation, and invalid/unauthorized operations mutations.
11. Published a complete dashboard-flow handbook and a role-by-role recording
    script covering client, vendor, admin, manager, billing, and operations.
12. Added a fresh-booking insertion regression so “Failed to create booking” is
    tested on the real new-row path rather than only the existing-booking path.
13. Scaled operations for large delivery teams with departments, zones, batch
    shifts, supervisors, overlap prevention, check-in/out, no-show/cancel states,
    briefings, acknowledgement tracking, and standard operating structures.
14. Added a permission-safe printable event book with event structure, contacts,
    open attention, functions, tasks, menus, logistics, partners, briefings,
    crew call sheet, and team directory.
15. Added active command-center refresh while the browser is visible and on
    focus, preserving the last usable snapshot during transient refresh errors.
16. Audited the client's accessible previous-event documents and linked files
    across procurement, payments, guest logistics, vendor travel, riders,
    hotel/decor/tech checklists, recce, packing, showflow, RSVP, family data,
    stationery, alcohol, SFX, salon, and team operations.
17. Added a strict client-delivery fit-gap report that separates shipped,
    partial, missing, inaccessible-source, and external-activation items.
18. Built the shared production dossier data model for contracts, riders,
    permissions, recce, approvals, procurement, transport, rooming, hospitality,
    guest communication, inventory, packing, stationery, alcohol, expenses,
    reimbursements, and family/VIP briefs.
19. Added event/function/department/zone/assignment scoping, status, visibility,
    due date, amount, structured details, optimistic versions, and append-only
    production activity.
20. Added classified reference links with client, internal, finance, and private
    identity boundaries; private identity references are excluded from print.
21. Made production record plus first-reference creation transactional through a
    database RPC, so partial records cannot survive a failed reference insert.
22. Added production APIs for list, create, optimistic update, add reference,
    remove reference, rate limits, role checks, event-scope checks, and admin
    audit entries.
23. Added the Production Dossier command-center UI with metrics, domain filters,
    search, instructional empty state, record creation, ownership, scope,
    deadlines, status changes, finance visibility, references, and audit count.
24. Added permission-safe production records to the printable event book.
25. Backfilled production permission for existing Operations Lead and Coordinator
    profiles and assignment overrides without replacing custom permissions.
26. Added database verification for grants, RLS boundaries, cross-event denial,
    atomic create rollback, attachment/activity creation, append-only history,
    and clean event cascade deletion.
27. Extended the authenticated end-to-end journey to prove production creation,
    listing, status update, reference add/remove, client denial, and cleanup.

## Failures Found And Resolved

- A Clerk-provider prerender failure blocked an older Vercel build; the fallback
  was corrected and later production builds completed locally.
- Event onboarding previously created too early because a form submit path could
  trigger on Enter; creation was separated into an explicit button action.
- Event deletion once routed back to stale state; full plan deletion and cascade
  behavior were repaired and covered by focused tests.
- Booking creation produced a visible failure in the planner. The creation path,
  ownership checks, migration assumptions, and fresh insertion regression were
  corrected; the authenticated journey now proves a new booking, reuse behavior,
  two-way messages, and cleanup.
- The first append-only production trigger also blocked parent event cascade
  deletion. The trigger was narrowed so direct history mutation remains denied
  while legitimate parent deletion cascades safely.
- A journey re-run initially failed before assertions because a manual preview
  server held Next.js's single-instance development lock. The preview was
  stopped and the isolated suite then passed all groups.
- The machine's Homebrew Node runtime is currently broken by a missing shared
  library. Verification used the bundled Codex Node runtime; the application
  itself is not dependent on that machine-level Homebrew issue.

## Verification State

- ESLint: passing.
- TypeScript: passing.
- Next.js production build: passing, 67 static pages generated and all dynamic
  dashboard/API routes compiled.
- Authenticated journey: 12 groups passing with guaranteed fixture cleanup.
- Database migrations: local and linked remote histories aligned; dry run has no
  pending migration.
- Production, operations, event plan, venue, payment, billing, gateway,
  ownership, atomic planning, lifecycle, deletion, message pagination, abuse,
  and readiness suites: passing.
- Dependency audit: zero reported vulnerabilities.
- Local manager browser check: command center and Production Dossier render with
  no Next.js error overlay.

## Honest Remaining Boundaries

- The production dossier is a flexible shared register, not yet a specialized
  first-party file vault, procurement comparison grid, guest travel manifest,
  vendor travel roster, guest campaign sender, or inventory reconciliation app.
- Some client-linked source files remain inaccessible to the connected identity,
  so exact parity cannot be certified for those artifacts.
- Live payment processing remains disabled until provider selection, KYC,
  credentials, signed webhooks, refund/payout policy, and canary authorization.
- Automated WhatsApp delivery requires an approved provider, message templates,
  consent/opt-out policy, and delivery receipts.
- Production Clerk keys and the final release domain require a production canary
  before public client launch.
- Local, database, and authenticated fixture proof are not the same as a deployed
  release canary. This branch must be deliberately released before its new UI is
  represented as live.
