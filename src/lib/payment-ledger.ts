export const PAYMENT_KINDS = ["CLIENT_IN", "VENDOR_OUT"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_METHODS = [
  "UPI",
  "BANK",
  "CASH",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentLedgerRow = {
  id?: string;
  booking_id?: string | null;
  kind?: string | null;
  label?: string | null;
  amount?: number | null;
  due_date?: string | null;
  is_paid?: boolean | null;
  paid_at?: string | null;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  created_at?: string | null;
};

export type PaymentTotals = {
  clientPaid: number;
  clientScheduled: number;
  vendorPaid: number;
  vendorScheduled: number;
};

export type BookingPaymentSummary = PaymentTotals & {
  clientTarget: number | null;
  clientDue: number | null;
  vendorTarget: number | null;
  vendorDue: number | null;
};

export function isPaymentKind(value: unknown): value is PaymentKind {
  return (
    typeof value === "string" &&
    (PAYMENT_KINDS as readonly string[]).includes(value)
  );
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

function money(value: number | null | undefined) {
  return Math.max(0, Math.round(value ?? 0));
}

export function totalsFromPayments(
  rows: readonly PaymentLedgerRow[]
): PaymentTotals {
  const totals: PaymentTotals = {
    clientPaid: 0,
    clientScheduled: 0,
    vendorPaid: 0,
    vendorScheduled: 0,
  };

  for (const row of rows) {
    if (row.voided_at) continue;
    const amount = money(row.amount);
    if (!amount) continue;

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

export function bookingPaymentSummary({
  rows,
  finalPrice,
  vendorAmount,
}: {
  rows: readonly PaymentLedgerRow[];
  finalPrice: number | null | undefined;
  vendorAmount: number | null | undefined;
}): BookingPaymentSummary {
  const totals = totalsFromPayments(rows);
  const clientTarget = finalPrice == null ? null : money(finalPrice);
  const vendorTarget = vendorAmount == null ? null : money(vendorAmount);

  return {
    ...totals,
    clientTarget,
    clientDue:
      clientTarget == null ? null : Math.max(0, clientTarget - totals.clientPaid),
    vendorTarget,
    vendorDue:
      vendorTarget == null ? null : Math.max(0, vendorTarget - totals.vendorPaid),
  };
}

export function totalsByBooking(rows: readonly PaymentLedgerRow[]) {
  const grouped = new Map<string, PaymentLedgerRow[]>();
  for (const row of rows) {
    if (!row.booking_id) continue;
    grouped.set(row.booking_id, [...(grouped.get(row.booking_id) ?? []), row]);
  }

  return new Map(
    [...grouped.entries()].map(([bookingId, bookingRows]) => [
      bookingId,
      totalsFromPayments(bookingRows),
    ])
  );
}

export function visiblePaymentRows(
  rows: readonly PaymentLedgerRow[],
  role: "client" | "vendor" | "admin" | "manager"
) {
  if (role === "client" || role === "vendor") {
    const direction = role === "client" ? "CLIENT_IN" : "VENDOR_OUT";
    return rows
      .filter((row) => row.kind === direction)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        label: row.label,
        amount: row.amount,
        due_date: row.due_date,
        is_paid: row.is_paid,
        paid_at: row.paid_at,
        method: row.method,
        created_at: row.created_at,
      }));
  }
  return [...rows];
}
