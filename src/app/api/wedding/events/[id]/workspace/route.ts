import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  isRecord,
  normalizeEventDetails,
  normalizeLogistics,
  normalizeMenus,
  normalizeRequirements,
  normalizeTasks,
  normalizeVendorSelections,
} from "@/lib/event-workspace-payload";
import { isUuid } from "@/lib/id-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { venueRuleMessage } from "@/lib/venue-selection";

function workspaceRpcError(error: {
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
    return apiError("Some event workspace details are invalid", 400);
  }
  if (error.code === "42501") {
    return apiError("Event not found", 404);
  }
  if (error.code === "55000") {
    return apiError(
      "This vendor selection has progressed or has financial history. Change it from Bookings before removing it from the planner.",
      409
    );
  }
  if (
    error.code === "23503" ||
    error.code === "23505" ||
    error.code === "40001"
  ) {
    return apiError(
      "A selected day, venue, vendor, or service is no longer available. Refresh the plan and try again.",
      409
    );
  }
  return apiError("Failed to save the event workspace", 500);
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
      return apiError("Event workspace payload has an invalid shape", 400);
    }
    const body = parsedBody;
    const planning = body.planning;

    if (
      !isRecord(body.event) ||
      !isRecord(planning) ||
      !Array.isArray(planning.menus) ||
      !isRecord(planning.logistics) ||
      !Array.isArray(planning.tasks) ||
      !Array.isArray(planning.requirements) ||
      !Array.isArray(body.vendorSelections) ||
      planning.menus.length > 8 ||
      planning.tasks.length > 40 ||
      planning.requirements.length > 60 ||
      body.vendorSelections.length > 60
    ) {
      return apiError("Event workspace payload has an invalid shape", 400);
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("save_event_workspace", {
      p_actor_user_id: session.userId,
      p_event_id: id,
      p_event: normalizeEventDetails(body.event),
      p_menus: normalizeMenus(planning.menus),
      p_logistics: normalizeLogistics(planning.logistics),
      p_tasks: normalizeTasks(planning.tasks),
      p_requirements: normalizeRequirements(planning.requirements),
      p_vendor_selections: normalizeVendorSelections(body.vendorSelections),
    });

    if (error) {
      console.error("save_event_workspace RPC:", error);
      return workspaceRpcError(error);
    }

    return apiSuccess({ ok: true, result: data });
  } catch (error) {
    console.error("PATCH /api/wedding/events/[id]/workspace", error);
    return apiError("Internal server error", 500);
  }
}
