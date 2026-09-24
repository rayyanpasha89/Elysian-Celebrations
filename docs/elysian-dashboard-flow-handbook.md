# Elysian Dashboard and Flow Handbook

**Release lane:** `codex/live-operations`

**Audience:** product, sales, operations, QA, and recording teams

**Scope:** the current Elysian event platform before any separate Shobiz pilot

## Product Definition

Elysian is an event planning, commercial control, and live-delivery platform for
weddings, conferences, corporate retreats, launches, galas, hospitality events,
private celebrations, and custom multi-day formats.

One event source moves through three connected stages:

1. **Define** - the client creates the event structure, days, dated functions,
   time windows, guests, venues, and required workstreams.
2. **Compose** - the client plans each function, selects real vendor services,
   builds menus and requirements, assigns tasks, and sees evidence-based cost.
3. **Deliver** - Admin publishes pricing and assigns an operations team; the
   team runs the schedule, records incidents and decisions, and prints a field
   event book from the same data.

The role contract is intentionally different for each audience:

- **Client:** owns the event plan and sees the complete published client price.
- **Vendor:** manages discoverable services and sees only agreed vendor payout.
- **Operations employee:** sees only assigned events and granted capabilities.
- **Platform manager:** retains broad portfolio oversight until explicitly
  converted into an event-scoped operations profile.
- **Administrator:** controls identity, pricing, billing, catalogue, permissions,
  assignments, and portfolio readiness.

## End-to-End Lifecycle

### 1. Client definition

The client enters a name, chooses from the event taxonomy or a custom type,
selects duration, assigns dates, and configures Morning, Afternoon, and Evening
functions. Each enabled function can have its own label, time, expected guests,
venue dropdown selection, and required workstreams.

Creation happens only through the final explicit action. The backend creates the
event, days, functions, selected requirement rows, and food records as one owned
structure. Stable identifiers are preserved for later saves.

### 2. Function composition

The client Event Plan uses a radial map: event hub, day branches, function
branches, and step tokens. Opening one token mounts only the selected editor.
Food, design, production, hospitality, logistics, tasks, notes, vendor services,
and special requirements remain attached to the chosen function.

Workspace saves are atomic. Event fields, venue references, nested planning, and
vendor selections either commit together or roll back together. Existing
financial or progressed booking history cannot be silently destroyed.

### 3. Readiness and cost

Layer 3 derives readiness from the same plan instead of a second checklist. The
client can reopen the exact missing function and step. The cost workspace can be
read by category or by event and separates planned, quoted, paid, due, and
variance. Custom unpriced requirements remain excluded until Elysian publishes a
final price.

### 4. Commercial control

Elysian agrees the vendor amount offline, records a fixed Elysian fee, and
publishes one final client price:

`final client price = agreed vendor amount + fixed Elysian fee`

There is no in-app negotiation or wait-for-quote state. The client pays the full
published amount to Elysian. Vendor settlement is a separate outward ledger
direction. Provider checkout is deliberately inactive until credentials, legal
approval, webhook secrets, and production canary evidence exist.

### 5. Live delivery

Admin creates operations profiles, grants capabilities, and assigns employees to
specific events. The command center exposes live pulse, function readiness,
schedule, team contacts, internal updates, incidents, decisions, escalations,
owners, due times, acknowledgement, resolution, and a printable event book.

External booking messages and the internal operations feed remain separate. The
feed is an append-only operational history; finance is hidden unless the assigned
profile has finance permission.

## Dashboard Map

### Client - plan and approve

| Workspace | Outcome |
| --- | --- |
| Dashboard | Readiness, next action, and event context |
| Event Plan | Definition, function composition, and finalization |
| Cost Estimate | Category/event spend, commitments, paid, due, variance |
| Vendors | Requirement-aware discovery, catalogue, media, shortlist |
| Guest List | Host groups, RSVP, dietary details, seating |
| Run of Show | Chronological schedule and persisted items |
| Mood Board | Saved references by category |
| Messages | Booking-linked client/vendor conversation |
| Bookings | Service, function, status, and client price |
| Billing | Invoice, received amount, due amount |
| Settings | Persisted client profile and defaults |

