import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext, ensureWeddingDays } from "@/lib/wedding-plan.server";
import {
  buildDefaultRequirementsForEvent,
  mealPeriodForTimeBlock,
  normalizeTimeBlockKey,
} from "@/lib/event-platform";
import {
  isRecord,
  normalizeEventDetails,
  normalizeLogistics,
  normalizeMenus,
  normalizeRequirements,
  normalizeTasks,
} from "@/lib/event-workspace-payload";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { venueRuleMessage } from "@/lib/venue-selection";

function eventCreationRpcError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const venueMessage = venueRuleMessage(error);
  if (venueMessage) return apiError(venueMessage, 422);
  if (
    error.code === "22004" ||
    error.code === "22007" ||
    error.code === "22023" ||
    error.code === "22P02"
  ) {
    return apiError("Some event details are invalid", 400);
  }
  if (error.code === "42501") return apiError("Event plan not found", 404);
  if (error.code === "23503" || error.code === "23505") {
    return apiError(
      "The selected day, venue, vendor, or service is no longer available",
      409
    );
  }
  return apiError("Failed to create event", 500);
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const parsedBody: unknown = await request.json();
    if (!isRecord(parsedBody)) {
      return apiError("Event payload has an invalid shape", 400);
    }
    const body = parsedBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const weddingDayId =
      typeof body.weddingDayId === "string" && body.weddingDayId.trim()
        ? body.weddingDayId.trim()
        : null;

    if (!name) {
      return apiError("Event name is required", 400);
    }

    const { supabase, wedding } = await getClientWeddingContext(session.userId);
    if (!wedding) {
      return apiError("Event plan not found", 404);
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
      return apiError("Add an event day before creating events", 409);
    }
    if (!days.some((day) => day.id === targetDayId)) {
      return apiError("Celebration day not found", 404);
    }

    const timeBlock = normalizeTimeBlockKey(body.timeBlock);
    const requirementSeeds = buildDefaultRequirementsForEvent({
      eventName: name,
      timeBlock,
      startTime:
        typeof body.startTime === "string" ? body.startTime.trim() || null : null,
    });
    const normalizedEvent = {
      ...normalizeEventDetails({ ...body, weddingDayId: targetDayId, name }),
      time_block: timeBlock,
    };
    const defaultMenus = requirementSeeds.some(
      (requirement) => requirement.category === "food"
    )
      ? [
          {
            name: `${name} Food and beverage plan`,
            mealPeriod: mealPeriodForTimeBlock(
              timeBlock,
              normalizedEvent.start_time
            ),
            serviceStyle: normalizedEvent.food_style,
            notes:
              normalizedEvent.menu_notes ??
              "Use this starter menu to define drinks, pre-meal stations, mains, post-meal stations, live counters, and custom food requirements.",
            items: [],
          },
        ]
      : [];

    const { data: event, error } = await supabase.rpc("create_event_function", {
      p_actor_user_id: session.userId,
      p_wedding_id: wedding.id,
      p_day_id: targetDayId,
      p_event: normalizedEvent,
      p_menus: normalizeMenus(defaultMenus),
      p_logistics: normalizeLogistics({}),
      p_tasks: normalizeTasks([
        {
          title: "Confirm final run of show",
          owner: "Planner",
          status: "OPEN",
        },
      ]),
      p_requirements: normalizeRequirements(requirementSeeds),
    });

    if (error) {
      console.error("create_event_function RPC:", error);
      return eventCreationRpcError(error);
    }

    return apiSuccess({ event }, 201);
  } catch (error) {
    console.error("POST /api/wedding/events", error);
    return apiError("Internal server error", 500);
  }
}
