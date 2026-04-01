import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

async function getClientProfileId(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: profile, error } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.id ?? null;
}

async function getLatestWeddingId(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: wedding, error } = await supabase
    .from("weddings")
    .select("id")
    .eq("client_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return wedding?.id ?? null;
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const parsedDate =
      typeof body.date === "string" && body.date ? new Date(body.date) : null;
    const date =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : null;
    const venue =
      typeof body.venue === "string" && body.venue.trim()
        ? body.venue.trim()
        : null;
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    if (!name) {
      return apiError("Event name is required", 400);
    }

    const supabase = createAdminSupabaseClient();
    const profileId = await getClientProfileId(session.userId);
    if (!profileId) {
      return apiError("Client profile not found", 404);
    }

    const weddingId = await getLatestWeddingId(profileId);
    if (!weddingId) {
      return apiError("Wedding not found", 404);
    }

    const { data: lastEvent, error: lastErr } = await supabase
      .from("wedding_events")
      .select("sort_order")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) {
      console.error("wedding_events lookup:", lastErr);
      return apiError("Failed to load events", 500);
    }

    const nextSortOrder = (lastEvent?.sort_order ?? -1) + 1;

    const { data: event, error } = await supabase
      .from("wedding_events")
      .insert({
        wedding_id: weddingId,
        name,
        date,
        venue,
        notes,
        sort_order: nextSortOrder,
      })
      .select("id, name, date, venue, notes, sort_order")
      .single();

    if (error) {
      console.error("wedding_events insert:", error);
      return apiError("Failed to create event", 500);
    }

    return apiSuccess({ event }, 201);
  } catch (error) {
    console.error("POST /api/wedding/events", error);
    return apiError("Internal server error", 500);
  }
}
