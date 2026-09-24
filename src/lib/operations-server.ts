import "server-only";

import type { AuthSession } from "@/lib/api-utils";
import { evaluateEventReadiness, type EventReadinessRow } from "@/lib/event-readiness";
import {
  loadOperationsStaffScope,
  resolveOperationsAccess,
} from "@/lib/operations-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null | undefined;

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function relationList<T>(value: Relation<T>): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export async function loadOperationsEventList(session: AuthSession) {
  const supabase = createAdminSupabaseClient();
  let eventIds: string[] | null = null;
  let needsProfile = false;

  if (session.role !== "admin") {
    if (session.role !== "manager") return { events: [], needsProfile: false };
    const staffScope = await loadOperationsStaffScope(session);
    if (staffScope && !staffScope.isActive) {
      needsProfile = true;
      return { events: [], needsProfile };
    }
    if (staffScope) {
      eventIds = staffScope.eventIds;
      if (eventIds.length === 0) return { events: [], needsProfile };
    }
  }

  let eventQuery = supabase
    .from("weddings")
    .select(
      "id, name, date, status, event_type, custom_event_type, destination:destinations(name, country, hero_image)"
    )
    .neq("status", "CANCELLED")
    .order("date", { ascending: true, nullsFirst: false });
  if (eventIds) eventQuery = eventQuery.in("id", eventIds);

  const { data: events, error } = await eventQuery;
  if (error) throw error;
  const ids = (events ?? []).map((event) => event.id);
  if (ids.length === 0) return { events: [], needsProfile };

  const [{ data: functions }, { data: items }] = await Promise.all([
    supabase
      .from("wedding_events")
      .select("id, wedding_id, date, start_time, end_time")
      .in("wedding_id", ids),
    supabase
      .from("event_operations_items")
      .select("wedding_id, status, severity, due_at")
      .in("wedding_id", ids)
      .neq("status", "RESOLVED"),
  ]);

  const now = Date.now();
  return {
    needsProfile,
    events: (events ?? []).map((event) => {
      const destination = one(event.destination);
      const eventFunctions = (functions ?? []).filter(
        (entry) => entry.wedding_id === event.id
      );
      const operationsItems = (items ?? []).filter(
        (entry) => entry.wedding_id === event.id
      );
      const nextFunction = eventFunctions
        .filter((entry) => entry.date && new Date(entry.date).getTime() >= now - 86_400_000)
        .sort((left, right) =>
          `${left.date ?? ""}${left.start_time ?? ""}`.localeCompare(
            `${right.date ?? ""}${right.start_time ?? ""}`
          )
        )[0];
      return {
        id: event.id,
        name: event.name,
        date: event.date,
        status: event.status,
        eventType: event.custom_event_type || event.event_type || "Event",
        destination: destination?.name ?? null,
        country: destination?.country ?? null,
        heroImage: destination?.hero_image ?? null,
        functionCount: eventFunctions.length,
        nextFunctionAt: nextFunction?.date ?? null,
        openItems: operationsItems.length,
        criticalItems: operationsItems.filter(
          (item) => item.severity === "CRITICAL" || item.severity === "URGENT"
        ).length,
        overdueItems: operationsItems.filter(
          (item) => item.due_at && new Date(item.due_at).getTime() < now
        ).length,
      };
    }),
  };
}

