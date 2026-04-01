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
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("users:", error);
      return apiError("Failed to load users", 500);
    }

    return apiSuccess({ users: users ?? [] });
  } catch (e) {
    console.error("GET /api/admin/users", e);
    return apiError("Internal server error", 500);
  }
}
