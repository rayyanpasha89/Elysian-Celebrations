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
      .from("package_tiers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("package_tiers update:", error);
      return apiError("Failed to update package", 500);
    }

    return apiSuccess({ package: data });
  } catch (e) {
    console.error("PATCH /api/admin/packages/[id]", e);
    return apiError("Internal server error", 500);
  }
}
