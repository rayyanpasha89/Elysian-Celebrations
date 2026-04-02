import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, requireRole, apiError, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("package_tiers")
      .select("id, name, slug, tagline, description, starting_price, inclusions, sort_order, is_active")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("package_tiers:", error);
      return apiError("Failed to load packages", 500);
    }

    return apiSuccess({ packages: rows ?? [] });
  } catch (e) {
    console.error("GET /api/admin/packages", e);
    return apiError("Internal server error", 500);
  }
}
