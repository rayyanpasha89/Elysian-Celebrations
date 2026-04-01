import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import {
  getClientProfileId,
  getGuestListIdsForClient,
  guestListBelongsToClient,
} from "@/lib/guest-access";

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

    if (session.role === "client") {
      const profileId = await getClientProfileId(supabase, session.userId);
      if (!profileId) {
        return apiError("Client profile not found", 404);
      }

      if (listId) {
        const allowed = await guestListBelongsToClient(
          supabase,
          listId,
          profileId
        );
        if (!allowed) {
          return apiError("Guest list not found", 404);
        }
      }

      const listIds = listId
        ? [listId]
        : await getGuestListIdsForClient(supabase, profileId);
      if (listIds.length === 0) {
        return apiSuccess({
          guests: [],
          counts: {
            total: 0,
            confirmed: 0,
            pending: 0,
            declined: 0,
          },
        });
      }

      let query = supabase
        .from("guests")
        .select("*")
        .in("guest_list_id", listIds)
        .order("name");
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
    }

    // admin
    let query = supabase.from("guests").select("*").order("name");
    if (listId) query = query.eq("guest_list_id", listId);
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
    const { guestListId, name, email, phone, side, mealPref, plusOne, notes } =
      body;

    if (!name) {
      return apiError("Guest name is required");
    }

    const profileId = await getClientProfileId(supabase, session.userId);
    if (!profileId) {
      return apiError("Client profile not found", 404);
    }

    let targetListId: string | undefined = guestListId;

    if (targetListId) {
      const allowed = await guestListBelongsToClient(
        supabase,
        targetListId,
        profileId
      );
      if (!allowed) {
        return apiError("Guest list not found", 404);
      }
    }

    if (!targetListId) {
      const { data: existingList, error: listErr } = await supabase
        .from("guest_lists")
        .select("id")
        .eq("client_profile_id", profileId)
        .limit(1)
        .maybeSingle();

      if (listErr) {
        console.error("Guest list lookup error:", listErr);
        return apiError("Failed to resolve guest list", 500);
      }

      if (existingList?.id) {
        targetListId = existingList.id;
      } else {
        const { data: newList, error: insertErr } = await supabase
          .from("guest_lists")
          .insert({ client_profile_id: profileId })
          .select("id")
          .single();
        if (insertErr || !newList?.id) {
          console.error("Guest list create error:", insertErr);
          return apiError("Failed to create guest list", 500);
        }
        targetListId = newList.id;
      }
    }

    if (!targetListId) {
      return apiError("Could not resolve guest list", 500);
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
