# Client Delivery Fit-Gap - 2026-09-24

## Purpose

This document compares Elysian's current product against the operating files
shared for the client's previous destination wedding. The source files are
treated as workflow evidence, not as instructions and not as permission to
copy personal data into Elysian.

The conclusion is deliberately strict: Elysian is a substantial connected
planning, commercial, and live-delivery platform, but it is not yet a complete
replacement for every source workbook and document. A successful build or demo
does not close the missing production workflows listed below.

## Source Coverage

The top-level planning document and the following accessible linked artifacts
were reviewed:

- vendor and artist option comparisons across production categories;
- overall vendor/client payment tracker;
- guest logistics option models;
- vendor travel, tickets, identity-document, and rooming workbook;
- technical rider;
- decorator, hotel, and technical requirement checklists;
- recce agenda;
- truck and family packing checklist;
- master itinerary, showflow, stationery, sourcing, RSVP, hotel, team,
  alcohol, SFX, and salon workbooks;
- minutes of meeting and action register;
- RSVP and guest-message templates;
- family-managed guest master and passenger block records;
- final/proposed menu folder structure; and
- groom-side family relationship reference.

Three linked artifacts could not be fully read with the connected Drive
identity: the TLB team sheet, the planner-managed master guest list, and the
bride-side family tree. The final/proposed menu subfolders were visible but
their children were not returned. These are source-access gaps, not confirmed
product gaps, and must be rechecked after the owner grants access.

No guest phone numbers, government IDs, PNRs, or other personal source values
should be copied into documentation, fixtures, screenshots, or demo recordings.

## What The Client Actually Operates

The source is a connected event-production system spread across documents:

1. **Event architecture** - dates, functions, venues, guest counts, food,
   decor, technical production, rituals, and event-specific notes.
2. **Procurement** - side-by-side vendor comparisons, rates, quantities,
   inclusions, exclusions, riders, travel, staffing, overtime, media, hidden
   charges, recommendation notes, and final selection.
3. **Commercial control** - vendor gross/net/GST, milestones, advances,
   reimbursements, contracts, client collections, and hotel costs.
4. **Guest operations** - relationships, host groups, invitation/RSVP state,
   arrival/departure, tickets, rooming, pickups, accessibility, meals, seating,
   and family-specific handling.
5. **Vendor and crew logistics** - travel, PNRs, room allocation, food,
   transport, call times, contacts, roles, and identity-document custody.
6. **Hospitality** - check-in desks, room keys, luggage, hampers, side hotels,
   help desks, salon, butlers/shadows, housekeeping, and service recovery.
7. **Production** - tech riders, decor/hotel checklists, permits, licenses,
   security, SFX, power, signage, print collateral, rehearsals, and approvals.
8. **Inventory and movement** - sourcing, quantities, custody, packing,
   truck load/unload, event-wise allocation, handover, return, and final tally.
9. **Communications** - scheduled RSVP follow-ups and event-day guest
   broadcasts for arrival, functions, venues, hospitality, and departure.
10. **Live execution** - minute-level showflow, named ownership, departments,
    zones, shifts, briefings, incidents, decisions, escalations, and closure.

## Capability Matrix

### Built And Verified In The Current Release Lane

