import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string; attachmentId: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id, recordId, attachmentId } = await params;
  if (![id, recordId, attachmentId].every(isUuid)) {
    return apiError("Invalid reference link", 400);
  }

  const limited = await enforceRateLimit(request, {
    scope: "event-production-attachment-delete",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const access = await resolveOperationsAccess(session, id, "MANAGE_PRODUCTION");
    if (!access) return apiError("Event not found", 404);
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("event_production_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("record_id", recordId)
      .eq("wedding_id", id)
      .select("id, title, classification")
      .maybeSingle();
    if (error) throw error;
    if (!data) return apiError("Reference link not found", 404);
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: "EVENT_PRODUCTION_ATTACHMENT_REMOVED",
      entity_type: "event_production_attachment",
      entity_id: attachmentId,
      summary: data.title,
      meta: { weddingId: id, recordId, classification: data.classification },
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("DELETE production attachment:", error);
    return apiError("The reference link could not be removed", 500);
  }
}
