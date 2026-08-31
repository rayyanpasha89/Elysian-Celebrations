# Elysian Billing Architecture

This document is the source of truth for client collections and vendor payouts.
The current implementation is production-safe for manually reconciled payments.
Online checkout remains deliberately disabled until Elysian confirms its legal
collection model, provider, and KYC account.

## Commercial Model

- Admin records an agreed vendor amount plus a fixed Elysian fee.
- The client sees only the published final price: vendor amount + Elysian fee.
- Client collections and vendor payouts are different directions and never
  share a write flow.
- Client collections use invoices. Vendor payouts use the directional booking
  ledger.
- Prices cannot be reshaped after an active invoice exists. Operations must
  void an unpaid invoice first or record a refund after settlement.

## Financial Entities

### `payments`

The directional money-movement ledger.

- `CLIENT_IN`: a client obligation or settled receipt.
- `VENDOR_OUT`: a scheduled or settled vendor payout.
- Settled rows are immutable and cannot be voided.
- Unpaid schedules may be voided with an explicit reason.

### `billing_invoices`

One immutable client installment linked one-to-one to a `CLIENT_IN` payment.
Each booking has sequential installment numbers and booking-scoped idempotency
keys. Status is derived from its payment and processed refunds:

- `ISSUED`
- `PAID`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `VOID`

Amounts are stored as whole INR rupees. Gateway attempts store `amount_minor`
in paise and must equal invoice amount multiplied by 100.

### `billing_payment_attempts`

Provider checkout/order state. Attempts are separate from invoices so failed or
abandoned checkouts never alter the financial obligation. Provider order and
payment identifiers are unique. Raw card, bank, UPI, and payment payload data is
not stored.

### `billing_refunds`

Append-only refund events. A refund has its own provider/idempotency identity,
amount, method, reason, and processing state. Processed refunds update invoice
net receipt state; they never erase the original receipt.

### `billing_webhook_events`

Webhook replay protection and processing metadata. It stores a provider event
ID and SHA-256 payload digest, not the raw provider payload.

## Atomic Database Operations

All financial writes use locked, `security definer` RPCs rather than direct
service-role table mutations:

- `set_booking_pricing`
- `issue_booking_invoice`
- `settle_billing_invoice`
- `void_billing_invoice`
- `record_billing_refund`
- `record_booking_payment` for vendor payouts
- `settle_booking_payment` for vendor payouts
- `void_booking_payment` for unpaid schedules

Pricing updates use optimistic concurrency through `bookings.updated_at` and a
row lock. Invoice issue and refund operations require idempotency keys, making a
network retry safe. Foreign keys use restrictive deletion so audit history
cannot disappear through a parent delete.

The application `service_role` can select billing records for server-rendered
workspaces, but it cannot mutate billing tables or consume invoice numbers
directly. All financial writes must cross the audited security-definer RPC
surface.

## HTTP And Role Boundaries

### Client

- `GET /api/client/billing`
- Returns only the signed-in client's invoices, event context, public vendor and
  service labels, totals, and checkout capability.
- Does not expose internal references, notes, actor IDs, void reasons, provider
  attempt details, vendor amounts, or the Elysian fee split.

### Admin

- `GET /api/admin/billing`: reconciliation workspace.
- `POST /api/admin/billing`: issue an invoice.
- `PATCH /api/admin/billing/[id]`: settle, void, or refund.
- Mutations are rate-limited and audited.

### Vendor And Manager

- Vendors see their agreed payout direction only.
- The shared booking payment editor can create vendor payouts only.
- Client receipts must be managed from Admin Billing.

## User Interfaces

- `/client/billing`: installment timeline, received/refunded totals, outstanding
  and overdue state, and event/vendor context. It intentionally has no fake
  checkout button while gateway capability is disabled.
- Invoice due dates are business dates; overdue status turns over at midnight
  in `Asia/Kolkata`, not at Vercel's UTC process boundary.
- `/admin/billing`: reconciliation summary, fixed-price invoice issuer, invoice
  register, manual receipt confirmation, unpaid voids, append-only refunds, and
  technical attempt/refund history.
- `/admin/pricing`: fixes and publishes the commercial price, then links to the
  billing workspace for collections.

## Gateway Boundary

`src/lib/billing-gateway.ts` defines the provider-neutral contract for checkout
creation and verified webhook normalization. `activeBillingGateway()` currently
returns `null`, so setting an environment variable cannot accidentally enable
online payment collection.

Before implementing an adapter, Elysian must choose one collection model:

1. Elysian collects the full published client price and later settles vendors.
   This generally requires a marketplace/split-settlement product and the
   corresponding KYC, agreements, refund, tax, and reconciliation process.
2. Elysian collects only its own fee online while vendor amounts move offline.

After that choice, the adapter needs provider credentials, verified webhook
secrets, production return URLs, provider-side idempotency, webhook replay
tests, failure/retry tests, refund reconciliation, and a low-value live payment
canary. No secret belongs in `NEXT_PUBLIC_*` variables.

## Verification

Run with Node 22:

```bash
npm run test:payments
npm run test:billing
npm run db:migrations
npm run db:push:dry-run
npm run lint
npx tsc --noEmit --pretty false
npm audit --omit=dev
npm run build
```

The billing suite executes issue, duplicate retry, retry-safe settlement,
over-allocation, paid/refunded-void rejection, terminal partial/full refund
states, over-refund rejection, pricing lock, and grant/RLS checks inside a full
database rollback.
