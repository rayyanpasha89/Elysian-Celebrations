import { createAdminSupabaseClient } from "@/lib/supabase/server";

/** Fire-and-forget audit trail for admin money/pricing actions. */
export async function recordAudit(entry: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminSupabaseClient();
    await supabase.from("admin_audit_log").insert({
      actor_user_id: entry.actorUserId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      summary: entry.summary,
      meta: entry.meta ?? null,
    });
  } catch (e) {
    console.error("recordAudit", e);
  }
}
