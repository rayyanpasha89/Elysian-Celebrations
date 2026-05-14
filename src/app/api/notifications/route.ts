import { NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
} from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function relTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: row.is_read,
    createdAt: row.created_at,
    time: relTime(row.created_at),
  };
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createAdminSupabaseClient();
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, message, link, is_read, created_at")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.userId)
        .eq("is_read", false),
    ]);

    if (error || countError) {
      console.error("notifications:", error ?? countError);
      return apiError("Failed to load notifications", 500);
    }

    return apiSuccess({
      notifications: ((data ?? []) as NotificationRow[]).map(mapNotification),
      unreadCount: count ?? 0,
    });
  } catch (error) {
    console.error("GET /api/notifications", error);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await request.json()) as {
      id?: unknown;
      all?: unknown;
    };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const markAll = body.all === true;

    if (!id && !markAll) {
      return apiError("Notification id or all=true is required");
    }

    const supabase = createAdminSupabaseClient();
    const query = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.userId)
      .eq("is_read", false);

    const { error } = markAll ? await query : await query.eq("id", id);

    if (error) {
      console.error("notifications mark read:", error);
      return apiError("Failed to mark notification read", 500);
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("PATCH /api/notifications", error);
    return apiError("Internal server error", 500);
  }
}
