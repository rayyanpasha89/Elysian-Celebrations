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
      .from("blog_posts")
      .select("id, title, slug, excerpt, author, tags, is_published, published_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("blog_posts:", error);
      return apiError("Failed to load blog posts", 500);
    }

    return apiSuccess({ posts: rows ?? [] });
  } catch (e) {
    console.error("GET /api/admin/blog", e);
    return apiError("Internal server error", 500);
  }
}
