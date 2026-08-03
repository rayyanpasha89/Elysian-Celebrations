import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

type AdminAuditInsert =
  Database["public"]["Tables"]["admin_audit_log"]["Insert"];

/** Fire-and-forget audit trail for admin money/pricing actions. */
export async function recordAudit(entry: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  meta?: Json;
}) {
  try {
    const supabase = createAdminSupabaseClient();
    const insert: AdminAuditInsert = {
      actor_user_id: entry.actorUserId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      summary: entry.summary,
      meta: entry.meta ?? null,
    };
    await supabase.from("admin_audit_log").insert(insert);
  } catch (e) {
    console.error("recordAudit", e);
  }
}
