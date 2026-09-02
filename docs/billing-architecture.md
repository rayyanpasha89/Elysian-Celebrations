# Elysian Billing Architecture

This document is the source of truth for client collections and vendor payouts.
The current implementation is production-safe for manually reconciled payments.
The commercial collection model is fixed: Elysian collects the complete
published client price and settles vendors separately. Online checkout remains
deliberately disabled until a marketplace provider, KYC account, settlement
agreement, and credentials are approved.

## Commercial Model

- Admin records an agreed vendor amount plus a fixed Elysian fee.
- Elysian invoices and collects the complete published client price: vendor
  amount + Elysian fee.
- The vendor sees only the agreed vendor amount and its payout history.
- Elysian retains the fixed fee and settles the agreed vendor amount through a
  separate payout direction.
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
- `POST /api/client/billing/[id]/checkout` starts or safely reuses a hosted
  checkout attempt for an issued invoice. It requires a client-owned invoice,
  rate limit, and idempotency key.
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

### Provider Webhook

- `POST /api/webhooks/billing/[provider]` accepts only the currently active
  adapter, caps the raw body, verifies the provider signature before any write,
  stores only a SHA-256 digest, and applies the normalized event through one
  replay-safe transaction.

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

The shared implementation uses hosted redirect checkout only. Elysian never
collects or stores card numbers, bank credentials, UPI PINs, or raw provider
payloads. The database RPCs `begin_billing_checkout`,
`attach_billing_checkout_order`, `fail_billing_checkout_attempt`, and
`process_billing_gateway_event` enforce ownership, one active provider attempt,
amount matching, order identity, delivery replay protection, delayed webhook
recovery, and exactly-once invoice settlement. `ELYSIAN_APP_URL` must be an
HTTPS origin when a production adapter is activated.

The chosen model requires an India-capable marketplace or split-settlement
product. Provider evaluation should proceed in this order, subject to commercial
approval and onboarding terms:

1. [Razorpay Route](https://razorpay.com/docs/payments/route/linked-account/) with
   hosted [Payment Links](https://razorpay.com/docs/api/payments/payment-links/).
   Route supports INR linked accounts and transfers from captured client
   payments, including transfer and settlement webhooks.
2. [Cashfree Easy Split](https://www.cashfree.com/docs/payments/split/overview)
   with Payment Gateway or Payment Links. Easy Split supports vendor onboarding,
   payment splitting, scheduled settlements, refunds, and vendor-settlement
   webhooks, but must be activated for the merchant account.
3. [Stripe Connect India](https://stripe.com/in/connect) is not the default path
   while the India product remains invitation-only.

No provider has been selected or activated in code. After selection, the adapter
needs marketplace KYC approval, credentials, verified webhook secrets,
production return URLs, provider-side idempotency, webhook replay tests,
failure/retry tests, refund and payout reconciliation, and a low-value live
payment canary. No secret belongs in `NEXT_PUBLIC_*` variables.

Automated vendor release also requires an explicit treasury policy: settle only
against captured client funds, or permit Elysian-funded early payouts. The
current manual payout ledger deliberately does not make that business decision.

## Verification

Run with Node 22:

```bash
npm run test:payments
npm run test:billing
npm run test:billing-gateway
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

The gateway suite adds 13 rollback-clean cases for ownership, grants, attempt
reuse, provider-order idempotency, provider failure, unknown-order recovery,
capture settlement, duplicate delivery, payload tampering, and late failure.