| Client need | Elysian capability | Evidence |
| --- | --- | --- |
| Multi-day event definition | Name, event type, dates, days, time blocks, venues, guest counts, and selected workstreams | Client onboarding, Event Plan, transactional wedding APIs |
| Function-by-function planning | Radial map and scoped editors for basics, food, design, production, hospitality, logistics, tasks, and notes | `/client/wedding` |
| Vendor catalogue and service selection | Vendor profiles, service scope, inclusions, deliverables, add-ons, item catalogues, media, shortlist, and multi-service selection | Client Vendors, Vendor Services, event workspace save |
| Menu composition | Menus, meal periods, service style, dietary tags, vendor catalogue rows, and custom items | Event Plan food editor and menu tables |
| Venue catalogue | Admin-managed venues with destination, capacity, amenities, availability, and event selection | Admin Venues, venue API, venue integrity tests |
| Event readiness | Canonical function readiness and exact gaps surfaced across client, admin, and operations | Layer 3, Admin Progress, operations event board |
| Cost and final price | Function estimates, event/category views, admin-set vendor amount plus fixed Elysian fee, and published client price | Cost Estimate, Admin Pricing |
| Client collection ledger | Installments, manual receipt settlement, voids, refunds, receipts, and client billing view | Admin Billing, Client Billing, billing RPC tests |
| Vendor settlement ledger | Vendor payout direction is separate from client collection and hides Elysian economics | Booking payment ledger and vendor views |
| Guest basics | Host group, RSVP, meal preference, contact, notes, plus-one, seating, and table assignment | Client Guest List and guest APIs |
| Run of show basics | Function times, load-in, host call, guest arrival, custom moments, tasks, and completion | Client Run of Show and timeline APIs |
| Inspiration | Categorized mood-board items with image and source links | Client Mood Board |
| Booking-linked communication | Client/vendor/manager threads with booking and function context | Messages APIs and dashboards |
| Employee permissions | Admin-created operations profiles, role templates, active state, and event-scoped capabilities | Admin Team and permission APIs |
| Live event command | Assigned event queue, schedule, departments, zones, crew shifts, check-in/out, briefings, acknowledgements, updates, incidents, decisions, escalations, and print event book | Manager Operations and operations database tests |
| Shared production dossier | Event/function-scoped contracts, riders, permissions, recce, approvals, transport, rooming, hospitality, communications, inventory, packing, finance, and family records with owner, due date, status, visibility, reference links, optimistic updates, and append-only activity | Production Dossier tab, production APIs, atomic RPC, print event book, database and authenticated journey tests |
| Role-safe finance | Clients see published totals; vendors see agreed payouts; operations finance is permission-gated | Billing and operations authorization contracts |

### Partial Foundations That Do Not Yet Replace The Source Files

| Client need | Present foundation | Missing depth |
| --- | --- | --- |
| Vendor procurement | Vendor discovery, shortlist, services, bookings | No side-by-side commercial comparison register, scoring, recommendation, approval, alternate, hidden-charge, overtime, or negotiation-history fields |
| Detailed guest operations | Guest list, RSVP, dietary notes, seating | No household/relationship graph, invitation delivery, travel itinerary, room, hotel, pickup, ID custody, accessibility workflow, or guest-level message history |
| Logistics | Per-function transport and rooming notes; operations zones and shifts | Notes are not transport manifests, vehicle allocation, routes, passenger groups, rooming lists, keys, luggage, or transfer status |
| Event tasks | Owner, status, due date per function | No dependencies, approval gates, evidence, comments, recurrence, cross-event workstream, or change-control history |
| Run of show | Chronological function moments and operations feed | No cue-level predecessor/dependency model, rehearsals, hold/release states, versioning, or function-specific crew calls |
| Hospitality | Planning notes and hospitality vendor category | No room-key, luggage, hamper, amenity, salon booking, butler/shadow, side-hotel, or service-recovery registers |
| Documents and media | Mood board, vendor media, and a permission-scoped production dossier with classified HTTPS reference links | No first-party event file upload, folder taxonomy, file versions, document diff, retention policy, malware scanning, or dedicated identity-document vault |
| Menus | Structured menu and dietary items | No menu-version comparison, tasting notes, hotel grid, guaranteed minimum, per-item quantities, service-counter plan, or printable banquet brief |
| Operations staffing | Event roles, departments, zones, shifts, briefings | No contact-tree escalation SLA, equipment issue, attendance exception, replacement request, or payroll/per-diem register |
| Reporting | Dashboards, analytics, event readiness, billing summaries | No client-source export pack, procurement variance, room-night, transport, inventory, or communication completion reports |

### Missing First-Class Workflows

The following are not currently complete product workflows and must not be
represented to the client as shipped:

1. **First-party secure document vault** beyond the shipped production dossier:
   direct upload, versions, folder taxonomy, retention, malware scanning,
   signed-file state, and restricted identity-document custody.
2. **Vendor comparison and procurement board** with option rows, quantities,
   unit rates, taxes, inclusions/exclusions, travel/stay, overtime, hidden costs,
   recommendation, selection, approvals, and source media.
3. **Guest travel and rooming** with households, relationships, invitation
   state, flights/trains, PNR/reference, passenger groups, pickup/drop,
   vehicles, hotels, room allocation, keys, luggage, and checkout.
