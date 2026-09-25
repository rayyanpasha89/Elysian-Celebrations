# Client Workflow Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client's spreadsheet-and-document operating system with connected, permission-safe Elysian workflows from procurement through event closure.

**Architecture:** Add focused event-production tables for shared records, then expose them through event-scoped APIs and manager workspaces. Extend guests with travel/rooming fields rather than duplicating people. Keep client collections, vendor payouts, staff operations, and sensitive identity documents as separate authorization domains.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL, Clerk, existing dashboard primitives, existing operations permission model.

**Spec:** `docs/client-delivery-fit-gap-2026-09-24.md`

## Global Constraints

- Elysian collects the complete published client price and settles the agreed vendor payout separately.
- Vendors are selected from catalogue records; client users do not type fictional vendors.
- Sensitive identity references, PNRs, and travel documents are never exposed through broad directory APIs or general print exports.
- Every event mutation rechecks the authenticated role, active staff profile, event assignment, and capability on the server.
- New public-schema tables enable RLS and grant no browser mutation path.
- No live payment or messaging provider is activated without approved credentials, signatures, consent rules, and production canaries.
- Existing unrelated worktree files are not staged or reverted.

## Review Focus

- Cross-event IDs must be rejected even when the caller can access both events.
- Removing an employee or guest must not erase financial, approval, or audit history.
- Concurrent status updates must not silently overwrite newer approvals or handovers.
- Sensitive document classes must be excluded from print/export responses.
- Dates, room nights, shifts, and transport legs must remain correct in `Asia/Kolkata`.

---

### Task 1: Event Production Register

**Files:**
- Create: `supabase/migrations/<generated>_event_production_register.sql`
- Create: `scripts/verify-event-production.ts`
- Modify: `package.json`
- Modify: `src/types/database.types.ts`

**Interfaces:**
- Produces `event_production_records`, `event_production_attachments`, and `event_production_activity` with event-scoped foreign keys, constrained record/status/visibility values, optimistic version, and append-only activity.

- [x] **Step 1: Write the failing database regression**

```ts
await client.query("insert into event_production_records (wedding_id, record_type, title, created_by) values ($1, 'LICENSE', 'Music license', $2)", [eventId, adminId]);
await assertRejects(() => client.query("update event_production_records set wedding_event_id = $1 where wedding_id = $2", [foreignFunctionId, eventId]), "cross-event function");
await assertRejects(() => anon.query("select * from event_production_records"), "browser grant");
```

- [x] **Step 2: Run `npx tsx scripts/verify-event-production.ts` and confirm the missing-table failure.**
- [x] **Step 3: Generate the migration with `npx supabase migration new event_production_register`.**
- [x] **Step 4: Add constrained tables, indexes, updated-at trigger, RLS, grants, and audit trigger.**
- [x] **Step 5: Regenerate database types and run the regression to green.**
- [x] **Step 6: Commit only the migration, test, generated type, and package script.**

### Task 2: Permission-Safe Production API

**Files:**
- Create: `src/lib/event-production.ts`
- Create: `src/app/api/operations/events/[id]/production/route.ts`
- Create: `src/app/api/operations/events/[id]/production/[recordId]/route.ts`
- Modify: `src/lib/operations.ts`
- Modify: `scripts/verify-authenticated-journeys.ts`

**Interfaces:**
- Produces typed `ProductionRecord`, `ProductionRecordType`, `ProductionStatus`, `GET/POST /api/operations/events/:id/production`, and `PATCH/DELETE /api/operations/events/:id/production/:recordId`.

- [x] **Step 1: Add failing journey cases for unassigned manager, read-only employee, cross-event record ID, stale version, successful create/update, and protected-history delete.**
- [x] **Step 2: Run `npm run test:journeys` and confirm the new endpoint cases fail.**
- [x] **Step 3: Implement Zod payload validation, event-access recheck, capability checks, optimistic version updates, bounded arrays/text, and activity writes.**
- [x] **Step 4: Run journey and production regressions to green.**
- [x] **Step 5: Commit API, types, permissions, and tests.**

### Task 3: Production Dossier Workspace

**Files:**
- Create: `src/components/dashboard/operations-production-panel.tsx`
- Modify: `src/app/(dashboard)/manager/operations/[id]/page.tsx`
- Modify: `src/app/(dashboard)/manager/operations/[id]/print/page.tsx`

