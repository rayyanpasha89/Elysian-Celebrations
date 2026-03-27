import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, requireRole, apiError, apiSuccess } from "@/lib/api-utils";

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

    const allowedFields = [
      "name", "email", "phone", "side",
      "rsvp_status", "meal_pref", "plus_one",
      "table_number", "notes",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
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

    const { error } = await supabase
      .from("guests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Guest delete error:", error);
      return apiError("Failed to remove guest", 500);
    }

    return apiSuccess({ message: "Guest removed" });
  } catch (error) {
    console.error("Guest delete error:", error);
    return apiError("Internal server error", 500);
  }
}
