import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  isOperationsRoleTemplate,
  normalizeOperationsPermissions,
  templatePermissions,
} from "@/lib/operations";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/id-utils";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim().slice(0, maximum) || null : undefined;
}

function optionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const [usersResult, profilesResult, assignmentsResult, eventsResult] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, name, email, phone, avatar, is_active, created_at")
          .eq("role", "MANAGER")
          .order("name"),
        supabase.from("operations_staff_profiles").select("*").order("created_at"),
        supabase
          .from("event_staff_assignments")
          .select("*")
          .order("created_at"),
        supabase
          .from("weddings")
          .select(
            "id, name, date, status, event_type, custom_event_type, destination:destinations(name)"
          )
          .neq("status", "CANCELLED")
          .order("date", { ascending: true, nullsFirst: false }),
      ]);
    const error =
      usersResult.error ??
      profilesResult.error ??
      assignmentsResult.error ??
      eventsResult.error;
    if (error) throw error;

    const profiles = new Map(
      (profilesResult.data ?? []).map((profile) => [profile.user_id, profile])
    );
    const assignmentsByUser = new Map<
      string,
      typeof assignmentsResult.data
    >();
    for (const assignment of assignmentsResult.data ?? []) {
      const current = assignmentsByUser.get(assignment.staff_user_id) ?? [];
      current.push(assignment);
      assignmentsByUser.set(assignment.staff_user_id, current);
    }

    return apiSuccess({
      staff: (usersResult.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        accountPhone: user.phone,
        avatar: user.avatar,
        accountActive: user.is_active,
        joinedAt: user.created_at,
        profile: profiles.get(user.id) ?? null,
        assignments: assignmentsByUser.get(user.id) ?? [],
      })),
      events: (eventsResult.data ?? []).map((event) => ({
        id: event.id,
        name: event.name,
        date: event.date,
        status: event.status,
        eventType: event.custom_event_type || event.event_type || "Event",
        destination: one(event.destination)?.name ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/team:", error);
    return apiError("Team controls could not be loaded", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return apiError("Invalid team update", 400);
    const action = body.action;
    const userId = typeof body.userId === "string" ? body.userId : null;
    if (!userId) return apiError("Choose an operations employee", 400);

    const supabase = createAdminSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;
    if (!user || user.role !== "MANAGER") {
      return apiError("The selected account must have the Manager role", 409);
    }

    if (action === "PROFILE") {
      if (!isOperationsRoleTemplate(body.roleTemplate)) {
        return apiError("Choose a valid role template", 400);
      }
      const jobTitle = optionalText(body.jobTitle, 120);
      const phone = optionalText(body.phone, 40);
      if (jobTitle === undefined || phone === undefined) {
        return apiError("Profile details are invalid", 400);
      }
      const isActive = body.isActive !== false;
      const permissions =
        body.permissions === undefined
          ? templatePermissions(body.roleTemplate)
          : normalizeOperationsPermissions(body.permissions);
      if (isActive && !permissions.includes("VIEW_EVENT")) {
        return apiError("Active employees must be able to view assigned events", 400);
      }
      const { data: existing } = await supabase
        .from("operations_staff_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      const payload = {
        role_template: body.roleTemplate,
        job_title: jobTitle,
        phone,
        permissions,
        is_active: isActive,
        updated_by: session.userId,
      };
      const result = existing
        ? await supabase
            .from("operations_staff_profiles")
            .update(payload)
            .eq("user_id", userId)
            .select("*")
            .single()
        : await supabase
            .from("operations_staff_profiles")
            .insert({ ...payload, user_id: userId, created_by: session.userId })
            .select("*")
            .single();
      if (result.error) throw result.error;
      await supabase.from("admin_audit_log").insert({
        actor_user_id: session.userId,
        action: existing ? "OPERATIONS_PROFILE_UPDATED" : "OPERATIONS_PROFILE_CREATED",
        entity_type: "operations_staff_profile",
        entity_id: userId,
        summary: `${user.name}: ${body.roleTemplate}`,
        meta: { permissions, isActive },
      });
      return apiSuccess({ profile: result.data });
    }

    if (action === "ASSIGNMENT") {
      if (!isUuid(body.eventId)) return apiError("Choose a valid event", 400);
      const eventRole = optionalText(body.eventRole, 120);
      const notes = optionalText(body.notes, 1000);
      const shiftStart = optionalDate(body.shiftStart);
      const shiftEnd = optionalDate(body.shiftEnd);
      if (
        eventRole === undefined ||
        notes === undefined ||
        shiftStart === undefined ||
        shiftEnd === undefined
      ) {
        return apiError("Assignment details are invalid", 400);
      }
      if (
        shiftStart &&
        shiftEnd &&
        new Date(shiftEnd).getTime() <= new Date(shiftStart).getTime()
      ) {
        return apiError("Shift end must be after shift start", 400);
      }
      const isActive = body.isActive !== false;
      const permissions =
        body.permissions === null || body.permissions === undefined
          ? null
          : normalizeOperationsPermissions(body.permissions);
      if (isActive && permissions && !permissions.includes("VIEW_EVENT")) {
        return apiError("An active assignment must include event access", 400);
      }
      const [{ data: profile }, { data: event }] = await Promise.all([
        supabase
          .from("operations_staff_profiles")
          .select("user_id, is_active")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("weddings").select("id, name").eq("id", body.eventId).maybeSingle(),
      ]);
      if (!profile?.is_active) {
        return apiError("Configure and activate the employee profile first", 409);
      }
      if (!event) return apiError("Event not found", 404);

      const { data, error } = await supabase
        .from("event_staff_assignments")
        .upsert(
          {
            wedding_id: body.eventId,
            staff_user_id: userId,
            event_role: eventRole,
            permissions,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            notes,
            is_active: isActive,
            assigned_by: session.userId,
          },
          { onConflict: "wedding_id,staff_user_id" }
        )
        .select("*")
        .single();
      if (error) throw error;
      await supabase.from("admin_audit_log").insert({
        actor_user_id: session.userId,
        action: "OPERATIONS_ASSIGNMENT_SAVED",
        entity_type: "event_staff_assignment",
        entity_id: data.id,
        summary: `${user.name} assigned to ${event.name}`,
        meta: { eventId: event.id, isActive, customPermissions: permissions },
      });
      return apiSuccess({ assignment: data });
    }

    return apiError("Choose a valid team action", 400);
  } catch (error) {
    console.error("PATCH /api/admin/team:", error);
    return apiError("Team controls could not be saved", 500);
  }
}
