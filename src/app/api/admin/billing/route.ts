import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { summarizeBillingInvoices } from "@/lib/billing";
import {
  ADMIN_BILLING_SELECT,
  billingCapability,
  billingInvoiceView,
  loadAdminInvoice,
  one,
  type RawBillingInvoice,
} from "@/lib/billing-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type IssueInvoiceArgs =
  Database["public"]["Functions"]["issue_booking_invoice"]["Args"];

type Relation<T> = T | T[] | null | undefined;
type BillableBookingRow = {
  id: string;
  status: string;
  final_price: number | null;
  price_published: boolean;
  updated_at: string;
  client?: Relation<{
    partner_name: string | null;
    user?: Relation<{ name: string | null; email: string }>;
  }>;
  vendor?: Relation<{ business_name: string; slug: string }>;
  service?: Relation<{ name: string }>;
  event?: Relation<{
    name: string;
    date: string | null;
    day?: Relation<{ name: string; date: string | null }>;
  }>;
  payments?: {
    kind: string;
    amount: number;
    voided_at: string | null;
  }[] | null;
  invoices?: { id: string; status: string; amount: number }[] | null;
};

const BILLABLE_BOOKING_SELECT = `
  id, status, final_price, price_published, updated_at,
  client:client_profiles(partner_name, user:users(name, email)),
  vendor:vendor_profiles(business_name, slug),
  service:vendor_services(name),
  event:wedding_events(name, date, day:wedding_days(name, date)),
  payments(kind, amount, voided_at),
  invoices:billing_invoices(id, status, amount)
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }
  return value <= 2_147_483_647 ? value : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function invoiceDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function idempotencyKey(request: Request, body: Record<string, unknown>) {
  const value = request.headers.get("idempotency-key") ?? body.idempotencyKey;
  return typeof value === "string" && /^[A-Za-z0-9:_-]{16,160}$/.test(value)
    ? value
    : null;
}

function issueError(error: { code?: string; message?: string | null }) {
  const message = error.message?.trim();
  if (error.code === "P0002") return apiError(message || "Booking not found", 404);
  if (error.code === "23514") {
    return apiError(message || "Invoice conflicts with fixed pricing", 409);
  }
  if (error.code === "22023") return apiError(message || "Invalid invoice", 400);
  console.error("Billing invoice issue RPC:", error);
  return apiError("The invoice could not be issued", 500);
}

function billableBookingView(row: BillableBookingRow) {
  const client = one(row.client);
  const user = one(client?.user);
  const vendor = one(row.vendor);
  const service = one(row.service);
  const event = one(row.event);
  const day = one(event?.day);
  const recorded = (row.payments ?? []).reduce(
    (sum, payment) =>
      payment.kind === "CLIENT_IN" && !payment.voided_at
        ? sum + Math.max(0, payment.amount)
        : sum,
    0
  );
  const finalPrice = Math.max(0, row.final_price ?? 0);
  return {
    id: row.id,
    status: row.status,
    clientName: user?.name?.trim() || client?.partner_name?.trim() || "Client",
    clientEmail: user?.email ?? null,
    vendorName: vendor?.business_name ?? "Vendor",
    vendorSlug: vendor?.slug ?? null,
    serviceName: service?.name ?? "Service",
    eventName: event?.name ?? "Event function",
    eventDate: event?.date ?? day?.date ?? null,
    dayName: day?.name ?? null,
    finalPrice,
    allocated: recorded,
    remaining: Math.max(0, finalPrice - recorded),
    activeInvoiceCount: (row.invoices ?? []).filter(
      (invoice) => invoice.status !== "VOID"
    ).length,
    updatedAt: row.updated_at,
  };
}

async function loadBillingWorkspace() {
  const supabase = createAdminSupabaseClient();
  const [{ data: invoiceRows, error: invoiceError }, { data: bookingRows, error: bookingError }] =
    await Promise.all([
      supabase
        .from("billing_invoices")
        .select(ADMIN_BILLING_SELECT)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("bookings")
        .select(BILLABLE_BOOKING_SELECT)
        .eq("price_published", true)
        .not("final_price", "is", null)
        .neq("status", "CANCELLED")
        .order("updated_at", { ascending: false })
        .limit(300),
    ]);

  if (invoiceError || bookingError) throw invoiceError ?? bookingError;
  const invoices = (invoiceRows ?? []).map((row) =>
    billingInvoiceView(row as unknown as RawBillingInvoice, { admin: true })
  );
  const bookings = ((bookingRows ?? []) as unknown as BillableBookingRow[])
    .map(billableBookingView)
    .filter((booking) => booking.remaining > 0);
  return {
    invoices,
    bookings,
    summary: summarizeBillingInvoices(invoices),
    capability: billingCapability(),
  };
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    return apiSuccess(await loadBillingWorkspace());
  } catch (error) {
    console.error("GET /api/admin/billing:", error);
    return apiError("Billing workspace could not be loaded", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  const limited = await enforceRateLimit(request, {
    scope: "billing-invoice-issue",
    limit: 20,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const rawBody: unknown = await request.json();
    if (!isRecord(rawBody)) return apiError("Invalid invoice", 400);
    const bookingId = optionalText(rawBody.bookingId, 80);
    const amount = positiveMoney(rawBody.amount);
    const dueDate = invoiceDate(rawBody.dueDate);
    const retryKey = idempotencyKey(request, rawBody);
    if (!bookingId) return apiError("Choose a booking", 400);
    if (!isUuid(bookingId)) return apiError("Invalid booking", 400);
    if (!amount) return apiError("Enter a positive installment amount", 400);
    if (!dueDate) return apiError("Choose a valid due date", 400);
    if (!retryKey) return apiError("A valid idempotency key is required", 400);

    const args = {
      p_booking_id: bookingId,
      p_amount: amount,
      p_due_date: dueDate,
      p_idempotency_key: retryKey,
      p_label: optionalText(rawBody.label, 160),
      p_description: optionalText(rawBody.description, 1000),
      p_actor_user_id: session.userId,
    } as unknown as IssueInvoiceArgs;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("issue_booking_invoice", args);
    if (error) return issueError(error);
    const invoiceId = (data as unknown as { id?: string } | null)?.id;
    if (!invoiceId) return apiError("Invoice issue returned no record", 500);
    const invoice = await loadAdminInvoice(invoiceId);
    if (!invoice) return apiError("Issued invoice could not be reloaded", 500);
    return apiSuccess({ invoice }, 201);
  } catch (error) {
    console.error("POST /api/admin/billing:", error);
    return apiError("The invoice could not be issued", 500);
  }
}
