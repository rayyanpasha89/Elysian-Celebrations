import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, apiError, apiSuccess } from "@/lib/api-utils";

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

const BOOKING_STATUSES = new Set([
  "INQUIRY",
  "QUOTE_SENT",
  "CONFIRMED",
  "DEPOSIT_PAID",
  "COMPLETED",
  "CANCELLED",
]);

// The vendor portal intentionally exposes only these two progression actions.
// Keep the API aligned with that UI so a crafted request cannot skip payment,
// confirmation, or operations review.
const VENDOR_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  INQUIRY: ["QUOTE_SENT"],
  CONFIRMED: ["COMPLETED"],
  DEPOSIT_PAID: ["COMPLETED"],
};

function normalizeMoney(value: unknown) {
  if (value === null) return null;
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
    const body = await request.json();

    const { data: booking, error: loadErr } = await supabase
      .from("bookings")
      .select(
        "id, status, total_amount, vendor_amount, paid_amount, notes, client:client_profiles(user_id), vendor:vendor_profiles(user_id)"
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

    const isOwner =
      relationUserId(booking.client) === session.userId ||
      relationUserId(booking.vendor) === session.userId ||
      session.role === "admin" ||
      session.role === "manager";

    if (!isOwner) {
      return apiError("Not authorized to update this booking", 403);
    }

    // The vendor's first quote is the only write path for total_amount. Admins
    // set the separate final client price through /api/admin/pricing; allowing
    // operations to rewrite the quote here would reintroduce negotiation.
    const isOperationsRole = session.role === "admin" || session.role === "manager";
    const vendorSendingQuote =
      session.role === "vendor" &&
      booking.status === "INQUIRY" &&
      body.status === "QUOTE_SENT";
    if (body.totalAmount !== undefined && !vendorSendingQuote) {
      return apiError("Only the vendor can submit the initial fixed quote", 403);
    }
    if (body.paidAmount !== undefined && !isOperationsRole) {
      return apiError("Only the operations team can update payments", 403);
    }
    if (
      vendorSendingQuote &&
      body.totalAmount === undefined &&
      booking.vendor_amount == null
    ) {
      return apiError("Add a quote amount before marking the quote as sent", 400);
    }

    const allowedFields: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !BOOKING_STATUSES.has(body.status)) {
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
    if (body.totalAmount !== undefined) {
      const totalAmount = normalizeMoney(body.totalAmount);
      if (totalAmount === undefined) return apiError("Invalid total amount", 400);
      if (vendorSendingQuote && (totalAmount == null || totalAmount <= 0)) {
        return apiError("Quote amount must be greater than zero", 400);
      }
      if (
        vendorSendingQuote &&
        booking.vendor_amount != null &&
        totalAmount !== booking.vendor_amount
      ) {
        return apiError("The vendor quote is already locked for this booking", 409);
      }
      allowedFields.total_amount = totalAmount;
      if (vendorSendingQuote && booking.vendor_amount == null) {
        allowedFields.vendor_amount = totalAmount;
      }
    }
    if (body.paidAmount !== undefined) {
      const paidAmount = normalizeMoney(body.paidAmount);
      if (paidAmount === undefined) return apiError("Invalid paid amount", 400);
      allowedFields.paid_amount = paidAmount;
    }
    if (body.notes !== undefined) {
      allowedFields.notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim().slice(0, 1200)
          : null;
    }
    if (Object.keys(allowedFields).length === 0) {
      return apiError("Nothing to update", 400);
    }

    const { data: updated, error } = await supabase
      .from("bookings")
      .update(allowedFields)
      .eq("id", id)
      .select(
        "id, client_profile_id, vendor_profile_id, vendor_service_id, wedding_event_id, status, event_date, total_amount, vendor_amount, paid_amount, notes, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("Booking update error:", error);
      return apiError("Failed to update booking", 500);
    }
    if (!updated) {
      return apiError("Booking not found", 404);
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
