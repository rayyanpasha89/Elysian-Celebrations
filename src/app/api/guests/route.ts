import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import {
  GUEST_FIELD_LIMITS,
  getClientProfileId,
  getGuestListIdsForClient,
  guestListBelongsToClient,
} from "@/lib/guest-access";
import type { Database } from "@/types/database.types";

type GuestSide = Database["public"]["Enums"]["guest_side"];
type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];
type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];
type GuestListInsert = Database["public"]["Tables"]["guest_lists"]["Insert"];

function parseGuestSide(value: unknown): GuestSide | null {
  if (value === "BRIDE" || value === "GROOM" || value === "COUPLE" || value === "MUTUAL") {
    return value;
  }
  return null;
}

function parseRsvpStatus(value: unknown): RsvpStatus | null {
  if (
    value === "PENDING" ||
    value === "CONFIRMED" ||
    value === "DECLINED" ||
    value === "MAYBE"
  ) {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const listId = searchParams.get("listId");
    const sideParam = searchParams.get("side");
    const rsvpParam = searchParams.get("rsvp");
    const pageParam = Number(searchParams.get("page") ?? "1");
    const limitParam = Number(searchParams.get("limit") ?? "100");
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 100;
    const side = sideParam ? parseGuestSide(sideParam) : null;
    const rsvp = rsvpParam ? parseRsvpStatus(rsvpParam) : null;

    if (sideParam && !side) return apiError("Invalid guest side", 400);
    if (rsvpParam && !rsvp) return apiError("Invalid RSVP status", 400);

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
    let query = supabase
      .from("guests")
      .select("*", { count: "exact" })
      .order("name")
      .range((page - 1) * limit, page * limit - 1);
    if (listId) query = query.eq("guest_list_id", listId);
    if (side) query = query.eq("side", side);
    if (rsvp) query = query.eq("rsvp_status", rsvp);

    const { data: guests, error, count } = await query;
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
    return apiSuccess({
      guests: list,
      counts,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    });
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
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const mealPref =
      typeof body.mealPref === "string" ? body.mealPref.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const side = body.side === undefined ? "COUPLE" : parseGuestSide(body.side);

    if (!side) return apiError("Invalid guest side", 400);
    if (body.plusOne !== undefined && typeof body.plusOne !== "boolean") {
      return apiError("Invalid plus-one value", 400);
    }

    let guestListId: string | undefined;
    if (body.guestListId !== undefined && body.guestListId !== null && body.guestListId !== "") {
      if (typeof body.guestListId !== "string") {
        return apiError("Invalid guest list", 400);
      }
      guestListId = body.guestListId;
    }

    if (!name) {
      return apiError("Guest name is required");
    }

    // The underlying columns are unbounded `text`; reject oversized input here
    // so one client cannot write arbitrarily large rows. Mirrors the ceilings
    // enforced by PATCH /api/guests/[id].
    const lengthChecks: [string, string, number][] = [
      ["name", name, GUEST_FIELD_LIMITS.name],
      ["email", email, GUEST_FIELD_LIMITS.email],
      ["phone", phone, GUEST_FIELD_LIMITS.phone],
      ["meal preference", mealPref, GUEST_FIELD_LIMITS.meal_pref],
      ["notes", notes, GUEST_FIELD_LIMITS.notes],
    ];
    for (const [label, value, limit] of lengthChecks) {
      if (value.length > limit) {
        return apiError(`${label} is too long (max ${limit} characters)`, 400);
      }
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
        const guestListInsert: GuestListInsert = { client_profile_id: profileId };
        const { data: newList, error: insertErr } = await supabase
          .from("guest_lists")
          .insert(guestListInsert)
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

    const guestInsert: GuestInsert = {
      guest_list_id: targetListId,
      name,
      email: email || null,
      phone: phone || null,
      side,
      meal_pref: mealPref || null,
      plus_one: body.plusOne === true,
      notes: notes || null,
    };

    const { data: guest, error } = await supabase
      .from("guests")
      .insert(guestInsert)
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
