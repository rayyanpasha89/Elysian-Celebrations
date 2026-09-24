import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import {
  parseProductionRecordInput,
  type ProductionVisibility,
} from "@/lib/event-production";
import { isUuid } from "@/lib/id-utils";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

type AttachmentInput = {
  title: string;
  url: string;
  classification: "CLIENT" | "INTERNAL" | "FINANCE" | "PRIVATE_IDENTITY";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalUuid(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && isUuid(value) ? value : undefined;
}

function parseAttachments(value: unknown): AttachmentInput[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) return null;
  const result: AttachmentInput[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 180) : "";
    const url = typeof item.url === "string" ? item.url.trim().slice(0, 2048) : "";
    const classification = item.classification ?? "INTERNAL";
    if (
      !title ||
      !/^https:\/\//i.test(url) ||
      !["CLIENT", "INTERNAL", "FINANCE", "PRIVATE_IDENTITY"].includes(String(classification))
    ) {
      return null;
    }
    result.push({
      title,
      url,
      classification: classification as AttachmentInput["classification"],
    });
  }
  return result;
}

function visibleToAccess(
  visibility: ProductionVisibility,
  canManage: boolean,
  canViewFinancials: boolean
) {
  if (visibility === "FINANCE") return canViewFinancials;
  if (visibility === "PRIVATE") return canManage;
  return true;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);

  try {
    const access = await resolveOperationsAccess(session, id, "VIEW_EVENT");
    if (!access) return apiError("Event not found", 404);
    const canManage = access.permissions.includes("MANAGE_PRODUCTION");
    const canViewFinancials = access.permissions.includes("VIEW_FINANCIALS");
    const supabase = createAdminSupabaseClient();
    const { data: records, error } = await supabase
      .from("event_production_records")
      .select("*")
      .eq("wedding_id", id)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const visibleRecords = (records ?? []).filter((record) =>
      visibleToAccess(
        record.visibility as ProductionVisibility,
        canManage,
        canViewFinancials
      )
    );
    const recordIds = visibleRecords.map((record) => record.id);
    const [{ data: attachments, error: attachmentError }, { data: activity, error: activityError }] =
      recordIds.length
        ? await Promise.all([
            supabase
              .from("event_production_attachments")
              .select("*")
              .eq("wedding_id", id)
              .in("record_id", recordIds)
              .order("created_at", { ascending: true }),
            supabase
              .from("event_production_activity")
              .select("id, record_id, action, actor_user_id, created_at")
              .eq("wedding_id", id)
              .in("record_id", recordIds)
              .order("created_at", { ascending: false }),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
    if (attachmentError) throw attachmentError;
    if (activityError) throw activityError;

    return apiSuccess({
      records: visibleRecords.map((record) => ({
        ...record,
        attachments: (attachments ?? []).filter(
          (attachment) =>
            attachment.record_id === record.id &&
            (attachment.classification !== "FINANCE" || canViewFinancials) &&
            (attachment.classification !== "PRIVATE_IDENTITY" || canManage)
        ),
        activity: (activity ?? []).filter((entry) => entry.record_id === record.id),
      })),
      permissions: {
        canManage,
        canViewFinancials,
      },
    });
  } catch (error) {
    console.error("GET /api/operations/events/[id]/production:", error);
    return apiError("The production dossier could not be loaded", 500);
  }
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
    scope: "event-production-create",
    limit: 30,
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
    const eventId = optionalUuid(raw.eventId);
    const departmentId = optionalUuid(raw.departmentId);
    const zoneId = optionalUuid(raw.zoneId);
    const ownerAssignmentId = optionalUuid(raw.ownerAssignmentId);
    const attachments = parseAttachments(raw.attachments);
    if (
      eventId === undefined ||
      departmentId === undefined ||
      zoneId === undefined ||
      ownerAssignmentId === undefined
    ) {
      return apiError("Choose valid event ownership details", 400);
    }
    if (!attachments) return apiError("Add valid HTTPS attachment links", 400);

    const value = parsed.value;
    const supabase = createAdminSupabaseClient();
    const { data: recordId, error } = await supabase.rpc(
      "create_event_production_record",
      {
        p_wedding_id: id,
        p_wedding_event_id: eventId as string,
        p_record_type: value.recordType,
        p_title: value.title,
        p_description: value.description as string,
        p_status: value.status,
        p_visibility: value.visibility,
        p_department_id: departmentId as string,
        p_zone_id: zoneId as string,
        p_owner_assignment_id: ownerAssignmentId as string,
        p_owner_label: value.ownerLabel as string,
        p_due_at: value.dueAt as string,
        p_amount: value.amount as number,
        p_currency: value.currency,
        p_payload: value.payload as Json,
        p_actor_user_id: session.userId,
        p_attachments: attachments as Json,
      }
    );
    if (error) {
      if (["23503", "23514", "23505"].includes(error.code ?? "")) {
        return apiError("The selected function, owner, department, or zone is outside this event", 409);
      }
      throw error;
    }
    if (!recordId) throw new Error("Production record ID was not returned");
    const { data, error: recordError } = await supabase
      .from("event_production_records")
      .select("*")
      .eq("id", recordId)
      .eq("wedding_id", id)
      .single();
    if (recordError) throw recordError;
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: "EVENT_PRODUCTION_RECORD_CREATED",
      entity_type: "event_production_record",
      entity_id: recordId,
      summary: `${value.recordType}: ${value.title}`,
      meta: { weddingId: id },
    });
    return apiSuccess({ record: data }, 201);
  } catch (error) {
    console.error("POST /api/operations/events/[id]/production:", error);
    return apiError("The production record could not be saved", 500);
  }
}