### Vendor - publish and deliver

| Workspace | Outcome |
| --- | --- |
| Dashboard | Inquiry, booking, payout, and next-action overview |
| Analytics | Real inquiry and booking trends |
| Profile | Public identity, coverage, media, availability |
| Services | Scope, fit, inclusions, deliverables, add-ons, item catalogue |
| Portfolio | Public visual references |
| Reviews | Published and pending feedback |
| Inquiries | Event/service brief before response |
| Confirmed | Delivery status and vendor payout only |
| Calendar | Confirmed functions grouped by month |
| Messages | Booking-aware client communication |
| Settings | Tax identifier and inquiry availability |

### Administrator - govern and settle

| Workspace group | Outcome |
| --- | --- |
| Dashboard and Analytics | Portfolio health, activity, and attention queues |
| Pricing, Billing, Revenue | Publish client price, collect, refund, settle |
| Progress | Canonical readiness and exact event gaps |
| Vendors, Clients, Venues, Destinations, Packages | Operating catalogues |
| Blog, Client Stories, Inquiries | Content and lead operations |
| Users, Team & Permissions, Settings | Identity, scope, capabilities, controls |

### Manager and operations - oversee and execute

| Workspace | Outcome |
| --- | --- |
| Operations Dashboard | Broad portfolio summary for unprofiled managers |
| Live Operations | Assigned event queue and attention counts |
| Command Center | Pulse, schedule, feed, team, incidents, decisions |
| Event Book | Printable, permission-safe field reference |
| Directory workspaces | Events, inquiries, bookings, clients, vendors, destinations |
| Messages | Permission-gated external communication oversight |
| Settings | Employee account configuration |

Once an operations profile exists, its active state, event assignment, and
capabilities become authoritative. Broad directory APIs reject scoped employees.

## Demo and Recording Runbook

Use anonymized Client, Vendor, Admin, and Operations accounts in separate browser
profiles. Prepare a corporate sample such as `Northstar Leadership Summit 2027`
with three days, multiple rooms, vendor services, guests, tasks, one published
price, one open update, and one urgent incident.

Recommended order:

1. Marketing statement and sign-in.
2. Client definition from event type through venue/workstream selection.
3. Client map composition and one persisted vendor/menu save.
4. Client readiness, cost, guest, run-of-show, booking, billing, and messages.
5. Vendor profile, service catalogue, inquiry, confirmed work, calendar, payout.
6. Admin progress, final pricing, billing, team permission, event assignment.
7. Operations event board, incident lifecycle, decision record, team, event book.
8. Close on the connected lifecycle and role-safe financial model.

The exact spoken script and click sequence live in
`docs/elysian-full-platform-walkthrough-script.md`.

## Verification Contract

Release proof is broader than a successful build. The closure gate covers:

- lint and TypeScript compilation;
- Next.js production build;
- dependency vulnerability audit;
- migration synchronization and database dry-run;
- event creation, atomic workspace saves, function lifecycle, and plan deletion;
- venue integrity, readiness, ownership, abuse controls, and message pagination;
- payment ledger, billing state machine, and inactive gateway boundary;
- operations assignment, permission, assignee, incident, and print behavior;
- 12 rollback-clean authenticated journey groups across every portal.

The journey fixture must delete all test identities, events, financial rows,
messages, media reservations, and rate-limit rows after verification.

## Known Activation Boundary

The application is complete without live payment or KYC credentials. The hosted
checkout adapter remains off by design. Production charging requires a separate
activation run with provider account approval, environment configuration,
signature-verified webhooks, canary transactions, reconciliation, refund testing,
and explicit launch approval. No test or feature flag alone may charge a client.