export async function loadOperationsWorkspace(
  session: AuthSession,
  weddingId: string
) {
  const access = await resolveOperationsAccess(session, weddingId);
  if (!access) return null;
  const supabase = createAdminSupabaseClient();

  const [
    { data: eventPlan, error: eventError },
    { data: days, error: dayError },
    { data: assignments, error: assignmentError },
    { data: operationsItems, error: itemError },
  ] = await Promise.all([
    supabase
      .from("weddings")
      .select(
        "id, name, date, status, event_type, custom_event_type, destination_id, client_profile_id, destination:destinations(name, country, hero_image), client:client_profiles(partner_name, user:users(name, email, phone))"
      )
      .eq("id", weddingId)
      .maybeSingle(),
    supabase
      .from("wedding_days")
      .select("id, name, date, sort_order")
      .eq("wedding_id", weddingId)
      .order("sort_order"),
    supabase
      .from("event_staff_assignments")
      .select(
        "id, staff_user_id, event_role, permissions, shift_start, shift_end, notes, is_active, profile:operations_staff_profiles!event_staff_assignments_staff_user_id_fkey(role_template, job_title, phone, permissions, is_active, user:users(name, email, phone, avatar))"
      )
      .eq("wedding_id", weddingId)
      .eq("is_active", true),
    supabase
      .from("event_operations_items")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false }),
  ]);
  if (eventError) throw eventError;
  if (dayError) throw dayError;
  if (assignmentError) throw assignmentError;
  if (itemError) throw itemError;
  if (!eventPlan) return null;

  const dayIds = (days ?? []).map((day) => day.id);
  const { data: functions, error: functionError } = dayIds.length
    ? await supabase
        .from("wedding_events")
        .select(
          "id, wedding_id, wedding_day_id, name, event_type, time_block, date, start_time, end_time, venue, guest_count, estimated_budget, notes, sort_order, requirements:wedding_event_requirements(category, title, status, priority, vendor_profile_id, vendor_service_id, notes), menus:wedding_event_menus(id, name, meal_period, service_style, notes, items:wedding_event_menu_items(id, name, course, dietary_tags, notes, sort_order)), logistics:wedding_event_logistics(guest_arrival_time, vendor_load_in_time, family_call_time, transport_notes, rooming_notes, weather_plan, ceremony_notes), tasks:wedding_event_tasks(id, title, owner, status, due_date, sort_order), bookings(id, status, final_price, price_published, vendor:vendor_profiles(business_name, user_id), service:vendor_services(name, service_scope), payments(kind, amount, voided_at))"
        )
        .eq("wedding_id", weddingId)
        .order("sort_order")
    : { data: [], error: null };
  if (functionError) throw functionError;

  const [
    { data: departments, error: departmentError },
    { data: zones, error: zoneError },
    { data: shifts, error: shiftError },
    { data: briefings, error: briefingError },
    { data: briefingReads, error: briefingReadError },
  ] = await Promise.all([
    supabase
      .from("event_operations_departments")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("event_operations_zones")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("event_crew_shifts")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("shift_start"),
    supabase
      .from("event_operations_briefings")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("published_at", { ascending: false }),
    supabase
      .from("event_operations_briefing_reads")
      .select("briefing_id, assignment_id, acknowledged_at")
      .eq("wedding_id", weddingId),
  ]);
  if (departmentError) throw departmentError;
  if (zoneError) throw zoneError;
  if (shiftError) throw shiftError;
  if (briefingError) throw briefingError;
  if (briefingReadError) throw briefingReadError;

  const canViewFinancials = access.permissions.includes("VIEW_FINANCIALS");
  const vendorUserIds = [
    ...new Set(
      (functions ?? []).flatMap((event) =>
        relationList(event.bookings)
          .map((booking) => one(booking.vendor)?.user_id)
          .filter((value): value is string => Boolean(value))
      )
    ),
  ];
  const { data: vendorUsers } = vendorUserIds.length
    ? await supabase.from("users").select("id, phone").in("id", vendorUserIds)
    : { data: [] };
  const vendorPhoneMap = new Map(
    (vendorUsers ?? []).map((user) => [user.id, user.phone])
  );
  const eventFunctions = (functions ?? []).map((event) => ({
      ...event,
      readiness: evaluateEventReadiness(event as unknown as EventReadinessRow),
      bookings: relationList(event.bookings).map((booking) => {
        const received = canViewFinancials
          ? relationList(booking.payments).reduce(
              (sum, payment) =>
                payment.kind === "CLIENT_IN" && !payment.voided_at
                  ? sum + payment.amount
                  : sum,
              0
            )
          : undefined;
        return {
          id: booking.id,
          status: booking.status,
          vendor: one(booking.vendor)?.business_name ?? "Vendor",
          vendorPhone:
            vendorPhoneMap.get(one(booking.vendor)?.user_id ?? "") ?? null,
          service: one(booking.service)?.name ?? "Service",
          ...(canViewFinancials
            ? {
                clientTotal: booking.price_published
                  ? booking.final_price
                  : null,
                received,
                due:
                  booking.price_published && booking.final_price !== null
                    ? Math.max(0, booking.final_price - (received ?? 0))
                    : null,
              }
            : {}),
        };
      }),
    }));

  const destination = one(eventPlan.destination);
  const client = one(eventPlan.client);
  const clientUser = one(client?.user);
  const team = (assignments ?? []).map((assignment) => {
    const profile = one(assignment.profile);
    const user = one(profile?.user);
    return {
      id: assignment.id,
      userId: assignment.staff_user_id,
      name: user?.name ?? "Team member",
      email: user?.email ?? null,
      phone: profile?.phone ?? user?.phone ?? null,
      avatar: user?.avatar ?? null,
      roleTemplate: profile?.role_template ?? "VIEWER",
      jobTitle: profile?.job_title ?? null,
      eventRole: assignment.event_role ?? profile?.job_title ?? "Event team",
      shiftStart: assignment.shift_start,
      shiftEnd: assignment.shift_end,
      notes: assignment.notes,
    };
  });
  const teamByAssignmentId = new Map(team.map((member) => [member.id, member]));
  const departmentById = new Map(
    (departments ?? []).map((department) => [department.id, department])
  );
  const zoneById = new Map((zones ?? []).map((zone) => [zone.id, zone]));
  const functionById = new Map(
    eventFunctions.map((event) => [event.id, event])
  );
  const currentAssignment = team.find(
    (member) => member.userId === session.userId
  );
  const briefingReadMap = new Map<string, typeof briefingReads>();
  for (const read of briefingReads ?? []) {
    const existing = briefingReadMap.get(read.briefing_id) ?? [];
    existing.push(read);
    briefingReadMap.set(read.briefing_id, existing);
  }

  const authorIds = [
    ...new Set(
      (operationsItems ?? []).flatMap((item) => [
        item.reported_by,
        item.acknowledged_by,
        item.resolved_by,
      ]).filter((value): value is string => Boolean(value))
    ),
  ];
  const { data: authors } = authorIds.length
    ? await supabase.from("users").select("id, name").in("id", authorIds)
    : { data: [] };
  const authorMap = new Map((authors ?? []).map((author) => [author.id, author.name]));

  return {
    access,
    event: {
      id: eventPlan.id,
      name: eventPlan.name,
      date: eventPlan.date,
      status: eventPlan.status,
      eventType: eventPlan.custom_event_type || eventPlan.event_type || "Event",
      destination: destination?.name ?? null,
      country: destination?.country ?? null,
      heroImage: destination?.hero_image ?? null,
      clientName: clientUser?.name ?? client?.partner_name ?? "Client",
      clientEmail: clientUser?.email ?? null,
      clientPhone: clientUser?.phone ?? null,
    },
    days: (days ?? []).map((day) => ({
      id: day.id,
      name: day.name,
      date: day.date,
      functions: eventFunctions.filter(
        (event) => event.wedding_day_id === day.id
      ),
    })),
    team,
    departments: (departments ?? []).map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code,
      color: department.color,
      leadAssignmentId: department.lead_assignment_id,
      leadName: department.lead_assignment_id
        ? teamByAssignmentId.get(department.lead_assignment_id)?.name ?? null
        : null,
    })),
    zones: (zones ?? []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      code: zone.code,
      capacity: zone.capacity,
      meetingPoint: zone.meeting_point,
      emergencyNotes: zone.emergency_notes,
    })),
    shifts: (shifts ?? []).map((shift) => {
      const member = teamByAssignmentId.get(shift.assignment_id);
      const supervisor = shift.supervisor_assignment_id
        ? teamByAssignmentId.get(shift.supervisor_assignment_id)
        : null;
      return {
        id: shift.id,
        assignmentId: shift.assignment_id,
        staffUserId: member?.userId ?? null,
        staffName: member?.name ?? "Team member",
        staffPhone: member?.phone ?? null,
        eventId: shift.wedding_event_id,
        eventName: shift.wedding_event_id
          ? functionById.get(shift.wedding_event_id)?.name ?? null
          : null,
        departmentId: shift.department_id,
        departmentName: shift.department_id
          ? departmentById.get(shift.department_id)?.name ?? null
          : null,
        departmentColor: shift.department_id
          ? departmentById.get(shift.department_id)?.color ?? null
          : null,
        zoneId: shift.zone_id,
        zoneName: shift.zone_id
          ? zoneById.get(shift.zone_id)?.name ?? null
          : null,
        supervisorName: supervisor?.name ?? null,
        roleLabel: shift.role_label,
        shiftStart: shift.shift_start,
        shiftEnd: shift.shift_end,
        status: shift.status,
        checkedInAt: shift.checked_in_at,
        checkedOutAt: shift.checked_out_at,
        handoffNotes: shift.handoff_notes,
        isOwn: member?.userId === session.userId,
      };
    }),
    briefings: (briefings ?? []).map((briefing) => {
      const reads = briefingReadMap.get(briefing.id) ?? [];
      return {
        id: briefing.id,
        eventId: briefing.wedding_event_id,
        eventName: briefing.wedding_event_id
          ? functionById.get(briefing.wedding_event_id)?.name ?? null
          : null,
        departmentId: briefing.department_id,
        departmentName: briefing.department_id
          ? departmentById.get(briefing.department_id)?.name ?? null
          : null,
        zoneId: briefing.zone_id,
        zoneName: briefing.zone_id
          ? zoneById.get(briefing.zone_id)?.name ?? null
          : null,
        title: briefing.title,
        body: briefing.body,
        priority: briefing.priority,
        requiresAcknowledgement: briefing.requires_acknowledgement,
        publishedAt: briefing.published_at,
        expiresAt: briefing.expires_at,
        acknowledgementCount: reads.length,
        acknowledged: currentAssignment
          ? reads.some((read) => read.assignment_id === currentAssignment.id)
          : false,
      };
    }),
    feed: (operationsItems ?? []).map((item) => ({
      id: item.id,
      eventId: item.wedding_event_id,
      kind: item.kind,
      severity: item.severity,
      status: item.status,
      title: item.title,
      body: item.body,
      assigneeUserId: item.assignee_user_id,
      departmentId: item.department_id,
      departmentName: item.department_id
        ? departmentById.get(item.department_id)?.name ?? null
        : null,
      zoneId: item.zone_id,
      zoneName: item.zone_id ? zoneById.get(item.zone_id)?.name ?? null : null,
      reportedBy: item.reported_by,
      reportedByName: authorMap.get(item.reported_by) ?? "Team member",
      dueAt: item.due_at,
      acknowledgedAt: item.acknowledged_at,
      resolvedAt: item.resolved_at,
      resolvedByName: item.resolved_by
        ? authorMap.get(item.resolved_by) ?? "Team member"
        : null,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  };
}
