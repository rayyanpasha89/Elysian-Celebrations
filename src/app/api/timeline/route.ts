import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

async function getClientWedding(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string
) {
  const { data: profile, error: pErr } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (pErr) {
    console.error("client_profiles:", pErr);
    throw new Error("Failed to load profile");
  }
  if (!profile) return null;

  const { data: wedding, error: wErr } = await supabase
    .from("weddings")
    .select("id, name")
    .eq("client_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (wErr) {
    console.error("weddings:", wErr);
    throw new Error("Failed to load event plan");
  }

  return wedding;
}

function eventTaskId(id: string) {
  return `event-task:${id}`;
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const wedding = await getClientWedding(supabase, session.userId);

    if (!wedding) {
      return apiSuccess({ wedding: null, items: [] });
    }

    const [
      { data: items, error },
      { data: events, error: eventsError },
    ] = await Promise.all([
      supabase
        .from("timeline_items")
        .select("id, title, description, due_date, is_completed, sort_order")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("wedding_events")
        .select(
          "id, name, date, start_time, end_time, venue, time_block, sort_order, wedding_day_id, wedding_day:wedding_days(id, name, date, sort_order)"
        )
        .eq("wedding_id", wedding.id),
    ]);

    if (error) {
      console.error("timeline_items:", error);
      return apiError("Failed to load timeline", 500);
    }

    if (eventsError) {
      console.error("wedding_events timeline:", eventsError);
      return apiError("Failed to load event tasks", 500);
    }

    const eventRows = events ?? [];
    const eventIds = eventRows.map((event) => event.id);
    const eventById = new Map(
      eventRows.map((event) => {
        const day = Array.isArray(event.wedding_day)
          ? event.wedding_day[0]
          : event.wedding_day;
        return [
          event.id,
          {
            name: event.name,
            date: event.date,
            dayName: day?.name ?? null,
          },
        ];
      })
    );

    let eventTasks:
      | {
          id: string;
          wedding_event_id: string;
          title: string;
          owner: string | null;
          status: string;
          due_date: string | null;
          sort_order: number | null;
        }[]
      | null = null;

    if (eventIds.length > 0) {
      const { data: taskRows, error: taskError } = await supabase
        .from("wedding_event_tasks")
        .select("id, wedding_event_id, title, owner, status, due_date, sort_order")
        .in("wedding_event_id", eventIds)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (taskError) {
        console.error("wedding_event_tasks timeline:", taskError);
        return apiError("Failed to load event tasks", 500);
      }

      eventTasks = taskRows ?? [];
    }

    const timelineItems = (items ?? []).map((item) => ({
      ...item,
      source: "timeline" as const,
      event_name: null,
      event_day_name: null,
      owner: null,
    }));

    const eventTaskItems = (eventTasks ?? []).map((task) => {
      const event = eventById.get(task.wedding_event_id);
      return {
        id: eventTaskId(task.id),
        title: task.title,
        description: task.owner ? `Owner: ${task.owner}` : null,
        due_date: task.due_date ?? event?.date ?? null,
        is_completed: task.status === "DONE",
        sort_order: task.sort_order ?? 0,
        source: "event" as const,
        event_name: event?.name ?? "Event block",
        event_day_name: event?.dayName ?? null,
        owner: task.owner,
      };
    });

    const combinedItems = [...timelineItems, ...eventTaskItems].sort((left, right) => {
      if (left.is_completed !== right.is_completed) {
        return left.is_completed ? 1 : -1;
      }

      const leftTime = left.due_date ? new Date(left.due_date).getTime() : Infinity;
      const rightTime = right.due_date ? new Date(right.due_date).getTime() : Infinity;
      if (leftTime !== rightTime) return leftTime - rightTime;

      return (left.sort_order ?? 0) - (right.sort_order ?? 0);
    });

    // ── Run-of-show schedule backbone: days → events (+ logistics call-times)
    const firstRel = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;

    let logisticsByEvent = new Map<
      string,
      {
        guest_arrival_time: string | null;
        vendor_load_in_time: string | null;
        family_call_time: string | null;
      }
    >();
    if (eventIds.length > 0) {
      const { data: logisticsRows } = await supabase
        .from("wedding_event_logistics")
        .select(
          "wedding_event_id, guest_arrival_time, vendor_load_in_time, family_call_time"
        )
        .in("wedding_event_id", eventIds);
      logisticsByEvent = new Map(
        (logisticsRows ?? []).map((row) => [
          row.wedding_event_id as string,
          {
            guest_arrival_time: row.guest_arrival_time ?? null,
            vendor_load_in_time: row.vendor_load_in_time ?? null,
            family_call_time: row.family_call_time ?? null,
          },
        ])
      );
    }

    const dayMap = new Map<
      string,
      {
        id: string;
        name: string;
        date: string | null;
        sortOrder: number;
        events: {
          id: string;
          name: string;
          startTime: string | null;
          endTime: string | null;
          venue: string | null;
          timeBlock: string | null;
          sortOrder: number;
          logistics: {
            guest_arrival_time: string | null;
            vendor_load_in_time: string | null;
            family_call_time: string | null;
          } | null;
        }[];
      }
    >();

    for (const event of eventRows) {
      const day = firstRel(event.wedding_day) as
        | { id: string; name: string; date: string | null; sort_order: number | null }
        | null;
      const dayId = day?.id ?? event.wedding_day_id ?? "__unscheduled__";
      if (!dayMap.has(dayId)) {
        dayMap.set(dayId, {
          id: dayId,
          name: day?.name ?? "Unscheduled",
          date: day?.date ?? null,
          sortOrder: day?.sort_order ?? 9999,
          events: [],
        });
      }
      dayMap.get(dayId)!.events.push({
        id: event.id,
        name: event.name,
        startTime: event.start_time ?? null,
        endTime: event.end_time ?? null,
        venue: event.venue ?? null,
        timeBlock: event.time_block ?? null,
        sortOrder: event.sort_order ?? 0,
        logistics: logisticsByEvent.get(event.id) ?? null,
      });
    }

    const schedule = [...dayMap.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((day) => ({
        ...day,
        events: day.events.sort((a, b) => {
          const at = a.startTime ?? "99:99";
          const bt = b.startTime ?? "99:99";
          if (at !== bt) return at < bt ? -1 : 1;
          return a.sortOrder - b.sortOrder;
        }),
      }));

    return apiSuccess({
      wedding: { id: wedding.id, name: wedding.name },
      items: combinedItems,
      schedule,
    });
  } catch (e) {
    console.error("GET /api/timeline", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const wedding = await getClientWedding(supabase, session.userId);
    if (!wedding) {
      return apiError("Create your event plan first", 409);
    }

    const body = await request.json();
    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 500) : null;
    const dueDate =
      typeof body.dueDate === "string" && body.dueDate
        ? new Date(body.dueDate)
        : null;

    if (!title) {
      return apiError("Task title is required");
    }

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return apiError("Due date is invalid");
    }

    const { data: lastItem, error: lastErr } = await supabase
      .from("timeline_items")
      .select("sort_order")
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastErr) {
      console.error("timeline_items sort lookup:", lastErr);
      return apiError("Failed to create task", 500);
    }

    const { data: item, error } = await supabase
      .from("timeline_items")
      .insert({
        wedding_id: wedding.id,
        title,
        description,
        due_date: dueDate ? dueDate.toISOString() : null,
        sort_order: (lastItem?.sort_order ?? -1) + 1,
      })
      .select("id, title, description, due_date, is_completed, sort_order")
      .single();

    if (error) {
      console.error("timeline_items create:", error);
      return apiError("Failed to create task", 500);
    }

    return apiSuccess(item, 201);
  } catch (e) {
    console.error("POST /api/timeline", e);
    return apiError("Internal server error", 500);
  }
}