**Interfaces:**
- Consumes production APIs.
- Produces tabs for Procurement, Documents & compliance, Recces & approvals, Inventory & stationery, Travel & rooming, Guest communications, and Expenses.

- [x] **Step 1: Add browser journey assertions for tab availability, empty guidance, create, validation failure, status transition, and reload persistence.**
- [x] **Step 2: Run the journey and confirm UI assertions fail.**
- [x] **Step 3: Build the panel with record-type templates, event/function scope, department/zone/owner, due date, money, structured details, attachments, status, and activity history.**
- [x] **Step 4: Extend print output with safe records while excluding `PRIVATE_IDENTITY` attachments and internal financial notes.**
- [x] **Step 5: Run browser journey, lint, TypeScript, and build.**
- [x] **Step 6: Commit the dossier workspace.**

### Task 4: Guest Travel, Rooming, And Hospitality

**Files:**
- Create: `supabase/migrations/<generated>_guest_travel_rooming.sql`
- Create: `src/app/api/guests/[id]/travel/route.ts`
- Create: `src/components/dashboard/guest-operations-panel.tsx`
- Modify: `src/app/(dashboard)/client/guests/page.tsx`
- Modify: `src/app/api/guests/route.ts`
- Modify: `src/app/api/guests/[id]/route.ts`
- Modify: `scripts/verify-authenticated-journeys.ts`

**Interfaces:**
- Produces household/relationship, invitation state, travel legs, transport allocation, hotel/room, key/luggage/check-in/out, accessibility, and hospitality owner records.

- [x] **Step 1: Add failing ownership, cross-guest, travel-leg chronology, room-night, and reload-persistence cases.**
- [x] **Step 2: Generate migration and add owned child tables with restrictive sensitive-field access.**
- [x] **Step 3: Add API validation and guest workspace tabs for List, Seating, Travel, and Rooming.**
- [x] **Step 4: Add manifest CSV/print export with sensitive fields omitted by default.**
- [x] **Step 5: Run guest journeys, lint, TypeScript, build, and migration dry-run.**
- [x] **Step 6: Commit guest operations.**

### Task 5: Vendor And Crew Travel

**Files:**
- Create: `supabase/migrations/<generated>_vendor_crew_travel.sql`
- Create: `src/app/api/operations/events/[id]/travel/route.ts`
- Create: `src/components/dashboard/operations-travel-panel.tsx`
- Modify: `src/app/(dashboard)/manager/operations/[id]/page.tsx`
- Modify: `scripts/verify-event-operations.ts`

**Interfaces:**
- Produces vendor/artist/crew travelers, travel legs, accommodation, food/per-diem, pickup, arrival, and departure status.

- [x] **Step 1: Add failing event-scope, booking/vendor association, chronology, and restricted-identity tests.**
- [x] **Step 2: Build the event-scoped schema and atomic API while rejecting raw passport, Aadhaar, PAN, government-ID, and PNR values. Secure document custody remains a separate vault workflow.**
- [x] **Step 3: Build the transport and rooming manifest UI with selected-booking linkage, department/function filters, and arrival exception states.**
- [x] **Step 4: Verify rollback-clean database cases, authenticated role journeys, desktop/mobile UI, lint, TypeScript, build, and migration state; commit the isolated slice.**

### Task 6: Guest Communication Campaigns

**Files:**
- Create: `supabase/migrations/<generated>_guest_communications.sql`
- Create: `src/app/api/operations/events/[id]/communications/route.ts`
- Create: `src/components/dashboard/guest-communications-panel.tsx`
- Modify: `src/app/(dashboard)/manager/operations/[id]/page.tsx`
- Modify: `scripts/verify-event-operations.ts`

**Interfaces:**
- Produces templates, segments, scheduled messages, approval, human-approved export, delivery/import status, and consent/opt-out handling; no automatic provider send.

- [ ] **Step 1: Add failing tests for unapproved export, opted-out guest inclusion, cross-event audience, and immutable sent snapshot.**
- [ ] **Step 2: Implement campaign schema and API with an explicit `DRAFT -> APPROVED -> EXPORTED -> SENT` state machine.**
- [ ] **Step 3: Build template library for RSVP, arrival, room keys, function invitations, breakfast, departure, emergency, and thank-you messages.**
- [ ] **Step 4: Add CSV/WhatsApp-ready export and delivery-result import.**
- [ ] **Step 5: Verify and commit.**