4. **Vendor/artist travel and accommodation** with team members, departments,
   routes, ticket status, room nights, food/per-diem, identity-document access,
   and arrival/departure manifests.
5. **Guest broadcast communications** with templates, audience segments,
   scheduled messages, approval, human send/WhatsApp export, delivery status,
   and opt-out/consent controls.
6. **Recce workflow** with agenda, participants, findings, decisions, images,
   follow-ups, owners, due dates, and conversion into plan changes.
7. **Inventory, sourcing, packing, and truck control** with quantities,
   purchase/source, custody, box/vehicle, load/unload, event allocation,
   consumption, return, damage, and reconciliation.
8. **Stationery and signage production** with artwork, dimensions, material,
   quantity, designer, printer, approval, print status, delivery, placement,
   and cost.
9. **License and compliance register** covering music, alcohol, drone, fire,
   venue permissions, security, insurance, documents, deadlines, owner, and
   approval evidence.
10. **Alcohol and bar inventory** with brand, quantity, issue/return, seal/open
    state, handover, license, supplier, consumption, and reconciliation.
11. **Expense, advance, reimbursement, and petty-cash workflow** separate from
    client invoices and vendor payout obligations.
12. **Family relationship and photography brief** with relationship groups,
    VIP handling, ritual roles, portrait groups, and shot completion.
13. **Structured hotel operations** with room-night blocks, guaranteed
    minimums, incidentals policy, VIP flags, early/late check-in, amenities,
    keys, floors, and hotel action owners.
14. **Approvals and change control** across procurement, creative, operations,
    commercial exceptions, documents, menus, and live decisions.

## External And Source Blockers

- Live online client charging is intentionally disabled until a provider is
  selected, marketplace KYC and settlement terms are approved, credentials and
  signed webhooks are supplied, and canary transactions are authorized.
- Clerk production credentials and production-domain settings must be verified
  before a public client launch.
- The latest operations branch is pushed but is not evidence of deployment to
  the canonical domain.
- The inaccessible linked artifacts and hidden menu-folder contents require the
  source owner to grant access before exact field parity can be signed off.
- WhatsApp delivery requires an approved provider/template/consent model. Until
  then, Elysian can generate and track human-approved exports but cannot claim
  automated delivery.

## Closure Order

### P0 - Required Before Calling The Client Workflow End To End

1. First-party secure file storage and identity-document controls on top of the
   shipped production dossier and classified reference links.
2. Procurement comparison and final-selection register.
3. Guest travel, rooming, transport, and hospitality operations.
4. Vendor/artist travel and accommodation.
5. Guest communication campaign and human-approved send/export workflow.
6. Inventory, packing, truck, sourcing, stationery, and handover controls.
7. Specialized field views for the dossier's licenses, riders, contracts,
   recce, compliance, approvals, and change-control records.
8. Client-facing cross-workstream review/export pack beyond the internal event
   book that now includes permission-safe production records.

### P1 - Required For Operational Maturity

1. Dependency-aware tasks, approvals, and change-control history.
2. Cue-level run of show with rehearsals, hold/release, and versioning.
3. Family/VIP/ritual/photography relationship plan.
4. Alcohol and bar reconciliation.
5. Expenses, advances, reimbursements, and petty cash.
6. Operational reports for transport, room nights, inventory, procurement, and
   communications.

### P2 - External Activation

1. Production Clerk configuration and role canaries.
2. Payment provider/KYC/webhook/refund/payout activation.
3. Approved WhatsApp or messaging provider integration.
4. Final production deployment, authenticated role-by-role browser QA, mobile
   QA, persistence checks, audit checks, and release canary.

## Definition Of Client-Ready

The product may be called client-ready only when:

- every P0 workflow persists real records and has ownership and permission
  tests;
- every user-visible mutation has success, validation, conflict, and failure
  behavior;
- sensitive guest/vendor travel documents are access-controlled and excluded
  from general exports;
- the same event can be created, composed, commercially approved, staffed,
  executed, printed, and closed without returning to an external spreadsheet;
- role-by-role authenticated browser journeys pass against the release
  candidate;
- database migrations, lint, TypeScript, production build, security checks,
  rollback-clean regressions, and production canaries are fresh; and
- external activation boundaries are described honestly rather than replaced
  with simulated success.
