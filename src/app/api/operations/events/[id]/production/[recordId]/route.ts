import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { parseProductionRecordInput } from "@/lib/event-production";
import { isUuid } from "@/lib/id-utils";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalUuid(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && isUuid(value) ? value : undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id, recordId } = await params;
  if (!isUuid(id) || !isUuid(recordId)) return apiError("Invalid production record", 400);

  const limited = await enforceRateLimit(request, {
    scope: "event-production-update",
    limit: 40,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const access = await resolveOperationsAccess(session, id, "MANAGE_PRODUCTION");
    if (!access) return apiError("Event not found", 404);
    const raw: unknown = await request.json();
    if (!isRecord(raw)) return apiError("Invalid production record", 400);
    const parsed = parseProductionRecordInput(raw);
    if (!parsed.ok) return apiError(parsed.error, 400);
    const version = Number(raw.version);
    if (!Number.isSafeInteger(version) || version < 1) {
      return apiError("Refresh this record before saving", 409);
    }
    const eventId = optionalUuid(raw.eventId);
    const departmentId = optionalUuid(raw.departmentId);
    const zoneId = optionalUuid(raw.zoneId);
    const ownerAssignmentId = optionalUuid(raw.ownerAssignmentId);
    if (
      eventId === undefined ||
      departmentId === undefined ||
      zoneId === undefined ||
      ownerAssignmentId === undefined
    ) {
      return apiError("Choose valid event ownership details", 400);
    }
    const value = parsed.value;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("event_production_records")
      .update({
        wedding_event_id: eventId,
        record_type: value.recordType,
        title: value.title,
        description: value.description,
        status: value.status,
        visibility: value.visibility,
        department_id: departmentId,
        zone_id: zoneId,
        owner_assignment_id: ownerAssignmentId,
        owner_label: value.ownerLabel,
        due_at: value.dueAt,
        amount: value.amount,
        currency: value.currency,
        payload: value.payload as Json,
        version: version + 1,
        updated_by: session.userId,
      })
      .eq("id", recordId)
      .eq("wedding_id", id)
      .eq("version", version)
      .select("*")
      .maybeSingle();
    if (error) {
      if (["23503", "23514"].includes(error.code ?? "")) {
        return apiError("The selected function, owner, department, or zone is outside this event", 409);
      }
      throw error;
    }
    if (!data) return apiError("This record changed elsewhere. Refresh before saving.", 409);
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: "EVENT_PRODUCTION_RECORD_UPDATED",
      entity_type: "event_production_record",
      entity_id: recordId,
      summary: `${value.recordType}: ${value.title}`,
      meta: { weddingId: id, status: value.status, version: data.version },
    });
    return apiSuccess({ record: data });
  } catch (error) {
    console.error("PATCH /api/operations/events/[id]/production/[recordId]:", error);
    return apiError("The production record could not be updated", 500);
  }
}
