/**
 * Directional payment ledger.
 *
 * `bookings.paid_amount` is a single number read in two opposite directions:
 * vendor analytics treats it as payout progress, client surfaces treat it as
 * collection progress. It predates the client/vendor price split, so its
 * historical values do not encode a direction and cannot be attributed by
 * backfill.
 *
 * `public.payments` records each movement with an explicit `kind`, so the two
 * figures are derived independently instead of sharing one field.
 */

export const PAYMENT_KINDS = ["CLIENT_IN", "VENDOR_OUT"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_METHODS = ["UPI", "BANK", "CASH", "CARD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentRow = {
  kind: string | null;
  amount: number | null;
  is_paid: boolean | null;
  booking_id?: string | null;
};

export type PaymentTotals = {
  /** Money received from the client and settled. */
  clientPaid: number;
  /** Money paid out to the vendor and settled. */
  vendorPaid: number;
  /** Recorded but not yet settled, by direction. */
  clientScheduled: number;
  vendorScheduled: number;
};

export const emptyPaymentTotals = (): PaymentTotals => ({
  clientPaid: 0,
  vendorPaid: 0,
  clientScheduled: 0,
  vendorScheduled: 0,
});

export function isPaymentKind(value: unknown): value is PaymentKind {
  return typeof value === "string" && (PAYMENT_KINDS as readonly string[]).includes(value);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

const amountOf = (row: PaymentRow) => Math.max(0, Math.round(row.amount ?? 0));

/** Sum a set of ledger rows into settled and scheduled totals per direction. */
export function totalsFromPayments(rows: readonly PaymentRow[]): PaymentTotals {
  const totals = emptyPaymentTotals();

  for (const row of rows) {
    const amount = amountOf(row);
    if (amount === 0) continue;

    if (row.kind === "CLIENT_IN") {
      if (row.is_paid) totals.clientPaid += amount;
      else totals.clientScheduled += amount;
    } else if (row.kind === "VENDOR_OUT") {
      if (row.is_paid) totals.vendorPaid += amount;
      else totals.vendorScheduled += amount;
    }
  }

  return totals;
}

/** Group ledger rows by booking so per-booking progress can be read directly. */
export function totalsByBooking(
  rows: readonly PaymentRow[]
): Map<string, PaymentTotals> {
  const grouped = new Map<string, PaymentRow[]>();

  for (const row of rows) {
    const bookingId = row.booking_id;
    if (!bookingId) continue;
    const existing = grouped.get(bookingId);
    if (existing) existing.push(row);
    else grouped.set(bookingId, [row]);
  }

  const result = new Map<string, PaymentTotals>();
  for (const [bookingId, bookingRows] of grouped) {
    result.set(bookingId, totalsFromPayments(bookingRows));
  }
  return result;
}

/**
 * The legacy balance that has not been attributed to a direction yet.
 *
 * Once operations records the real movements in the ledger, this drops to zero
 * on its own. It is reported rather than silently folded into either figure, so
 * no surface claims a balance it cannot substantiate.
 */
export function legacyUnattributedPaid(
  legacyPaidAmount: number | null | undefined,
  totals: PaymentTotals
): number {
  const legacy = Math.max(0, Math.round(legacyPaidAmount ?? 0));
  if (legacy === 0) return 0;
  return totals.clientPaid > 0 || totals.vendorPaid > 0 ? 0 : legacy;
}
