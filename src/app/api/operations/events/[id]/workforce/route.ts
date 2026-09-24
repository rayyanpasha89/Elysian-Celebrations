import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import {
  OPERATIONS_BRIEFING_PRIORITIES,
  OPERATIONS_SHIFT_STATUSES,
  type OperationsBriefingPriority,
  type OperationsShiftStatus,
} from "@/lib/operations";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type Payload = Record<string, unknown>;

function isRecord(value: unknown): value is Payload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : null;
}

function optionalText(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim().slice(0, maximum) || null : undefined;
}

function optionalUuid(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && isUuid(value) ? value : undefined;
}

function requiredDate(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function optionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return requiredDate(value) ?? undefined;
}

function conflict(error: { code?: string; message?: string }) {
  if (error.code === "23P01") {
    return apiError("This crew member already has an overlapping shift", 409);
  }
  if (error.code === "23505") {
    return apiError("That department, zone, or workforce record already exists", 409);
  }
  if (error.code === "23503") {
    return apiError("The selected function, team, department, or zone is outside this event", 409);
  }
  if (error.code === "23514") {
    return apiError("The workforce status or attendance sequence is invalid", 409);
  }
  return null;
}

const STANDARD_DEPARTMENTS = [
  ["Command", "COMMAND", "#333d29"],
  ["Production", "PRODUCTION", "#582f0e"],
  ["Guest Experience", "GUEST", "#656d4a"],
  ["Venue Operations", "VENUE", "#7f4f24"],
  ["Food & Beverage", "FNB", "#936639"],
  ["Transport", "TRANSPORT", "#414833"],
  ["Security", "SECURITY", "#333d29"],
  ["Stage & AV", "STAGE_AV", "#a68a64"],
  ["Vendor Operations", "VENDOR_OPS", "#656d4a"],
  ["Medical & Safety", "MEDICAL", "#7f4f24"],
] as const;

const STANDARD_ZONES = [
  ["Command center", "COMMAND"],
  ["Guest arrival", "ARRIVAL"],
  ["Main stage", "MAIN_STAGE"],
  ["Backstage", "BACKSTAGE"],
  ["Guest services", "GUEST_SERVICES"],
  ["Loading dock", "LOAD_IN"],
  ["Transport & parking", "TRANSPORT"],
  ["Catering back of house", "CATERING_BOH"],
  ["Medical point", "MEDICAL"],
] as const;

