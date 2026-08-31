export const BILLING_INVOICE_STATUSES = [
  "ISSUED",
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "VOID",
] as const;

export type BillingInvoiceStatus =
  (typeof BILLING_INVOICE_STATUSES)[number];
export type BillingDisplayStatus = BillingInvoiceStatus | "OVERDUE";

export type BillingInvoiceParty = {
  clientName: string;
  clientEmail?: string | null;
  vendorName: string;
  vendorSlug: string | null;
  serviceName: string;
};

export type BillingInvoiceEvent = {
  name: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  dayName: string | null;
  dayDate: string | null;
};

export type BillingAttemptView = {
  id: string;
  provider: string;
  status: string;
  amountMinor: number;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingRefundView = {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  reason: string;
  processedAt: string | null;
  createdAt: string;
};

export type BillingInvoiceView = {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  installmentNumber: number;
  label: string;
  description: string | null;
  amount: number;
  currency: "INR";
  status: BillingInvoiceStatus;
  displayStatus: BillingDisplayStatus;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
  refundedAmount: number;
  refundedAt: string | null;
  netReceived: number;
  party: BillingInvoiceParty;
  event: BillingInvoiceEvent | null;
  attempts?: BillingAttemptView[];
  refunds?: BillingRefundView[];
};

export type BillingSummary = {
  scheduled: number;
  received: number;
  refunded: number;
  netReceived: number;
  outstanding: number;
  overdue: number;
  issuedCount: number;
  paidCount: number;
};

export type BillingCapability = {
  onlineCheckout: boolean;
  provider: string | null;
  reason: string;
};

const billingDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function billingDateKey(date: Date) {
  const parts = billingDateFormatter.formatToParts(date);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isBillingInvoiceStatus(
  value: unknown
): value is BillingInvoiceStatus {
  return (
    typeof value === "string" &&
    (BILLING_INVOICE_STATUSES as readonly string[]).includes(value)
  );
}

export function billingDisplayStatus(
  status: BillingInvoiceStatus,
  dueDate: string,
  today = new Date()
): BillingDisplayStatus {
  if (status !== "ISSUED") return status;
  const todayKey = billingDateKey(today);
  return dueDate < todayKey ? "OVERDUE" : status;
}

export function summarizeBillingInvoices(
  invoices: readonly BillingInvoiceView[]
): BillingSummary {
  const summary: BillingSummary = {
    scheduled: 0,
    received: 0,
    refunded: 0,
    netReceived: 0,
    outstanding: 0,
    overdue: 0,
    issuedCount: 0,
    paidCount: 0,
  };

  for (const invoice of invoices) {
    if (invoice.status === "VOID") continue;
    summary.scheduled += invoice.amount;
    summary.refunded += invoice.refundedAmount;

    if (invoice.status === "ISSUED") {
      summary.outstanding += invoice.amount;
      summary.issuedCount += 1;
      if (invoice.displayStatus === "OVERDUE") summary.overdue += invoice.amount;
    } else {
      summary.received += invoice.amount;
      summary.paidCount += 1;
    }
  }

  summary.netReceived = Math.max(0, summary.received - summary.refunded);
  return summary;
}
