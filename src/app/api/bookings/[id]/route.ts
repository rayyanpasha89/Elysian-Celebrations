import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { isPaymentKind, isPaymentMethod } from "@/lib/payment-ledger";
import type { Database } from "@/types/database.types";
import { getAuthSession, apiError, apiSuccess } from "@/lib/api-utils";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

type BookingUserRelation =
  | { user_id?: string | null }
  | { user_id?: string | null }[]
  | null;

function relationUserId(relation: BookingUserRelation) {
  if (Array.isArray(relation)) {
    return relation[0]?.user_id ?? null;
  }

  return relation?.user_id ?? null;
}

const WRITABLE_BOOKING_STATUS_VALUES = [
  "INQUIRY",
  "CONFIRMED",
  "DEPOSIT_PAID",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly BookingStatus[];

type WritableBookingStatus = (typeof WRITABLE_BOOKING_STATUS_VALUES)[number];

const WRITABLE_BOOKING_STATUSES: ReadonlySet<string> = new Set(
  WRITABLE_BOOKING_STATUS_VALUES
);

// Vendors can only close work that operations has already confirmed. Pricing is
// agreed offline and recorded through the admin pricing route.
const VENDOR_STATUS_TRANSITIONS: Partial<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  CONFIRMED: ["COMPLETED"],
  DEPOSIT_PAID: ["COMPLETED"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWritableBookingStatus(value: unknown): value is WritableBookingStatus {
  return typeof value === "string" && WRITABLE_BOOKING_STATUSES.has(value);
}

function normalizeMoney(value: unknown) {
  if (value === null) return undefined;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return Math.floor(amount);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const rawBody: unknown = await request.json();
    if (!isRecord(rawBody)) {
      return apiError("Invalid booking update", 400);
    }
    const body = rawBody;

    const { data: booking, error: loadErr } = await supabase
      .from("bookings")
      .select(
        "id, status, total_amount, vendor_amount, paid_amount, notes, client_profile_id, vendor_profile_id, client:client_profiles(user_id), vendor:vendor_profiles(user_id)"
      )
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      console.error("Booking load error:", loadErr);
      return apiError("Failed to load booking", 500);
    }
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const isClientOwner = relationUserId(booking.client) === session.userId;
    const isVendorOwner = relationUserId(booking.vendor) === session.userId;
    const isOperationsRole = session.role === "admin" || session.role === "manager";
    const isOwner = isClientOwner || isVendorOwner || isOperationsRole;

    if (!isOwner) {
      return apiError("Not authorized to update this booking", 403);
    }

    if (body.totalAmount !== undefined) {
      return apiError(
        "Pricing is recorded by Elysian operations after offline confirmation",
        403
      );
    }
    if (body.paidAmount !== undefined && !isOperationsRole) {
      return apiError("Only the operations team can update payments", 403);
    }
    if (body.payment !== undefined && !isOperationsRole) {
      return apiError("Only the operations team can record payments", 403);
    }
    const allowedFields: BookingUpdate = {};
    if (body.status !== undefined) {
      if (!isWritableBookingStatus(body.status)) {
        return apiError("Invalid booking status", 400);
      }
      if (!isOperationsRole) {
        if (session.role !== "vendor") {
          return apiError(
            "Clients cannot change booking status. Message the vendor if plans change.",
            403
          );
        }

        const allowedTargets = VENDOR_STATUS_TRANSITIONS[booking.status] ?? [];
        if (!allowedTargets.includes(body.status)) {
          return apiError("This booking cannot move to that status yet", 409);
        }
      }
      allowedFields.status = body.status;
    }
    if (body.paidAmount !== undefined) {
      const paidAmount = normalizeMoney(body.paidAmount);
      if (paidAmount === undefined) return apiError("Invalid paid amount", 400);
      allowedFields.paid_amount = paidAmount;
    }

    // A payment is recorded in the ledger with an explicit direction. The legacy
    // paid_amount field above cannot express one: client surfaces read it as
    // collection progress and vendor surfaces read it as payout progress, so a
    // single number is always wrong for one of them.
    let ledgerEntry: PaymentInsert | null = null;
    if (body.payment !== undefined) {
      const payment = body.payment as Record<string, unknown> | null;
      if (!payment || typeof payment !== "object") {
        return apiError("Invalid payment", 400);
      }
      if (!isPaymentKind(payment.kind)) {
        return apiError(
          "Payment kind must be CLIENT_IN (received from the client) or VENDOR_OUT (paid to the vendor)",
          400
        );
      }
      const amount = normalizeMoney(payment.amount);
      if (amount === undefined || amount <= 0) {
        return apiError("Payment amount must be a positive number", 400);
      }
      if (payment.method !== undefined && payment.method !== null && !isPaymentMethod(payment.method)) {
        return apiError("Payment method must be UPI, BANK, CASH or CARD", 400);
      }

      const settled = payment.isPaid !== false;
      ledgerEntry = {
        kind: payment.kind,
        amount,
        booking_id: id,
        client_profile_id: booking.client_profile_id,
        vendor_profile_id:
          payment.kind === "VENDOR_OUT" ? booking.vendor_profile_id : null,
        label:
          typeof payment.label === "string" && payment.label.trim()
            ? payment.label.trim().slice(0, 200)
            : null,
        method: isPaymentMethod(payment.method) ? payment.method : null,
        is_paid: settled,
        paid_at: settled ? new Date().toISOString() : null,
      };
    }
    if (body.notes !== undefined) {
      if (!isClientOwner && !isOperationsRole) {
        return apiError("Only the client or operations team can update the inquiry brief", 403);
      }
      allowedFields.notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim().slice(0, 1200)
          : null;
    }
    if (Object.keys(allowedFields).length === 0) {
      return apiError("Nothing to update", 400);
    }

    if (ledgerEntry) {
      const { error: ledgerError } = await supabase
        .from("payments")
        .insert(ledgerEntry);
      if (ledgerError) {
        console.error("Payment ledger insert error:", ledgerError);
        return apiError("Failed to record the payment", 500);
      }
    }

    // A request may carry only a payment, in which case the booking row itself
    // has nothing to change.
    if (Object.keys(allowedFields).length === 0) {
      const { data: unchanged, error: reloadError } = await supabase
        .from("bookings")
        .select("id, status, paid_amount, notes, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (reloadError || !unchanged) {
        console.error("Booking reload error:", reloadError);
        return apiError("Failed to load booking", 500);
      }
      return apiSuccess(unchanged);
    }

    let updateQuery = supabase
      .from("bookings")
      .update(allowedFields)
      .eq("id", id);
    if (body.status !== undefined) {
      updateQuery = updateQuery.eq("status", booking.status);
    }

    const { data: updated, error } = await updateQuery
      .select(
        "id, status, paid_amount, notes, updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error("Booking update error:", error);
      return apiError("Failed to update booking", 500);
    }
    if (!updated) {
      return apiError(
        body.status !== undefined
          ? "Booking changed while you were editing. Refresh and try again."
          : "Booking not found",
        body.status !== undefined ? 409 : 404
      );
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("Booking update error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();

    const { data: booking, error: loadErr } = await supabase
      .from("bookings")
      .select("id, status, client:client_profiles(user_id), vendor:vendor_profiles(user_id)")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      console.error("Booking load error:", loadErr);
      return apiError("Failed to load booking", 500);
    }
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const isOwner =
      relationUserId(booking.client) === session.userId ||
      session.role === "admin";

    if (!isOwner) {
      return apiError("Not authorized to delete this booking", 403);
    }

    if (booking.status !== "INQUIRY" && session.role !== "admin") {
      return apiError(
        "Only draft inquiry selections can be removed here",
        409
      );
    }

    const { error } = await supabase.from("bookings").delete().eq("id", id);

    if (error) {
      console.error("Booking delete error:", error);
      return apiError("Failed to delete booking", 500);
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("Booking delete error:", error);
    return apiError("Internal server error", 500);
  }
}
