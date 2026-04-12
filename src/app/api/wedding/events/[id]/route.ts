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

function toOptionalInt(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const parsed = Math.round(value);
  return parsed > 0 ? parsed : null;
}

function toOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
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

    const { data: event, error: loadError } = await supabase
      .from("wedding_events")
      .select("id, wedding_id")
      .eq("id", id)
      .eq("wedding_id", wedding.id)
      .maybeSingle();

    if (loadError) {
      console.error("wedding_events load:", loadError);
      return apiError("Failed to load event", 500);
    }

    if (!event) {
      return apiError("Event not found", 404);
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = toOptionalString(body.name) ?? "Event";
    if (body.weddingDayId !== undefined) {
      const nextWeddingDayId = toOptionalString(body.weddingDayId);
      if (!nextWeddingDayId) {
        return apiError("Event must belong to a celebration day", 400);
      }

      const { data: weddingDay, error: weddingDayError } = await supabase
        .from("wedding_days")
        .select("id")
        .eq("id", nextWeddingDayId)
        .eq("wedding_id", wedding.id)
        .maybeSingle();

      if (weddingDayError) {
        console.error("wedding_days load:", weddingDayError);
        return apiError("Failed to validate celebration day", 500);
      }

      if (!weddingDay) {
        return apiError("Celebration day not found", 404);
      }

      updates.wedding_day_id = nextWeddingDayId;
    }
    if (body.eventType !== undefined) updates.event_type = toOptionalString(body.eventType);
    if (body.date !== undefined) {
      updates.date =
        typeof body.date === "string" && body.date
          ? new Date(body.date).toISOString()
          : null;
    }
    if (body.startTime !== undefined) updates.start_time = toOptionalString(body.startTime);
    if (body.endTime !== undefined) updates.end_time = toOptionalString(body.endTime);
    if (body.venue !== undefined) updates.venue = toOptionalString(body.venue);
    if (body.guestCount !== undefined) updates.guest_count = toOptionalInt(body.guestCount);
    if (body.estimatedBudget !== undefined) {
      updates.estimated_budget = toOptionalInt(body.estimatedBudget);
    }
    if (body.foodStyle !== undefined) updates.food_style = toOptionalString(body.foodStyle);
    if (body.foodPreferences !== undefined) {
      updates.food_preferences = toOptionalStringArray(body.foodPreferences);
    }
    if (body.menuNotes !== undefined) updates.menu_notes = toOptionalString(body.menuNotes);
    if (body.decorStyle !== undefined) updates.decor_style = toOptionalString(body.decorStyle);
    if (body.decorNotes !== undefined) updates.decor_notes = toOptionalString(body.decorNotes);
    if (body.attireNotes !== undefined) {
      updates.attire_notes = toOptionalString(body.attireNotes);
    }
    if (body.notes !== undefined) updates.notes = toOptionalString(body.notes);
    if (body.sortOrder !== undefined && typeof body.sortOrder === "number") {
      updates.sort_order = Math.max(0, Math.round(body.sortOrder));
    }

    const { data: updatedEvent, error } = await supabase
      .from("wedding_events")
      .update(updates)
      .eq("id", id)
      .select(
        "id, wedding_day_id, name, event_type, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, food_preferences, menu_notes, decor_style, decor_notes, attire_notes, notes, sort_order"
      )
      .single();

    if (error || !updatedEvent) {
      console.error("wedding_events update:", error);
      return apiError("Failed to update event", 500);
    }

    return apiSuccess({ event: updatedEvent });
  } catch (error) {
    console.error("PATCH /api/wedding/events/[id]", error);
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

    const { data: event, error: loadError } = await supabase
      .from("wedding_events")
      .select("id")
      .eq("id", id)
      .eq("wedding_id", wedding.id)
      .maybeSingle();

    if (loadError) {
      console.error("wedding_events load:", loadError);
      return apiError("Failed to load event", 500);
    }

    if (!event) {
      return apiError("Event not found", 404);
    }

    const { error: deleteBookingsError } = await supabase
      .from("bookings")
      .delete()
      .eq("wedding_event_id", id)
      .eq("status", "INQUIRY");

    if (deleteBookingsError) {
      console.error("bookings delete:", deleteBookingsError);
      return apiError("Failed to remove linked selections", 500);
    }

    const { error } = await supabase.from("wedding_events").delete().eq("id", id);
    if (error) {
      console.error("wedding_events delete:", error);
      return apiError("Failed to delete event", 500);
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wedding/events/[id]", error);
    return apiError("Internal server error", 500);
  }
}
