import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, requireRole, apiError, apiSuccess } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const listId = searchParams.get("listId");
    const side = searchParams.get("side");
    const rsvp = searchParams.get("rsvp");

    let query = supabase.from("guests").select("*").order("name");

    if (listId) {
      query = query.eq("guest_list_id", listId);
    }
    if (side) query = query.eq("side", side);
    if (rsvp) query = query.eq("rsvp_status", rsvp);

    const { data: guests, error } = await query;

    if (error) {
      console.error("Guests list error:", error);
      return apiError("Failed to fetch guests", 500);
    }

    const list = guests ?? [];
    const counts = {
      total: list.length,
      confirmed: list.filter((g) => g.rsvp_status === "CONFIRMED").length,
      pending: list.filter((g) => g.rsvp_status === "PENDING").length,
      declined: list.filter((g) => g.rsvp_status === "DECLINED").length,
    };

    return apiSuccess({ guests: list, counts });
  } catch (error) {
    console.error("Guests list error:", error);
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
    const body = await request.json();
    const { guestListId, name, email, phone, side, mealPref, plusOne, notes } = body;

    if (!name) {
      return apiError("Guest name is required");
    }

    let targetListId = guestListId;

    if (!targetListId) {
      // Get or create default guest list
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .single();

      if (!profile) return apiError("Client profile not found", 404);

      const { data: existingList } = await supabase
        .from("guest_lists")
        .select("id")
        .eq("client_profile_id", profile.id)
        .limit(1)
        .single();

      if (existingList) {
        targetListId = existingList.id;
      } else {
        const { data: newList } = await supabase
          .from("guest_lists")
          .insert({ client_profile_id: profile.id })
          .select("id")
          .single();
        targetListId = newList?.id;
      }
    }

    const { data: guest, error } = await supabase
      .from("guests")
      .insert({
        guest_list_id: targetListId,
        name,
        email: email || null,
        phone: phone || null,
        side: side || "COUPLE",
        meal_pref: mealPref || null,
        plus_one: plusOne || false,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Guest create error:", error);
      return apiError("Failed to add guest", 500);
    }

    return apiSuccess(guest, 201);
  } catch (error) {
    console.error("Guest create error:", error);
    return apiError("Internal server error", 500);
  }
}
