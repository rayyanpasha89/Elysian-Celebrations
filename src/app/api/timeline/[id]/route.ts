import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import type { Database } from "@/types/database.types";

type TimelineItemUpdate =
  Database["public"]["Tables"]["timeline_items"]["Update"];
type WeddingEventTaskUpdate =
  Database["public"]["Tables"]["wedding_event_tasks"]["Update"];

async function loadTimelineItem(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  id: string
) {
  const { data, error } = await supabase
    .from("timeline_items")
    .select("id, wedding:weddings(client_profile:client_profiles(user_id))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function ownsTimelineItem(
  item: {
    wedding?:
      | {
          client_profile?:
            | { user_id?: string }
            | { user_id?: string }[]
            | null;
        }
      | {
          client_profile?:
            | { user_id?: string }
            | { user_id?: string }[]
            | null;
        }[]
      | null;
  } | null,
  userId: string,
  role: string
) {
  const wedding = Array.isArray(item?.wedding) ? item.wedding[0] : item?.wedding;
  const clientProfile = Array.isArray(wedding?.client_profile)
    ? wedding.client_profile[0]
    : wedding?.client_profile;

  return role === "admin" || clientProfile?.user_id === userId;
}

function parseEventTaskId(id: string) {
  return id.startsWith("event-task:") ? id.slice("event-task:".length) : null;
}

async function loadEventTask(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  id: string
) {
  const { data, error } = await supabase
    .from("wedding_event_tasks")
    .select(
      "id, wedding_event:wedding_events(wedding:weddings(client_profile:client_profiles(user_id)))"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function ownsEventTask(
  item: {
    wedding_event?:
      | {
          wedding?:
            | {
                client_profile?:
                  | { user_id?: string }
                  | { user_id?: string }[]
                  | null;
              }
            | {
                client_profile?:
                  | { user_id?: string }
                  | { user_id?: string }[]
                  | null;
              }[]
            | null;
        }
      | {
          wedding?:
            | {
                client_profile?:
                  | { user_id?: string }
                  | { user_id?: string }[]
                  | null;
              }
            | {
                client_profile?:
                  | { user_id?: string }
                  | { user_id?: string }[]
                  | null;
              }[]
            | null;
        }[]
      | null;
  } | null,
  userId: string,
  role: string
) {
  const event = Array.isArray(item?.wedding_event)
    ? item.wedding_event[0]
    : item?.wedding_event;
  const wedding = Array.isArray(event?.wedding)
    ? event.wedding[0]
    : event?.wedding;
  const clientProfile = Array.isArray(wedding?.client_profile)
    ? wedding.client_profile[0]
    : wedding?.client_profile;

  return role === "admin" || clientProfile?.user_id === userId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "admin");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const eventTaskId = parseEventTaskId(id);

    if (eventTaskId) {
      const item = await loadEventTask(supabase, eventTaskId);

      if (!item) {
        return apiError("Task not found", 404);
      }

      if (!ownsEventTask(item, session.userId, session.role)) {
        return apiError("Forbidden", 403);
      }

      const body = (await request.json()) as Record<string, unknown>;
      const updates: WeddingEventTaskUpdate = {};

      if (typeof body.title === "string") {
        const title = body.title.trim().slice(0, 120);
        if (!title) return apiError("Task title cannot be empty");
        updates.title = title;
      }

      if (typeof body.description === "string") {
        updates.owner = body.description.replace(/^Owner:\s*/i, "").trim() || null;
      }

      if (body.dueDate !== undefined) {
        if (body.dueDate === null || body.dueDate === "") {
          updates.due_date = null;
        } else if (typeof body.dueDate === "string") {
          const dueDate = new Date(body.dueDate);
          if (Number.isNaN(dueDate.getTime())) {
            return apiError("Due date is invalid");
          }
          updates.due_date = dueDate.toISOString();
        }
      }

      if (typeof body.isCompleted === "boolean") {
        updates.status = body.isCompleted ? "DONE" : "OPEN";
      }

      const { data: updated, error } = await supabase
        .from("wedding_event_tasks")
        .update(updates)
        .eq("id", eventTaskId)
        .select("id, title, owner, status, due_date, sort_order")
        .single();

      if (error) {
        console.error("wedding_event_tasks update:", error);
        return apiError("Failed to update task", 500);
      }

      return apiSuccess({
        id: `event-task:${updated.id}`,
        title: updated.title,
        description: updated.owner ? `Owner: ${updated.owner}` : null,
        due_date: updated.due_date,
        is_completed: updated.status === "DONE",
        sort_order: updated.sort_order,
        source: "event",
        owner: updated.owner,
      });
    }

    const item = await loadTimelineItem(supabase, id);

    if (!item) {
      return apiError("Task not found", 404);
    }

    if (!ownsTimelineItem(item, session.userId, session.role)) {
      return apiError("Forbidden", 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updates: TimelineItemUpdate = {};

    if (typeof body.title === "string") {
      const title = body.title.trim().slice(0, 120);
      if (!title) return apiError("Task title cannot be empty");
      updates.title = title;
    }

    if (typeof body.description === "string") {
      updates.description = body.description.trim().slice(0, 500) || null;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === "") {
        updates.due_date = null;
      } else if (typeof body.dueDate === "string") {
        const dueDate = new Date(body.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
          return apiError("Due date is invalid");
        }
        updates.due_date = dueDate.toISOString();
      }
    }

    if (typeof body.isCompleted === "boolean") {
      updates.is_completed = body.isCompleted;
    }

    const { data: updated, error } = await supabase
      .from("timeline_items")
      .update(updates)
      .eq("id", id)
      .select("id, title, description, due_date, is_completed, sort_order")
      .single();

    if (error) {
      console.error("timeline_items update:", error);
      return apiError("Failed to update task", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("PATCH /api/timeline/[id]", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "admin");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const eventTaskId = parseEventTaskId(id);

    if (eventTaskId) {
      const item = await loadEventTask(supabase, eventTaskId);

      if (!item) {
        return apiError("Task not found", 404);
      }

      if (!ownsEventTask(item, session.userId, session.role)) {
        return apiError("Forbidden", 403);
      }

      const { error } = await supabase
        .from("wedding_event_tasks")
        .delete()
        .eq("id", eventTaskId);

      if (error) {
        console.error("wedding_event_tasks delete:", error);
        return apiError("Failed to delete task", 500);
      }

      return apiSuccess({ deleted: true, id });
    }

    const item = await loadTimelineItem(supabase, id);

    if (!item) {
      return apiError("Task not found", 404);
    }

    if (!ownsTimelineItem(item, session.userId, session.role)) {
      return apiError("Forbidden", 403);
    }

    const { error } = await supabase.from("timeline_items").delete().eq("id", id);
    if (error) {
      console.error("timeline_items delete:", error);
      return apiError("Failed to delete task", 500);
    }

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    console.error("DELETE /api/timeline/[id]", error);
    return apiError("Internal server error", 500);
  }
}
