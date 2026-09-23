import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import { OPERATIONS_ITEM_STATUSES, type OperationsItemStatus } from "@/lib/operations";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id, itemId } = await params;
  if (!isUuid(id) || !isUuid(itemId)) return apiError("Invalid operations item", 400);

  try {
    const access = await resolveOperationsAccess(session, id, "MANAGE_INCIDENTS");
    if (!access) return apiError("Event not found", 404);
    const raw: unknown = await request.json();
    const status =
      typeof raw === "object" && raw !== null && "status" in raw
        ? (raw as { status?: unknown }).status
        : null;
    if (!(OPERATIONS_ITEM_STATUSES as readonly unknown[]).includes(status)) {
      return apiError("Choose a valid status", 400);
    }
    const nextStatus = status as OperationsItemStatus;
    const now = new Date().toISOString();
    const updates =
      nextStatus === "RESOLVED"
        ? {
            status: nextStatus,
            resolved_at: now,
            resolved_by: session.userId,
            acknowledged_at: now,
            acknowledged_by: session.userId,
          }
        : nextStatus === "ACKNOWLEDGED"
          ? {
              status: nextStatus,
              acknowledged_at: now,
              acknowledged_by: session.userId,
              resolved_at: null,
              resolved_by: null,
            }
          : {
              status: nextStatus,
              acknowledged_at: null,
              acknowledged_by: null,
              resolved_at: null,
              resolved_by: null,
            };

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("event_operations_items")
      .update(updates)
      .eq("id", itemId)
      .eq("wedding_id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return apiError("Operations item not found", 404);
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: "OPERATIONS_ITEM_STATUS_CHANGED",
      entity_type: "event_operations_item",
      entity_id: itemId,
      summary: `${data.title}: ${nextStatus}`,
      meta: { weddingId: id, status: nextStatus },
    });
    return apiSuccess({ item: data });
  } catch (error) {
    console.error("PATCH /api/operations/events/[id]/items/[itemId]:", error);
    return apiError("The operations item could not be updated", 500);
  }
}
