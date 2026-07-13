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
      .select("*, client:client_profiles(user_id), vendor:vendor_profiles(user_id)")
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

    // Quotes and payment records are commercial data. Clients and vendors can
    // still progress a booking and add shared notes, but only the operations
    // team can alter amounts through this general booking endpoint.
    const isOperationsRole = session.role === "admin" || session.role === "manager";
    if (
      (body.totalAmount !== undefined || body.paidAmount !== undefined) &&
      !isOperationsRole
    ) {
      return apiError("Only the operations team can update booking amounts", 403);
    }

    const allowedFields: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !BOOKING_STATUSES.has(body.status)) {
        return apiError("Invalid booking status", 400);
      }
      allowedFields.status = body.status;
    }
    if (body.totalAmount !== undefined) {
      const totalAmount = normalizeMoney(body.totalAmount);
      if (totalAmount === undefined) return apiError("Invalid total amount", 400);
      allowedFields.total_amount = totalAmount;
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

    const { data: updated, error } = await supabase
      .from("bookings")
      .update(allowedFields)
      .eq("id", id)
      .select()
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
      relationUserId(booking.vendor) === session.userId ||
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
