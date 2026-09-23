import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  bookingPaymentSummary,
  isPaymentKind,
  isPaymentMethod,
} from "@/lib/payment-ledger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { rejectScopedOperationsManager } from "@/lib/operations-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type RecordPaymentArgs =
  Database["public"]["Functions"]["record_booking_payment"]["Args"];

const PAYMENT_SELECT =
  "id, booking_id, kind, label, amount, due_date, is_paid, paid_at, method, reference, notes, created_by, created_at, updated_at, voided_at, voided_by, void_reason";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveMoney(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function optionalDate(value: unknown, includeTime: boolean) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return includeTime
    ? parsed.toISOString()
    : parsed.toISOString().slice(0, 10);
}

function ledgerError(error: { code?: string; message?: string | null }) {
  const message = error.message?.trim();
  if (error.code === "P0002") return apiError(message || "Booking not found", 404);
  if (error.code === "23514") return apiError(message || "Payment conflicts with fixed pricing", 409);
  if (error.code === "22023") return apiError(message || "Invalid payment", 400);
  console.error("Payment ledger RPC:", error);
  return apiError("Could not record the payment", 500);
}

async function loadLedger(bookingId: string) {
  const supabase = createAdminSupabaseClient();
  const [{ data: booking, error: bookingError }, { data: payments, error: paymentError }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, final_price, vendor_amount")
        .eq("id", bookingId)
        .maybeSingle(),
      supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false }),
    ]);

  if (bookingError || paymentError) {
    console.error("Payment ledger load:", bookingError ?? paymentError);
    return { error: apiError("Could not load payment history", 500) } as const;
  }
  if (!booking) {
    return { error: apiError("Booking not found", 404) } as const;
  }

  const rows = (payments ?? []) as PaymentRow[];
  return {
    data: {
      bookingId,
      summary: bookingPaymentSummary({
        rows,
        finalPrice: booking.final_price,
        vendorAmount: booking.vendor_amount,
      }),
      payments: rows,
    },
  } as const;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;
  const scopeCheck = await rejectScopedOperationsManager(session);
  if (scopeCheck) return scopeCheck;

  const { id } = await params;
  const result = await loadLedger(id);
  if ("error" in result) return result.error;
  return apiSuccess(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;
  const scopeCheck = await rejectScopedOperationsManager(session);
  if (scopeCheck) return scopeCheck;

  const limited = await enforceRateLimit(request, {
    scope: "payment-record",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  const { id } = await params;
  try {
    const rawBody: unknown = await request.json();
    if (!isRecord(rawBody)) return apiError("Invalid payment", 400);

    const kind = rawBody.kind;
    const amount = positiveMoney(rawBody.amount);
    const isPaid = rawBody.isPaid !== false;
    const method = optionalText(rawBody.method, 20)?.toUpperCase() ?? null;
    if (!isPaymentKind(kind)) {
      return apiError("Choose client receipt or vendor payout", 400);
    }
    if (kind === "CLIENT_IN") {
      return apiError(
        "Issue or settle client installments from Billing so every receipt remains invoice-linked",
        409
      );
    }
    if (amount == null) return apiError("Enter a positive payment amount", 400);
    if (isPaid && !isPaymentMethod(method)) {
      return apiError("Choose how the settled payment moved", 400);
    }
    if (!isPaid && method != null && !isPaymentMethod(method)) {
      return apiError("Invalid payment method", 400);
    }

    const dueDate = optionalDate(rawBody.dueDate, false);
    if (rawBody.dueDate && !dueDate) return apiError("Invalid due date", 400);
    const paidAt = optionalDate(rawBody.paidAt, true);
    if (rawBody.paidAt && !paidAt) return apiError("Invalid settlement date", 400);

    const args = {
      p_booking_id: id,
      p_kind: kind,
      p_amount: amount,
      p_label:
        optionalText(rawBody.label, 160) ?? "Vendor payout",
      p_due_date: dueDate,
      p_is_paid: isPaid,
      p_paid_at: isPaid ? paidAt : null,
      p_method: isPaid ? method : null,
      p_reference: optionalText(rawBody.reference, 160),
      p_notes: optionalText(rawBody.notes, 1000),
      p_actor_user_id: session.userId,
    } as unknown as RecordPaymentArgs;

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.rpc("record_booking_payment", args);
    if (error) return ledgerError(error);

    const result = await loadLedger(id);
    if ("error" in result) return result.error;
    return apiSuccess(result.data, 201);
  } catch (error) {
    console.error("POST booking payment:", error);
    return apiError("Could not record the payment", 500);
  }
}
