import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext } from "@/lib/wedding-plan.server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const { supabase, wedding } = await getClientWeddingContext(session.userId);
    if (!wedding) {
      return apiError("Wedding not found", 404);
    }

    const { data: currentDay, error: currentDayError } = await supabase
      .from("wedding_days")
      .select("id")
      .eq("id", id)
      .eq("wedding_id", wedding.id)
      .maybeSingle();

    if (currentDayError) {
      console.error("wedding_days load:", currentDayError);
      return apiError("Failed to load day", 500);
    }

    if (!currentDay) {
      return apiError("Day not found", 404);
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      updates.name = toOptionalString(body.name) ?? "Wedding Day";
    }
    if (body.notes !== undefined) {
      updates.notes = toOptionalString(body.notes);
    }
    if (body.date !== undefined) {
      updates.date =
        typeof body.date === "string" && body.date
          ? new Date(body.date).toISOString()
          : null;
    }
    if (body.sortOrder !== undefined && typeof body.sortOrder === "number") {
      updates.sort_order = Math.max(0, Math.round(body.sortOrder));
    }

    const { data: updatedDay, error } = await supabase
      .from("wedding_days")
      .update(updates)
      .eq("id", id)
      .select("id, name, date, notes, sort_order")
      .single();

    if (error || !updatedDay) {
      console.error("wedding_days update:", error);
      return apiError("Failed to update day", 500);
    }

    return apiSuccess({ day: updatedDay });
  } catch (error) {
    console.error("PATCH /api/wedding/days/[id]", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const { supabase, wedding } = await getClientWeddingContext(session.userId);
    if (!wedding) {
      return apiError("Wedding not found", 404);
    }

    const { data: targetDay, error: targetDayError } = await supabase
      .from("wedding_days")
      .select("id")
      .eq("id", id)
      .eq("wedding_id", wedding.id)
      .maybeSingle();

    if (targetDayError) {
      console.error("wedding_days load:", targetDayError);
      return apiError("Failed to load day", 500);
    }

    if (!targetDay) {
      return apiError("Day not found", 404);
    }

    const { count: eventCount, error: eventCountError } = await supabase
      .from("wedding_events")
      .select("id", { count: "exact", head: true })
      .eq("wedding_day_id", id);

    if (eventCountError) {
      console.error("wedding_events count:", eventCountError);
      return apiError("Failed to check day usage", 500);
    }

    if ((eventCount ?? 0) > 0) {
      return apiError("Move or remove the events in this day before deleting it", 409);
    }

    const { error } = await supabase.from("wedding_days").delete().eq("id", id);
    if (error) {
      console.error("wedding_days delete:", error);
      return apiError("Failed to delete day", 500);
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wedding/days/[id]", error);
    return apiError("Internal server error", 500);
  }
}
