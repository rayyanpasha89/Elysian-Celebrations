import "server-only";

import type { ProductionRecordType, ProductionVisibility } from "@/lib/event-production";
import type { OperationsPermission } from "@/lib/operations";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function loadPrintableProductionRecords(
  weddingId: string,
  permissions: readonly OperationsPermission[]
) {
  const canManage = permissions.includes("MANAGE_PRODUCTION");
  const canViewFinancials = permissions.includes("VIEW_FINANCIALS");
  const supabase = createAdminSupabaseClient();
  const { data: records, error } = await supabase
    .from("event_production_records")
    .select("*")
    .eq("wedding_id", weddingId)
    .neq("status", "CANCELLED")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const visible = (records ?? []).filter((record) => {
    const visibility = record.visibility as ProductionVisibility;
    if (visibility === "FINANCE") return canViewFinancials;
    if (visibility === "PRIVATE") return canManage;
    return true;
  });
  if (!visible.length) return [];

  const { data: attachments, error: attachmentError } = await supabase
    .from("event_production_attachments")
    .select("id, record_id, title, url, classification")
    .eq("wedding_id", weddingId)
    .in("record_id", visible.map((record) => record.id))
    .order("created_at", { ascending: true });
  if (attachmentError) throw attachmentError;

  return visible.map((record) => ({
    ...record,
    record_type: record.record_type as ProductionRecordType,
    notes:
      record.payload &&
      typeof record.payload === "object" &&
      !Array.isArray(record.payload) &&
      typeof record.payload.notes === "string"
        ? record.payload.notes
        : null,
    attachments: (attachments ?? []).filter(
      (attachment) =>
        attachment.record_id === record.id &&
        attachment.classification !== "PRIVATE_IDENTITY" &&
        (attachment.classification !== "FINANCE" || canViewFinancials)
    ),
  }));
}
