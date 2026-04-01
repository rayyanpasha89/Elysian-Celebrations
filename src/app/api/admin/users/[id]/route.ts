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
  if (id === session.userId) {
    return apiError("You cannot suspend your own account", 400);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as { isActive?: unknown };
    if (typeof body.isActive !== "boolean") {
      return apiError("isActive must be a boolean", 400);
    }

    const { data: user, error } = await supabase
      .from("users")
      .update({ is_active: body.isActive })
      .eq("id", id)
      .select("id, name, email, role, is_active, created_at")
      .maybeSingle();

    if (error) {
      console.error("users update:", error);
      return apiError("Failed to update user", 500);
    }
    if (!user) {
      return apiError("User not found", 404);
    }

    return apiSuccess({ user });
  } catch (e) {
    console.error("PATCH /api/admin/users/[id]", e);
    return apiError("Internal server error", 500);
  }
}
