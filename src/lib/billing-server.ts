import "server-only";

import {
  billingDisplayStatus,
  isBillingInvoiceStatus,
  type BillingAttemptView,
  type BillingCapability,
  type BillingInvoiceEvent,
  type BillingInvoiceParty,
  type BillingInvoiceView,
  type BillingRefundView,
} from "@/lib/billing";
import { billingGatewayCapability } from "@/lib/billing-gateway";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const CLIENT_BILLING_SELECT = `
  id, invoice_number, booking_id, installment_number, label, description,
  amount, currency, status, due_date, issued_at, paid_at,
  refunded_amount, refunded_at,
  booking:bookings(
    id, status, event_date,
    client:client_profiles(partner_name, user:users(name)),
    vendor:vendor_profiles(business_name, slug),
    service:vendor_services(name),
    event:wedding_events(
      name, date, start_time, end_time, venue,
      day:wedding_days(name, date)
    )
  )
`;

export const ADMIN_BILLING_SELECT = `
  id, invoice_number, booking_id, installment_number, label, description,
  amount, currency, status, due_date, issued_at, paid_at,
  refunded_amount, refunded_at,
  booking:bookings(
    id, status, event_date,
    client:client_profiles(partner_name, user:users(name, email)),
    vendor:vendor_profiles(business_name, slug),
    service:vendor_services(name),
    event:wedding_events(
      name, date, start_time, end_time, venue,
      day:wedding_days(name, date)
    )
  ),
  attempts:billing_payment_attempts(
    id, provider, status, amount_minor, provider_order_id,
    provider_payment_id, failure_code, failure_message, created_at, updated_at
  ),
  refunds:billing_refunds(
    id, amount, status, method, reference, reason, processed_at, created_at
  )
`;

type Relation<T> = T | T[] | null | undefined;

type RawUser = { name?: string | null; email?: string | null };
type RawClient = { partner_name?: string | null; user?: Relation<RawUser> };
type RawVendor = { business_name?: string | null; slug?: string | null };
type RawService = { name?: string | null };
type RawDay = { name?: string | null; date?: string | null };
type RawEvent = {
  name?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  day?: Relation<RawDay>;
};
type RawBooking = {
  id?: string;
  event_date?: string | null;
  client?: Relation<RawClient>;
  vendor?: Relation<RawVendor>;
  service?: Relation<RawService>;
  event?: Relation<RawEvent>;
};
type RawAttempt = {
  id: string;
  provider: string;
  status: string;
  amount_minor: number;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};
type RawRefund = {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  reason: string;
  processed_at: string | null;
  created_at: string;
};
export type RawBillingInvoice = {
  id: string;
  invoice_number: string;
  booking_id: string;
  installment_number: number;
  label: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  issued_at: string;
  paid_at: string | null;
  refunded_amount: number;
  refunded_at: string | null;
  booking?: Relation<RawBooking>;
  attempts?: RawAttempt[] | null;
  refunds?: RawRefund[] | null;
};

export function one<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function partyFromBooking(
  booking: RawBooking | null,
  includeClientEmail: boolean
): BillingInvoiceParty {
  const client = one(booking?.client);
  const user = one(client?.user);
  const vendor = one(booking?.vendor);
  const service = one(booking?.service);
  return {
    clientName: user?.name?.trim() || client?.partner_name?.trim() || "Client",
    ...(includeClientEmail ? { clientEmail: user?.email ?? null } : {}),
    vendorName: vendor?.business_name?.trim() || "Vendor",
    vendorSlug: vendor?.slug ?? null,
    serviceName: service?.name?.trim() || "Service",
  };
}

function eventFromBooking(booking: RawBooking | null): BillingInvoiceEvent | null {
  const event = one(booking?.event);
  if (!event) return null;
  const day = one(event.day);
  return {
    name: event.name?.trim() || "Event function",
    date: event.date ?? booking?.event_date ?? null,
    startTime: event.start_time ?? null,
    endTime: event.end_time ?? null,
    venue: event.venue ?? null,
    dayName: day?.name ?? null,
    dayDate: day?.date ?? null,
  };
}

function attemptsFromRaw(rows: RawAttempt[] | null | undefined): BillingAttemptView[] {
  return (rows ?? [])
    .slice()
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((row) => ({
      id: row.id,
      provider: row.provider,
      status: row.status,
      amountMinor: row.amount_minor,
      providerOrderId: row.provider_order_id,
      providerPaymentId: row.provider_payment_id,
      failureCode: row.failure_code,
      failureMessage: row.failure_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
}

function refundsFromRaw(rows: RawRefund[] | null | undefined): BillingRefundView[] {
  return (rows ?? [])
    .slice()
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      status: row.status,
      method: row.method,
      reference: row.reference,
      reason: row.reason,
      processedAt: row.processed_at,
      createdAt: row.created_at,
    }));
}

export function billingInvoiceView(
  raw: RawBillingInvoice,
  { admin = false }: { admin?: boolean } = {}
): BillingInvoiceView {
  if (!isBillingInvoiceStatus(raw.status)) {
    throw new Error(`Unknown billing invoice status: ${raw.status}`);
  }
  const booking = one(raw.booking);
  const refundedAmount = Math.max(0, Math.round(raw.refunded_amount ?? 0));
  const settled = raw.status !== "ISSUED" && raw.status !== "VOID";
  return {
    id: raw.id,
    invoiceNumber: raw.invoice_number,
    bookingId: raw.booking_id,
    installmentNumber: raw.installment_number,
    label: raw.label,
    description: raw.description,
    amount: Math.max(0, Math.round(raw.amount)),
    currency: "INR",
    status: raw.status,
    displayStatus: billingDisplayStatus(raw.status, raw.due_date),
    dueDate: raw.due_date,
    issuedAt: raw.issued_at,
    paidAt: raw.paid_at,
    refundedAmount,
    refundedAt: raw.refunded_at,
    netReceived: settled ? Math.max(0, raw.amount - refundedAmount) : 0,
    party: partyFromBooking(booking, admin),
    event: eventFromBooking(booking),
    ...(admin
      ? {
          attempts: attemptsFromRaw(raw.attempts),
          refunds: refundsFromRaw(raw.refunds),
        }
      : {}),
  };
}

export function billingCapability(): BillingCapability {
  return billingGatewayCapability();
}

export async function loadAdminInvoice(invoiceId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("billing_invoices")
    .select(ADMIN_BILLING_SELECT)
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? billingInvoiceView(data as unknown as RawBillingInvoice, { admin: true })
    : null;
}
