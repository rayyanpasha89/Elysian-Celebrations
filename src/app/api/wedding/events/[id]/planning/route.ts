import { NextRequest, NextResponse } from "next/server";
import {
  isRecord,
  normalizeLogistics,
  normalizeMenus,
  normalizeRequirements,
  normalizeTasks,
} from "@/lib/event-workspace-payload";
import { getClientWeddingContext } from "@/lib/wedding-plan.server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";

async function requireOwnedEvent(userId: string, eventId: string) {
  const { supabase, wedding } = await getClientWeddingContext(userId);
  if (!wedding) {
    return { error: apiError("Event plan not found", 404) };
  }

  const { data: event, error } = await supabase
    .from("wedding_events")
    .select("id")
    .eq("id", eventId)
    .eq("wedding_id", wedding.id)
    .maybeSingle();

  if (error) {
    console.error("wedding_events planning load:", error);
    return { error: apiError("Failed to load event", 500) };
  }

  if (!event) {
    return { error: apiError("Event not found", 404) };
  }

  return { supabase };
}

function planningRpcError(code?: string) {
  if (code === "22007" || code === "22023") {
    return apiError("Some event planning details are invalid", 400);
  }
  if (code === "23503" || code === "23505") {
    return apiError("A selected planning item is no longer available", 409);
  }
  if (code === "42501") {
    return apiError("Event not found", 404);
  }
  return apiError("Failed to save event planning", 500);
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
    if (!isUuid(id)) return apiError("Invalid event ID", 400);

    const parsedBody: unknown = await request.json();
    if (!isRecord(parsedBody)) {
      return apiError("Event planning payload has an invalid shape", 400);
    }
    const body = parsedBody;

    if (
      !Array.isArray(body.menus) ||
      !Array.isArray(body.tasks) ||
      !isRecord(body.logistics) ||
      (body.requirements !== undefined && !Array.isArray(body.requirements))
    ) {
      return apiError("Event planning payload has an invalid shape", 400);
    }

    const ownership = await requireOwnedEvent(session.userId, id);
    if ("error" in ownership) return ownership.error;

    const { data, error } = await ownership.supabase.rpc("save_event_planning", {
      p_actor_user_id: session.userId,
      p_event_id: id,
      p_menus: normalizeMenus(body.menus),
      p_logistics: normalizeLogistics(body.logistics),
      p_tasks: normalizeTasks(body.tasks),
      p_requirements:
        body.requirements === undefined
          ? null
          : normalizeRequirements(body.requirements),
    });

    if (error) {
      console.error("save_event_planning RPC:", error);
      return planningRpcError(error.code);
    }

    return apiSuccess({ ok: true, result: data });
  } catch (error) {
    console.error("PATCH /api/wedding/events/[id]/planning", error);
    return apiError("Internal server error", 500);
  }
}
