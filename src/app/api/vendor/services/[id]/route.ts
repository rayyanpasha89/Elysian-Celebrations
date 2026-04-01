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
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vp } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!vp) return apiError("Vendor profile not found", 404);

    const { data: existing } = await supabase
      .from("vendor_services")
      .select("id")
      .eq("id", id)
      .eq("vendor_profile_id", vp.id)
      .maybeSingle();
    if (!existing) return apiError("Service not found", 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description;
    if (typeof body.basePrice === "number") updates.base_price = Math.floor(body.basePrice);
    if (typeof body.maxPrice === "number") updates.max_price = Math.floor(body.maxPrice);
    if (typeof body.unit === "string") updates.unit = body.unit;
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

    const { data: row, error } = await supabase
      .from("vendor_services")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("vendor_services update:", error);
      return apiError("Failed to update service", 500);
    }

    return apiSuccess(row);
  } catch (e) {
    console.error("PATCH /api/vendor/services/[id]", e);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vp } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!vp) return apiError("Vendor profile not found", 404);

    const { error } = await supabase
      .from("vendor_services")
      .delete()
      .eq("id", id)
      .eq("vendor_profile_id", vp.id);

    if (error) {
      console.error("vendor_services delete:", error);
      return apiError("Failed to delete service", 500);
    }

    return apiSuccess({ ok: true });
  } catch (e) {
    console.error("DELETE /api/vendor/services/[id]", e);
    return apiError("Internal server error", 500);
  }
}
