import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, requireRole, apiError, apiSuccess } from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  const { id } = await params;

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as { isActive?: boolean };

    const updates: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

    const { data, error } = await supabase
      .from("venues")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("venues update:", error);
      return apiError("Failed to update venue", 500);
    }

    return apiSuccess({ venue: data });
  } catch (e) {
    console.error("PATCH /api/admin/venues/[id]", e);
    return apiError("Internal server error", 500);
  }
}
