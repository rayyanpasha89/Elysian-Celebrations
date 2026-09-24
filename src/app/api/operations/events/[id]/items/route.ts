import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  OPERATIONS_ITEM_KINDS,
  OPERATIONS_SEVERITIES,
  type OperationsItemKind,
  type OperationsSeverity,
} from "@/lib/operations";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : null;
}

function optionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function optionalUuid(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && isUuid(value) ? value : undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);

  const limited = await enforceRateLimit(request, {
    scope: "operations-feed-create",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const raw: unknown = await request.json();
    if (!isRecord(raw)) return apiError("Invalid operations update", 400);
    const kind = raw.kind as OperationsItemKind;
    const severity = raw.severity as OperationsSeverity;
    if (!(OPERATIONS_ITEM_KINDS as readonly string[]).includes(kind)) {
      return apiError("Choose a valid update type", 400);
    }
    if (!(OPERATIONS_SEVERITIES as readonly string[]).includes(severity)) {
      return apiError("Choose a valid severity", 400);
    }
    const requiredPermission =
      kind === "INCIDENT" || kind === "ESCALATION"
        ? "MANAGE_INCIDENTS"
        : "POST_INTERNAL_UPDATES";
    const access = await resolveOperationsAccess(session, id, requiredPermission);
    if (!access) return apiError("Event not found", 404);

    const title = text(raw.title, 180);
    const body = text(raw.body, 4000);
    const functionId = raw.eventId === null ? null : raw.eventId;
    const assigneeUserId = raw.assigneeUserId === null ? null : raw.assigneeUserId;
    const departmentId = optionalUuid(raw.departmentId);
    const zoneId = optionalUuid(raw.zoneId);
    const dueAt = optionalDate(raw.dueAt);
    if (!title) return apiError("Add a concise title", 400);
    if (functionId !== null && !isUuid(functionId)) {
      return apiError("Choose a valid function", 400);
    }
    if (assigneeUserId !== null && typeof assigneeUserId !== "string") {
      return apiError("Choose a valid assignee", 400);
    }
    if (dueAt === undefined) return apiError("Choose a valid due time", 400);
    if (departmentId === undefined || zoneId === undefined) {
      return apiError("Choose a valid department and zone", 400);
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("event_operations_items")
      .insert({
        wedding_id: id,
        wedding_event_id: functionId,
        kind,
        severity,
        title,
        body,
        assignee_user_id: assigneeUserId,
        department_id: departmentId,
        zone_id: zoneId,
        reported_by: session.userId,
        due_at: dueAt,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23514" || error.code === "23503") {
        return apiError(error.message, 409);
      }
      throw error;
    }
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: "OPERATIONS_ITEM_CREATED",
      entity_type: "event_operations_item",
      entity_id: data.id,
      summary: `${kind}: ${title}`,
      meta: { weddingId: id, severity },
    });
    return apiSuccess({ item: data }, 201);
  } catch (error) {
    console.error("POST /api/operations/events/[id]/items:", error);
    return apiError("The operations update could not be saved", 500);
  }
}
