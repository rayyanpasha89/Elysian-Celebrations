# Live Event Operations Design

## Purpose

Elysian must support the complete lifecycle of any event: definition, planning,
commercial confirmation, live delivery, and post-event closeout. The current
client, vendor, manager, and admin portals already cover planning and commercial
work. This design adds the missing employee operations layer without exposing
internal discussion or private pricing to clients and vendors.

## Product Decisions

- Keep Clerk/Supabase portal roles as `CLIENT`, `VENDOR`, `MANAGER`, and `ADMIN`.
- Treat `MANAGER` as the secure employee portal boundary and label it
  **Operations Portal** in the UI.
- Store employee job templates, granular permissions, and per-event assignments
  in dedicated Supabase tables. Every manager is event-scoped unless an admin
  explicitly assigns that event.
- Provide five templates: Operations Lead, Event Coordinator, Communications,
  Finance, and Viewer. Templates prefill permissions; admins may override them.
- Use a structured internal operations feed rather than mixing staff messages
  into client/vendor conversations. Feed entries can be updates, incidents,
  decisions, or escalations, with severity, ownership, due time, and resolution.
- Existing manager messages remain the controlled surface for client/vendor
  communication. The internal command center links to those threads.
- Generate the printable event book from live event data and operations state.
  Printing must not create a second editable source of truth.
- Preserve the commercial contract: clients see published totals, vendors see
  agreed payouts, operations staff see financials only with explicit permission,
  and Elysian retains complete admin visibility.

## Operations Command Center

The Operations Portal opens with assigned events ordered by urgency. Each event
shows date, destination, readiness, unresolved incidents, overdue actions, and
the next function. Opening an event provides:

1. **Live pulse** — current/next function, readiness, open incidents, overdue
   actions, and assigned team.
2. **Run of show** — day and function chronology using existing event tasks,
   timings, venues, logistics, menus, and vendor selections.
3. **Operations feed** — internal updates, incidents, decisions, and escalations.
4. **Team** — assigned employees, their event role, shift window, and contact.
5. **Partners** — selected vendors and existing controlled message links.
6. **Event book** — a print-first view of the full operational plan.

## Authorization

The server resolves effective permissions from the employee profile template and
stored permission array. Admins bypass assignment checks. Managers must have an
active profile, an active event assignment, and the permission required by the
requested operation. APIs never trust permission data from the browser.

## Event-Neutral Language

Database names such as `weddings` remain for compatibility, but active product
copy uses Event, Client, Host A, Host B, Shared, Function, and Event Plan. Wedding
examples may remain only where they are explicitly examples, not platform rules.

## Visual Direction

Dashboard home pages use one shared editorial image treatment: a restrained
cinematic image plane, dark olive overlay, compact context copy, and a real next
action. Imagery supports orientation and atmosphere; operational cards remain
high-contrast and data-first.

## Verification

- Migration parity and server-only table access.
- Permission and event-assignment denial tests.
- Incident lifecycle and immutable author/event ownership tests.
- Authenticated route tests for admin and operations roles.
- Print view rendering without private financial leakage.
- Existing client/vendor/admin journeys, lint, TypeScript, audit, and production
  build remain green.

