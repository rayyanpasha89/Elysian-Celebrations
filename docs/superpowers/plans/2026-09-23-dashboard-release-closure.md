# Dashboard Release Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining dashboard gaps across client, vendor, operations, and admin portals, prove the persisted journeys locally, and publish a complete visual walkthrough handbook.

**Architecture:** Preserve the existing role-specific portal architecture and server-owned Supabase access. Remove non-persistent simulation rather than introducing another parallel planning model, keep operations employees event-scoped, and let unprofiled platform managers retain their existing broad operational authority. Extend the isolated authenticated journey harness so verification covers mutations and cleanup, not only route rendering.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Clerk test-auth bypass, Supabase/Postgres, Framer Motion, ReportLab, Poppler.

**Spec:** `docs/superpowers/specs/2026-09-23-live-event-operations-design.md`

## Global Constraints

- Clients pay the complete published price to Elysian; vendors see only their agreed payout.
- Payment-provider activation remains disabled until provider onboarding, KYC, production secrets, and settlement policy are approved.
- Operations employees see only assigned events and granted capabilities.
- Platform managers without an operations profile retain broad legacy management access.
- Test fixtures must be isolated, rollback-clean, and prohibited in production.
- Do not merge to `main` or deploy production during this pass.

## Review Focus

- An inactive operations employee must not regain broad manager access.
- An unprofiled platform manager must be able to open the operations event list and workspace.
- Client-facing payloads must never expose vendor payout or Elysian fee values.
- Vendor-facing payloads must never expose the complete client invoice.
- Failed mutations must show an error and must not render a false success or empty state.

---

### Task 1: Replace the simulated manager configurator

**Files:**
- Modify: `src/app/(dashboard)/manager/layout.tsx`
- Modify: `src/app/(dashboard)/manager/configurator/page.tsx`

- [x] Remove the non-persistent multiplier calculator from manager navigation.
- [x] Redirect the legacy URL to the persisted Event Directory so bookmarks do not break.
- [x] Confirm no user-facing dashboard claims that simulated figures are saved prices.

### Task 2: Complete platform-manager operations access

**Files:**
- Modify: `src/lib/operations-auth.ts`
- Modify: `src/lib/operations-server.ts`
- Modify: `scripts/verify-authenticated-journeys.ts`

- [x] Treat a manager with no operations profile as a platform manager with full operations permissions.
- [x] Continue treating active profiled managers as event-scoped and inactive profiles as scoped with no events.
- [x] Add authenticated assertions for broad-manager access before assignment and restricted access after assignment.

### Task 3: Harden shared dashboard navigation

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/components/dashboard/topbar.tsx`

- [x] Confirm dialog semantics, Escape handling, focus entry, focus restoration, and expanded-state attributes already protect mobile navigation.
- [x] Confirm menu semantics, expanded-state attributes, Escape handling, and outside-click closure already protect topbar menus.
- [x] Verify the configurator removal does not alter keyboard or desktop navigation.

### Task 4: Expand persisted dashboard journey coverage

**Files:**
- Modify: `scripts/verify-authenticated-journeys.ts`
- Modify: `docs/product-rebuild-tracker.md`

- [x] Exercise platform-manager pages before event scoping.
- [x] Exercise client supporting workspaces and vendor business settings through their APIs where the harness already owns isolated data.
- [x] Assert role privacy, cleanup, and rate-limit cleanup after every run.
- [x] Record exact verification evidence in the tracker.

### Task 5: Verify and publish the dashboard handbook

**Files:**
- Modify: `docs/elysian-full-platform-walkthrough-script.md`
- Create: `docs/elysian-dashboard-flow-handbook.md`
- Create: `output/pdf/elysian-dashboard-flow-handbook.pdf`

- [x] Update the narration to reflect the final manager and operations boundaries.
- [x] Document every sidebar destination by role, its purpose, main action, and evidence source.
- [x] Include event-neutral client planning, vendor fulfilment, administrator control, event-day operations, billing boundaries, print flow, and recording guidance.
- [x] Generate the PDF, extract its text, render every page to PNG, and visually inspect for clipping, overflow, and broken typography.

### Task 6: Final release gate

**Files:**
- Verify only.

- [x] Run lint, TypeScript, production build, dependency audit, migration dry-run, all focused suites, and authenticated journeys.
- [x] Run `git diff --check` and review the complete branch diff.
- [x] Commit only intended files and push `codex/live-operations` without merging or deploying production.
