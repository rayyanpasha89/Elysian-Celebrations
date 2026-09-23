import "server-only";

import { apiError, type AuthSession } from "@/lib/api-utils";
import {
  OPERATIONS_PERMISSIONS,
  effectiveOperationsPermissions,
  normalizeOperationsPermissions,
  type OperationsPermission,
} from "@/lib/operations";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type OperationsAccess = {
  userId: string;
  isAdmin: boolean;
  permissions: OperationsPermission[];
  eventRole: string | null;
};

export type OperationsStaffScope = {
  isActive: boolean;
  permissions: OperationsPermission[];
  eventIds: string[];
};

/**
 * A Manager account becomes event-scoped as soon as an operations profile is
 * created. Inactive profiles remain scoped so disabling an employee cannot
 * accidentally restore the legacy platform-manager access surface.
 */
export async function loadOperationsStaffScope(
  session: AuthSession
): Promise<OperationsStaffScope | null> {
  if (session.role !== "manager") return null;

  const supabase = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from("operations_staff_profiles")
    .select("permissions, is_active")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;

  const { data: assignments, error: assignmentError } = await supabase
    .from("event_staff_assignments")
    .select("wedding_id")
    .eq("staff_user_id", session.userId)
    .eq("is_active", true);
  if (assignmentError) throw assignmentError;

  return {
    isActive: profile.is_active,
    permissions: normalizeOperationsPermissions(profile.permissions),
    eventIds: profile.is_active
      ? (assignments ?? []).map((assignment) => assignment.wedding_id)
      : [],
  };
}

export async function rejectScopedOperationsManager(session: AuthSession) {
  const scope = await loadOperationsStaffScope(session);
  return scope
    ? apiError(
        "This employee account is limited to assigned event operations",
        403
      )
    : null;
}

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
