# Live Event Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event-scoped employee permissions, a live operations command center, a printable event book, event-neutral product language, and a complete recording walkthrough.

**Architecture:** Clerk retains coarse portal roles while Supabase stores employee templates, effective permissions, and event assignments. Role-checked Next.js APIs hydrate one event operations workspace from existing event data plus a structured internal feed. The print view consumes the same read model.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Supabase/PostgreSQL, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-23-live-event-operations-design.md`

## Global Constraints

- No client/vendor access to internal operations entries.
- No financial visibility without `VIEW_FINANCIALS`.
- Managers are event-scoped; admins retain global access.
- Keep database compatibility names but remove wedding-only active UI assumptions.
- Print output derives from live records and is read-only.

## Review Focus

- Manager requesting an unassigned event must receive 403/404 without metadata leakage.
- Inactive staff profiles or assignments must immediately lose access.
- Finance data must be omitted, not merely hidden in CSS.
- Incident resolution must preserve author, resolver, and timestamps.
- Empty or partially planned events must still print a useful event book.

### Task 1: Operations schema and permission contract

- [ ] Create staff profile, event assignment, and operations feed tables.
- [ ] Lock direct browser access and add indexes/constraints.
- [ ] Add shared permission/template helpers and generated database types.
- [ ] Add rollback-clean authorization and lifecycle verification.

### Task 2: Admin team and assignment controls

- [ ] Add admin-only staff/assignment APIs.
- [ ] Add Team & Permissions navigation and management UI.
- [ ] Preserve audit records for profile and assignment changes.

### Task 3: Operations workspace

- [ ] Add scoped event list and workspace APIs.
- [ ] Add event list, live pulse, run-of-show, feed, team, and partner UI.
- [ ] Add update/incident/escalation creation and resolution actions.

### Task 4: Printable event book

- [ ] Add print route using the same workspace hydrator.
- [ ] Add print-specific CSS, section breaks, and confidentiality labels.
- [ ] Verify that finance sections follow effective permissions.

### Task 5: Event-neutral UI and dashboard imagery

- [ ] Replace active wedding/couple assumptions in portal copy.
- [ ] Add a shared editorial dashboard image plane to all four home dashboards.
- [ ] Keep mobile, reduced-motion, and contrast behavior intact.

### Task 6: Walkthrough and release gate

- [ ] Write an exact click-by-click, two-presenter platform recording script.
- [ ] Cover marketing, client, vendor, operations, and admin portals.
- [ ] Run database, authorization, authenticated journey, accessibility-adjacent,
      lint, type, audit, and production build checks.
- [ ] Independently review, fix confirmed findings, commit, merge, and push.

