import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext, ensureWeddingDays } from "@/lib/wedding-plan.server";
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

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const weddingDayId = toOptionalString(body.weddingDayId);
    const parsedDate =
      typeof body.date === "string" && body.date ? new Date(body.date) : null;
    const date =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : null;

    if (!name) {
      return apiError("Event name is required", 400);
    }

    const { supabase, wedding } = await getClientWeddingContext(session.userId);
    if (!wedding) {
      return apiError("Wedding not found", 404);
    }

    const { data: existingEvents, error: existingEventsError } = await supabase
      .from("wedding_events")
      .select("id, date, wedding_day_id, sort_order")
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true });

    if (existingEventsError) {
      console.error("wedding_events lookup:", existingEventsError);
      return apiError("Failed to load events", 500);
    }

    const days = await ensureWeddingDays(
      supabase,
      { id: wedding.id, date: wedding.date },
      (existingEvents ?? []).map((event) => ({
        id: event.id,
        date: event.date,
        wedding_day_id: event.wedding_day_id,
      }))
    );

    const targetDayId = weddingDayId ?? days[0]?.id ?? null;
    if (!targetDayId) {
      return apiError("Add a wedding day before creating events", 409);
    }

    const nextSortOrder =
      (existingEvents ?? [])
        .filter((event) => event.wedding_day_id === targetDayId)
        .reduce((max, event) => Math.max(max, event.sort_order), -1) + 1;

    const { data: event, error } = await supabase
      .from("wedding_events")
      .insert({
        wedding_id: wedding.id,
        wedding_day_id: targetDayId,
        name,
        event_type: toOptionalString(body.eventType),
        date,
        start_time: toOptionalString(body.startTime),
        end_time: toOptionalString(body.endTime),
        venue: toOptionalString(body.venue),
        guest_count: toOptionalInt(body.guestCount),
        estimated_budget: toOptionalInt(body.estimatedBudget),
        food_style: toOptionalString(body.foodStyle),
        food_preferences: toOptionalStringArray(body.foodPreferences),
        menu_notes: toOptionalString(body.menuNotes),
        decor_style: toOptionalString(body.decorStyle),
        decor_notes: toOptionalString(body.decorNotes),
        attire_notes: toOptionalString(body.attireNotes),
        notes: toOptionalString(body.notes),
        sort_order: nextSortOrder,
      })
      .select(
        "id, wedding_day_id, name, event_type, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, food_preferences, menu_notes, decor_style, decor_notes, attire_notes, notes, sort_order"
      )
      .single();

    if (error) {
      console.error("wedding_events insert:", error);
      return apiError("Failed to create event", 500);
    }

    return apiSuccess({ event }, 201);
  } catch (error) {
    console.error("POST /api/wedding/events", error);
    return apiError("Internal server error", 500);
  }
}
