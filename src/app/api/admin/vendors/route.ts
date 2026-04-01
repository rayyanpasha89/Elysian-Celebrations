import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vendors, error } = await supabase
      .from("vendor_profiles")
      .select(
        "id, business_name, city, rating, is_verified, is_featured, user:users(is_active), category:vendor_categories(name)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("vendor_profiles:", error);
      return apiError("Failed to load vendors", 500);
    }

    return apiSuccess({ vendors: vendors ?? [] });
  } catch (e) {
    console.error("GET /api/admin/vendors", e);
    return apiError("Internal server error", 500);
  }
}
