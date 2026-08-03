import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { GUEST_FIELD_LIMITS, getClientProfileId } from "@/lib/guest-access";
import type { Database } from "@/types/database.types";

type GuestSide = Database["public"]["Enums"]["guest_side"];
type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];
type GuestUpdate = Database["public"]["Tables"]["guests"]["Update"];

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
    const body = (await request.json()) as Record<string, unknown>;

    const { data: guestRow, error: loadErr } = await supabase
      .from("guests")
      .select("id, guest_list_id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      console.error("Guest load error:", loadErr);
      return apiError("Failed to load guest", 500);
    }
    if (!guestRow) {
      return apiError("Guest not found", 404);
    }

    const { data: listRow } = await supabase
      .from("guest_lists")
      .select("client_profile_id")
      .eq("id", guestRow.guest_list_id)
      .maybeSingle();

    if (session.role === "client") {
      const profileId = await getClientProfileId(supabase, session.userId);
      if (!profileId || listRow?.client_profile_id !== profileId) {
        return apiError("Guest not found", 404);
      }
    }

    const data: GuestUpdate = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string") return apiError("Invalid guest name", 400);
      const name = body.name.trim();
      if (!name) return apiError("Guest name cannot be empty", 400);
      if (name.length > GUEST_FIELD_LIMITS.name) {
        return apiError("Guest name is too long", 400);
      }
      data.name = name;
    }

    const nullableStringFields = ["email", "phone", "meal_pref", "notes"] as const;
    for (const field of nullableStringFields) {
      const value = body[field];
      if (value === undefined) continue;
      if (value !== null && typeof value !== "string") {
        return apiError(`Invalid ${field.replace("_", " ")}`, 400);
      }
      if (value !== null && value.length > GUEST_FIELD_LIMITS[field]) {
        return apiError(`${field.replace("_", " ")} is too long`, 400);
      }
      data[field] = value;
    }

    if (body.side !== undefined) {
      const side = parseGuestSide(body.side);
      if (!side) return apiError("Invalid guest side", 400);
      data.side = side;
    }

    if (body.rsvp_status !== undefined) {
      const rsvpStatus = parseRsvpStatus(body.rsvp_status);
      if (!rsvpStatus) return apiError("Invalid RSVP status", 400);
      data.rsvp_status = rsvpStatus;
    }

    if (body.plus_one !== undefined) {
      if (typeof body.plus_one !== "boolean") {
        return apiError("Invalid plus-one value", 400);
      }
      data.plus_one = body.plus_one;
    }

    if (body.table_number !== undefined) {
      if (
        body.table_number !== null &&
        (typeof body.table_number !== "number" || !Number.isFinite(body.table_number))
      ) {
        return apiError("Invalid table number", 400);
      }
      data.table_number = body.table_number;
    }

    const { data: updated, error } = await supabase
      .from("guests")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Guest update error:", error);
      return apiError("Failed to update guest", 500);
    }
    if (!updated) {
      return apiError("Guest not found", 404);
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("Guest update error:", error);
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

    const { data: guestRow, error: loadErr } = await supabase
      .from("guests")
      .select("id, guest_list_id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      console.error("Guest load error:", loadErr);
      return apiError("Failed to load guest", 500);
    }
    if (!guestRow) {
      return apiError("Guest not found", 404);
    }

    const { data: listRow } = await supabase
      .from("guest_lists")
      .select("client_profile_id")
      .eq("id", guestRow.guest_list_id)
      .maybeSingle();

    if (session.role === "client") {
      const profileId = await getClientProfileId(supabase, session.userId);
      if (!profileId || listRow?.client_profile_id !== profileId) {
        return apiError("Guest not found", 404);
      }
    }

    const { data: deleted, error } = await supabase
      .from("guests")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Guest delete error:", error);
      return apiError("Failed to remove guest", 500);
    }
    if (!deleted?.length) {
      return apiError("Guest not found", 404);
    }

    return apiSuccess({ message: "Guest removed" });
  } catch (error) {
    console.error("Guest delete error:", error);
    return apiError("Internal server error", 500);
  }
}
