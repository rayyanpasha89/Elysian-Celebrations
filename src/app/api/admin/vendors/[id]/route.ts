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
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const { isVerified, isFeatured } = body as {
      isVerified?: boolean;
      isFeatured?: boolean;
    };

    const updates: Record<string, boolean> = {};
    if (typeof isVerified === "boolean") {
      updates.is_verified = isVerified;
    }
    if (typeof isFeatured === "boolean") {
      updates.is_featured = isFeatured;
    }
    if (Object.keys(updates).length === 0) {
      return apiError("At least one boolean update is required");
    }

    const { data: row, error } = await supabase
      .from("vendor_profiles")
      .update(updates)
      .eq("id", id)
      .select("id, is_verified, is_featured")
      .single();

    if (error) {
      console.error("vendor_profiles update:", error);
      return apiError("Failed to update vendor", 500);
    }

    return apiSuccess(row);
  } catch (e) {
    console.error("PATCH /api/admin/vendors/[id]", e);
    return apiError("Internal server error", 500);
  }
}
