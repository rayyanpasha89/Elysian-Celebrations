import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { recordAudit } from "@/lib/admin-audit";

const STAGES = new Set(["QUOTED", "COUNTERED", "AGREED"]);

// Cost & margin are admin-only.
async function guardAdmin() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return { error: session, userId: null };
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return { error: roleCheck, userId: null };
  return { error: null, userId: session.userId };
}

export async function GET(request: NextRequest) {
  const { error } = await guardAdmin();
  if (error) return error;

  const bookingId = request.nextUrl.searchParams.get("bookingId");
  if (!bookingId) return apiError("bookingId is required", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error: qErr } = await supabase
      .from("negotiation_entries")
      .select("id, stage, amount, note, created_by, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (qErr) {
      console.error("negotiation list:", qErr);
      return apiError("Failed to load negotiation", 500);
    }
    return apiSuccess({ entries: data ?? [] });
  } catch (e) {
    console.error("GET negotiation", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error, userId } = await guardAdmin();
  if (error) return error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : null;
    if (!bookingId) return apiError("bookingId is required", 400);

    const stage =
      typeof body.stage === "string" && STAGES.has(body.stage.toUpperCase())
        ? body.stage.toUpperCase()
        : "QUOTED";
    const amount =
      typeof body.amount === "number" && Number.isFinite(body.amount)
        ? Math.max(0, Math.round(body.amount))
        : null;
    const note = typeof body.note === "string" ? body.note.trim() || null : null;

    const supabase = createAdminSupabaseClient();
    const { data, error: insErr } = await supabase
      .from("negotiation_entries")
      .insert({
        booking_id: bookingId,
        stage,
        amount,
        note,
        created_by: userId,
      })
      .select("id, stage, amount, note, created_by, created_at")
      .single();

    if (insErr || !data) {
      console.error("negotiation insert:", insErr);
      return apiError("Failed to add entry", 500);
    }

    // Agreeing a number locks it in as the vendor cost used for margin.
    let costUpdated = false;
    if (stage === "AGREED" && amount != null) {
      const { error: upErr } = await supabase
        .from("bookings")
        .update({ vendor_cost: amount })
        .eq("id", bookingId);
      if (!upErr) costUpdated = true;
    }

    await recordAudit({
      actorUserId: userId,
      action: "NEGOTIATION_ADD",
      entityType: "booking",
      entityId: bookingId,
      summary: `${stage}${amount != null ? ` ₹${amount}` : ""}${note ? ` — ${note}` : ""}`,
      meta: { stage, amount, costUpdated },
    });

    return apiSuccess({ entry: data, costUpdated }, 201);
  } catch (e) {
    console.error("POST negotiation", e);
    return apiError("Internal server error", 500);
  }
}