async function audit(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  weddingId: string,
  meta: Record<string, unknown> = {}
) {
  const supabase = createAdminSupabaseClient();
  await supabase.from("admin_audit_log").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    meta: { weddingId, ...meta },
  });
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
    scope: "operations-workforce-write",
    limit: 40,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const raw: unknown = await request.json();
    if (!isRecord(raw)) return apiError("Invalid workforce request", 400);
    const action = raw.action;
    const requiredPermission =
      action === "CREATE_BRIEFING" ? "POST_INTERNAL_UPDATES" : "MANAGE_STAFF";
    const access = await resolveOperationsAccess(session, id, requiredPermission);
    if (!access) return apiError("Event not found", 404);
    const supabase = createAdminSupabaseClient();

    if (action === "BOOTSTRAP_STRUCTURE") {
      const [{ data: departments, error: departmentError }, { data: zones, error: zoneError }] =
        await Promise.all([
          supabase
            .from("event_operations_departments")
            .upsert(
              STANDARD_DEPARTMENTS.map(([name, code, color], sortOrder) => ({
                wedding_id: id,
                name,
                code,
                color,
                sort_order: sortOrder,
                created_by: session.userId,
              })),
              { onConflict: "wedding_id,code" }
            )
            .select("id"),
          supabase
            .from("event_operations_zones")
            .upsert(
              STANDARD_ZONES.map(([name, code], sortOrder) => ({
                wedding_id: id,
                name,
                code,
                sort_order: sortOrder,
                created_by: session.userId,
              })),
              { onConflict: "wedding_id,code" }
            )
            .select("id"),
        ]);
      if (departmentError) return conflict(departmentError) ?? (() => { throw departmentError; })();
      if (zoneError) return conflict(zoneError) ?? (() => { throw zoneError; })();
      await audit(session.userId, "OPERATIONS_STRUCTURE_BOOTSTRAPPED", "wedding", id, "Standard operations structure created", id);
      return apiSuccess({ departmentCount: departments.length, zoneCount: zones.length }, 201);
    }

    if (action === "CREATE_DEPARTMENT") {
      const name = requiredText(raw.name, 100);
      const code = requiredText(raw.code, 20)?.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const color = typeof raw.color === "string" ? raw.color.trim() : "#656d4a";
      if (!name || !code || code.length < 2 || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return apiError("Add a valid department name, code, and color", 400);
      }
      const { data, error } = await supabase
        .from("event_operations_departments")
        .insert({ wedding_id: id, name, code, color, created_by: session.userId })
        .select("*")
        .single();
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_DEPARTMENT_CREATED", "event_operations_department", data.id, name, id);
      return apiSuccess({ department: data }, 201);
    }

    if (action === "CREATE_ZONE") {
      const name = requiredText(raw.name, 120);
      const code = requiredText(raw.code, 20)?.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const meetingPoint = optionalText(raw.meetingPoint, 300);
      const emergencyNotes = optionalText(raw.emergencyNotes, 1000);
      const capacity =
        raw.capacity === null || raw.capacity === undefined || raw.capacity === ""
          ? null
          : Number(raw.capacity);
      if (
        !name ||
        !code ||
        code.length < 2 ||
        meetingPoint === undefined ||
        emergencyNotes === undefined ||
        (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000))
      ) {
        return apiError("Add valid zone details", 400);
      }
      const { data, error } = await supabase
        .from("event_operations_zones")
        .insert({
          wedding_id: id,
          name,
          code,
          capacity,
          meeting_point: meetingPoint,
          emergency_notes: emergencyNotes,
          created_by: session.userId,
        })
        .select("*")
        .single();
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_ZONE_CREATED", "event_operations_zone", data.id, name, id);
      return apiSuccess({ zone: data }, 201);
    }

    if (action === "CREATE_SHIFT") {
      const staffUserId = requiredText(raw.staffUserId, 180);
      const eventId = optionalUuid(raw.eventId);
      const departmentId = optionalUuid(raw.departmentId);
      const zoneId = optionalUuid(raw.zoneId);
      const supervisorUserId = optionalText(raw.supervisorUserId, 180);
      const roleLabel = requiredText(raw.roleLabel, 120);
      const shiftStart = requiredDate(raw.shiftStart);
      const shiftEnd = requiredDate(raw.shiftEnd);
      const handoffNotes = optionalText(raw.handoffNotes, 2000);
      if (
        !staffUserId ||
        eventId === undefined ||
        departmentId === undefined ||
        zoneId === undefined ||
        supervisorUserId === undefined ||
        !roleLabel ||
        !shiftStart ||
        !shiftEnd ||
        handoffNotes === undefined ||
        new Date(shiftEnd).getTime() <= new Date(shiftStart).getTime()
      ) {
        return apiError("Add a valid crew member, role, and shift window", 400);
      }
      const { data: assignment } = await supabase
        .from("event_staff_assignments")
        .select("id")
        .eq("wedding_id", id)
        .eq("staff_user_id", staffUserId)
        .eq("is_active", true)
        .maybeSingle();
      if (!assignment) return apiError("Assign this employee to the event first", 409);
      let supervisorAssignmentId: string | null = null;
      if (supervisorUserId) {
        const { data: supervisor } = await supabase
          .from("event_staff_assignments")
          .select("id")
          .eq("wedding_id", id)
          .eq("staff_user_id", supervisorUserId)
          .eq("is_active", true)
          .maybeSingle();
        if (!supervisor) return apiError("Choose an active event supervisor", 409);
        supervisorAssignmentId = supervisor.id;
      }
      const { data, error } = await supabase
        .from("event_crew_shifts")
        .insert({
          wedding_id: id,
          assignment_id: assignment.id,
          wedding_event_id: eventId,
          department_id: departmentId,
          zone_id: zoneId,
          supervisor_assignment_id: supervisorAssignmentId,
          role_label: roleLabel,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          handoff_notes: handoffNotes,
          created_by: session.userId,
          updated_by: session.userId,
        })
        .select("*")
        .single();
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_SHIFT_CREATED", "event_crew_shift", data.id, roleLabel, id, { staffUserId });
      return apiSuccess({ shift: data }, 201);
    }

    if (action === "CREATE_SHIFT_BATCH") {
      const staffUserIds = Array.isArray(raw.staffUserIds)
        ? [...new Set(raw.staffUserIds.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim().slice(0, 180)))].slice(0, 100)
        : [];
      const eventId = optionalUuid(raw.eventId);
      const departmentId = optionalUuid(raw.departmentId);
      const zoneId = optionalUuid(raw.zoneId);
      const supervisorUserId = optionalText(raw.supervisorUserId, 180);
      const roleLabel = requiredText(raw.roleLabel, 120);
      const shiftStart = requiredDate(raw.shiftStart);
      const shiftEnd = requiredDate(raw.shiftEnd);
      const handoffNotes = optionalText(raw.handoffNotes, 2000);
      if (
        staffUserIds.length === 0 ||
        eventId === undefined ||
        departmentId === undefined ||
        zoneId === undefined ||
        supervisorUserId === undefined ||
        !roleLabel ||
        !shiftStart ||
        !shiftEnd ||
        handoffNotes === undefined ||
        new Date(shiftEnd).getTime() <= new Date(shiftStart).getTime()
      ) {
        return apiError("Choose crew members and add a valid shift window", 400);
      }
      const { data: assignments, error: assignmentError } = await supabase
        .from("event_staff_assignments")
        .select("id, staff_user_id")
        .eq("wedding_id", id)
        .eq("is_active", true)
        .in("staff_user_id", staffUserIds);
      if (assignmentError) throw assignmentError;
      if ((assignments ?? []).length !== staffUserIds.length) {
        return apiError("Every selected employee must have active event access", 409);
      }
      let supervisorAssignmentId: string | null = null;
      if (supervisorUserId) {
        const { data: supervisor } = await supabase
          .from("event_staff_assignments")
          .select("id")
          .eq("wedding_id", id)
          .eq("staff_user_id", supervisorUserId)
          .eq("is_active", true)
          .maybeSingle();
        if (!supervisor) return apiError("Choose an active event supervisor", 409);
        supervisorAssignmentId = supervisor.id;
      }
      const { data, error } = await supabase
        .from("event_crew_shifts")
        .insert(
          (assignments ?? []).map((assignment) => ({
            wedding_id: id,
            assignment_id: assignment.id,
            wedding_event_id: eventId,
            department_id: departmentId,
            zone_id: zoneId,
            supervisor_assignment_id: supervisorAssignmentId,
            role_label: roleLabel,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            handoff_notes: handoffNotes,
            created_by: session.userId,
            updated_by: session.userId,
          }))
        )
        .select("*");
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_SHIFT_BATCH_CREATED", "wedding", id, `${data.length} crew shifts scheduled`, id, { staffUserIds });
      return apiSuccess({ shifts: data }, 201);
    }

    if (action === "CREATE_BRIEFING") {
      const title = requiredText(raw.title, 180);
      const body = requiredText(raw.body, 8000);
      const priority = raw.priority as OperationsBriefingPriority;
      const eventId = optionalUuid(raw.eventId);
      const departmentId = optionalUuid(raw.departmentId);
      const zoneId = optionalUuid(raw.zoneId);
      const expiresAt = optionalDate(raw.expiresAt);
      if (
        !title ||
        !body ||
        !(OPERATIONS_BRIEFING_PRIORITIES as readonly string[]).includes(priority) ||
        eventId === undefined ||
        departmentId === undefined ||
        zoneId === undefined ||
        expiresAt === undefined
      ) {
        return apiError("Add a valid briefing, priority, and audience", 400);
      }
      const { data, error } = await supabase
        .from("event_operations_briefings")
        .insert({
          wedding_id: id,
          wedding_event_id: eventId,
          department_id: departmentId,
          zone_id: zoneId,
          title,
          body,
          priority,
          requires_acknowledgement: raw.requiresAcknowledgement !== false,
          published_by: session.userId,
          expires_at: expiresAt,
        })
        .select("*")
        .single();
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_BRIEFING_PUBLISHED", "event_operations_briefing", data.id, title, id, { priority });
      return apiSuccess({ briefing: data }, 201);
    }

    return apiError("Choose a valid workforce action", 400);
  } catch (error) {
    console.error("POST /api/operations/events/[id]/workforce:", error);
    return apiError("The workforce update could not be saved", 500);
  }
}

