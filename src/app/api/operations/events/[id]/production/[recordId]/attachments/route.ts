import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const CLASSIFICATIONS = ["CLIENT", "INTERNAL", "FINANCE", "PRIVATE_IDENTITY"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
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
    scope: "event-production-attachment-create",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const access = await resolveOperationsAccess(session, id, "MANAGE_PRODUCTION");
    if (!access) return apiError("Event not found", 404);
    const raw: unknown = await request.json();
    if (!isRecord(raw)) return apiError("Invalid reference link", 400);
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 180) : "";
    const url = typeof raw.url === "string" ? raw.url.trim().slice(0, 2048) : "";
    const classification = typeof raw.classification === "string" ? raw.classification : "INTERNAL";
    if (!title) return apiError("Add a reference title", 400);
    if (!/^https:\/\//i.test(url)) return apiError("Use a secure HTTPS link", 400);
    if (!(CLASSIFICATIONS as readonly string[]).includes(classification)) {
      return apiError("Choose a valid reference classification", 400);
    }

    const supabase = createAdminSupabaseClient();
    const { data: record, error: recordError } = await supabase
      .from("event_production_records")
      .select("id")
      .eq("id", recordId)
      .eq("wedding_id", id)
      .maybeSingle();
    if (recordError) throw recordError;
    if (!record) return apiError("Production record not found", 404);

    const { data, error } = await supabase
      .from("event_production_attachments")
      .insert({
        wedding_id: id,
        record_id: recordId,
        title,
        url,
        classification,
        created_by: session.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: "EVENT_PRODUCTION_ATTACHMENT_CREATED",
      entity_type: "event_production_attachment",
      entity_id: data.id,
      summary: title,
      meta: { weddingId: id, recordId, classification },
    });
    return apiSuccess({ attachment: data }, 201);
  } catch (error) {
    console.error("POST production attachment:", error);
    return apiError("The reference link could not be saved", 500);
  }
}
