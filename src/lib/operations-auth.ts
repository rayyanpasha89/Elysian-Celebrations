import "server-only";

import type { AuthSession } from "@/lib/api-utils";
import {
  OPERATIONS_PERMISSIONS,
  effectiveOperationsPermissions,
  type OperationsPermission,
} from "@/lib/operations";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type OperationsAccess = {
  userId: string;
  isAdmin: boolean;
  permissions: OperationsPermission[];
  eventRole: string | null;
};

export async function resolveOperationsAccess(
  session: AuthSession,
  weddingId: string,
  requiredPermission: OperationsPermission = "VIEW_EVENT"
): Promise<OperationsAccess | null> {
  if (session.role === "admin") {
    return {
      userId: session.userId,
      isAdmin: true,
      permissions: [...OPERATIONS_PERMISSIONS],
      eventRole: "Administrator",
    };
  }
  if (session.role !== "manager") return null;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("event_staff_assignments")
    .select(
      "event_role, permissions, is_active, profile:operations_staff_profiles!event_staff_assignments_staff_user_id_fkey(permissions, is_active)"
    )
    .eq("wedding_id", weddingId)
    .eq("staff_user_id", session.userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;

  const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
  if (!profile?.is_active) return null;
  const permissions = effectiveOperationsPermissions(
    profile.permissions,
    data.permissions
  );
  if (!permissions.includes(requiredPermission)) return null;
  return {
    userId: session.userId,
    isAdmin: false,
    permissions,
    eventRole: data.event_role,
  };
}

