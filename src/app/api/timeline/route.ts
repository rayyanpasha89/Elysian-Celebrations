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
    throw new Error("Failed to load wedding");
  }

  return wedding;
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

    const { data: items, error } = await supabase
      .from("timeline_items")
      .select("id, title, description, due_date, is_completed, sort_order")
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("timeline_items:", error);
      return apiError("Failed to load timeline", 500);
    }

    return apiSuccess({
      wedding: { id: wedding.id, name: wedding.name },
      items: items ?? [],
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
      return apiError("Create your wedding first", 409);
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
