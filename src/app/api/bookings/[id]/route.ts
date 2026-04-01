import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, apiError, apiSuccess } from "@/lib/api-utils";

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
      booking.client?.user_id === session.userId ||
      booking.vendor?.user_id === session.userId ||
      session.role === "admin";

    if (!isOwner) {
      return apiError("Not authorized to update this booking", 403);
    }

    const allowedFields: Record<string, unknown> = {};
    if (body.status) allowedFields.status = body.status;
    if (body.totalAmount !== undefined) allowedFields.total_amount = body.totalAmount;
    if (body.paidAmount !== undefined) allowedFields.paid_amount = body.paidAmount;
    if (body.notes !== undefined) allowedFields.notes = body.notes;

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
