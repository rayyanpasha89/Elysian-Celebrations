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
      .from("testimonials")
      .select("id, couple_name, destination, quote, image, is_published, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("testimonials:", error);
      return apiError("Failed to load testimonials", 500);
    }

    return apiSuccess({ testimonials: rows ?? [] });
  } catch (e) {
    console.error("GET /api/admin/testimonials", e);
    return apiError("Internal server error", 500);
  }
}
