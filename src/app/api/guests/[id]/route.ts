import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { getClientProfileId } from "@/lib/guest-access";

const GUEST_SIDES = new Set<string>(["BRIDE", "GROOM", "COUPLE", "MUTUAL"]);
const RSVP_STATUSES = new Set<string>([
  "PENDING",
  "CONFIRMED",
  "DECLINED",
  "MAYBE",
]);

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
    const body = await request.json();

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

    const allowedFields = [
      "name",
      "email",
      "phone",
      "side",
      "rsvp_status",
      "meal_pref",
      "plus_one",
      "table_number",
      "notes",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] === undefined) continue;
      if (field === "side") {
        const v = body[field];
        if (typeof v !== "string" || !GUEST_SIDES.has(v)) {
          return apiError("Invalid guest side", 400);
        }
        data[field] = v;
        continue;
      }
      if (field === "rsvp_status") {
        const v = body[field];
        if (typeof v !== "string" || !RSVP_STATUSES.has(v)) {
          return apiError("Invalid RSVP status", 400);
        }
        data[field] = v;
        continue;
      }
      data[field] = body[field];
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