### Task 7: Procurement Comparison And Commercial Approval

**Files:**
- Create: `supabase/migrations/<generated>_event_procurement.sql`
- Create: `src/app/api/operations/events/[id]/procurement/route.ts`
- Create: `src/components/dashboard/procurement-board.tsx`
- Modify: `src/app/(dashboard)/manager/operations/[id]/page.tsx`
- Modify: `src/app/(dashboard)/admin/pricing/page.tsx`
- Modify: `scripts/verify-event-operations.ts`

**Interfaces:**
- Produces requirements, option comparisons, line quantities, taxes, hidden costs, travel/stay, inclusions/exclusions, score, recommendation, approval, selection, and booking conversion.

- [ ] **Step 1: Add failing tests for unpublished vendor data, unauthorized selection, stale approval, and final-price mismatch.**
- [ ] **Step 2: Implement procurement schema/API and audit trail.**
- [ ] **Step 3: Build side-by-side comparison and approval UI.**
- [ ] **Step 4: Convert an approved option into the existing booking/pricing path without bypassing `set_booking_pricing`.**
- [ ] **Step 5: Verify pricing, booking, billing, and procurement regressions; commit.**

### Task 8: Inventory, Sourcing, Packing, And Handovers

**Files:**
- Create: `supabase/migrations/<generated>_event_inventory.sql`
- Create: `src/app/api/operations/events/[id]/inventory/route.ts`
- Create: `src/components/dashboard/inventory-control-panel.tsx`
- Modify: `src/app/(dashboard)/manager/operations/[id]/page.tsx`
- Modify: `scripts/verify-event-operations.ts`

**Interfaces:**
- Produces item, source, quantity/unit, cost, custodian, box/vehicle, function allocation, loaded/unloaded/issued/returned/damaged quantities, and handover signatures.

- [ ] **Step 1: Add failing quantity-balance, negative-stock, cross-event allocation, and handover-history tests.**
- [ ] **Step 2: Implement schema/API and derived balance validation.**
- [ ] **Step 3: Build sourcing, packing, truck, event issue, and return views plus printable load sheets.**
- [ ] **Step 4: Verify and commit.**

### Task 9: Compliance, Recce, And Change Control

**Files:**
- Create: `src/components/dashboard/compliance-recce-panel.tsx`
- Modify: `src/app/api/operations/events/[id]/production/route.ts`
- Modify: `src/app/(dashboard)/manager/operations/[id]/page.tsx`
- Modify: `scripts/verify-authenticated-journeys.ts`

**Interfaces:**
- Uses production records/activity to implement license deadlines, rider acceptance, recce findings, approval gates, decision history, and linked plan changes.

- [ ] **Step 1: Add failing tests for overdue compliance, approval revocation reason, and immutable activity history.**
- [ ] **Step 2: Add focused compliance/recce views and action-to-task conversion.**
- [ ] **Step 3: Add change request states and compare-before/after details.**
- [ ] **Step 4: Verify and commit.**

### Task 10: Release Proof And Client Demo Data

**Files:**
- Create: `scripts/verify-client-delivery-closure.ts`
- Create: `docs/client-demo-runbook-2026-09-24.md`
- Modify: `docs/elysian-full-platform-walkthrough-script.md`
- Modify: `docs/client-delivery-fit-gap-2026-09-24.md`

**Interfaces:**
- Produces one rollback-clean cross-role scenario and a privacy-safe client demonstration runbook.

- [ ] **Step 1: Build a rollback-clean multi-day fixture with procurement, guests, travel, rooming, communications, documents, licenses, inventory, billing, crew, and one live incident.**
- [ ] **Step 2: Assert the complete client-admin-vendor-operations lifecycle and cleanup.**
- [ ] **Step 3: Run all project regressions, lint, TypeScript, dependency audit, production build, schema lint/advisors, migration parity, and dry-run.**
- [ ] **Step 4: Perform authenticated desktop/mobile browser QA for all roles and capture failures before release.**
- [ ] **Step 5: Update the fit-gap only with evidence from the release candidate.**
- [ ] **Step 6: Commit the runbook and verification evidence; do not deploy without explicit approval.**
