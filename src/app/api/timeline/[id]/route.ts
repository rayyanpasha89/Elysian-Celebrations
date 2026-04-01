import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

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
    const item = await loadTimelineItem(supabase, id);

    if (!item) {
      return apiError("Task not found", 404);
    }

    if (!ownsTimelineItem(item, session.userId, session.role)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

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
