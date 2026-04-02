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
    const body = (await request.json()) as { isPublished?: boolean };

    const updates: Record<string, unknown> = {};
    if (typeof body.isPublished === "boolean") {
      updates.is_published = body.isPublished;
      updates.published_at = body.isPublished ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("blog_posts update:", error);
      return apiError("Failed to update blog post", 500);
    }

    return apiSuccess({ post: data });
  } catch (e) {
    console.error("PATCH /api/admin/blog/[id]", e);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  const { id } = await params;

  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);

    if (error) {
      console.error("blog_posts delete:", error);
      return apiError("Failed to delete blog post", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/admin/blog/[id]", e);
    return apiError("Internal server error", 500);
  }
}