export async function PATCH(
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
    scope: "operations-workforce-write",
    limit: 40,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  try {
    const raw: unknown = await request.json();
    if (!isRecord(raw)) return apiError("Invalid workforce request", 400);
    const access = await resolveOperationsAccess(session, id);
    if (!access) return apiError("Event not found", 404);
    const supabase = createAdminSupabaseClient();

    if (raw.action === "UPDATE_SHIFT_STATUS") {
      const shiftId = optionalUuid(raw.shiftId);
      const status = raw.status as OperationsShiftStatus;
      if (!shiftId || !(OPERATIONS_SHIFT_STATUSES as readonly string[]).includes(status)) {
        return apiError("Choose a valid shift and status", 400);
      }
      const { data: shift } = await supabase
        .from("event_crew_shifts")
        .select("id, status, checked_in_at, assignment:event_staff_assignments!event_crew_shift_assignment_fk(staff_user_id)")
        .eq("id", shiftId)
        .eq("wedding_id", id)
        .maybeSingle();
      if (!shift) return apiError("Shift not found", 404);
      const assignment = Array.isArray(shift.assignment) ? shift.assignment[0] : shift.assignment;
      const isOwnShift = assignment?.staff_user_id === session.userId;
      if (!access.isAdmin && !isOwnShift && !access.permissions.includes("MANAGE_STAFF")) {
        return apiError("You can only update your own attendance", 403);
      }
      const now = new Date().toISOString();
      const attendance =
        status === "CHECKED_IN"
          ? { checked_in_at: shift.checked_in_at ?? now, checked_out_at: null }
          : status === "CHECKED_OUT"
            ? { checked_in_at: shift.checked_in_at ?? now, checked_out_at: now }
            : { checked_in_at: status === "PLANNED" ? null : shift.checked_in_at, checked_out_at: null };
      const { data, error } = await supabase
        .from("event_crew_shifts")
        .update({ status, ...attendance, updated_by: session.userId })
        .eq("id", shiftId)
        .eq("wedding_id", id)
        .select("*")
        .single();
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_SHIFT_STATUS_CHANGED", "event_crew_shift", data.id, `${data.role_label}: ${status}`, id, { status });
      return apiSuccess({ shift: data });
    }

    if (raw.action === "ACKNOWLEDGE_BRIEFING") {
      const briefingId = optionalUuid(raw.briefingId);
      if (!briefingId) return apiError("Choose a valid briefing", 400);
      const [{ data: briefing }, { data: assignment }] = await Promise.all([
        supabase
          .from("event_operations_briefings")
          .select("id, title")
          .eq("id", briefingId)
          .eq("wedding_id", id)
          .maybeSingle(),
        supabase
          .from("event_staff_assignments")
          .select("id")
          .eq("wedding_id", id)
          .eq("staff_user_id", session.userId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);
      if (!briefing) return apiError("Briefing not found", 404);
      if (!assignment) return apiError("Only assigned event crew can acknowledge a briefing", 409);
      const { data, error } = await supabase
        .from("event_operations_briefing_reads")
        .upsert(
          { wedding_id: id, briefing_id: briefingId, assignment_id: assignment.id, acknowledged_at: new Date().toISOString() },
          { onConflict: "briefing_id,assignment_id" }
        )
        .select("*")
        .single();
      if (error) return conflict(error) ?? (() => { throw error; })();
      await audit(session.userId, "OPERATIONS_BRIEFING_ACKNOWLEDGED", "event_operations_briefing", briefingId, briefing.title, id);
      return apiSuccess({ acknowledgement: data });
    }

    return apiError("Choose a valid workforce action", 400);
  } catch (error) {
    console.error("PATCH /api/operations/events/[id]/workforce:", error);
    return apiError("The workforce update could not be saved", 500);
  }
}
