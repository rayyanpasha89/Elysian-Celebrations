import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as { isActive?: unknown };

    if (typeof body.isActive !== "boolean") {
      return apiError("isActive must be a boolean", 400);
    }

    const { data: row, error } = await supabase
      .from("destinations")
      .update({ is_active: body.isActive })
      .eq("id", id)
      .select(
        "id, name, slug, country, starting_price, venue_count, is_active, sort_order"
      )
      .single();

    if (error) {
      console.error("destinations update:", error);
      return apiError("Failed to update destination", 500);
    }

    return apiSuccess({ destination: row });
  } catch (e) {
    console.error("PATCH /api/admin/destinations/[id]", e);
    return apiError("Internal server error", 500);
  }
}
