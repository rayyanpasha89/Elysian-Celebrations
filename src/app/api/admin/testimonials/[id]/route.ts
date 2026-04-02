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
    if (typeof body.isPublished === "boolean") updates.is_published = body.isPublished;

    const { data, error } = await supabase
      .from("testimonials")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("testimonials update:", error);
      return apiError("Failed to update testimonial", 500);
    }

    return apiSuccess({ testimonial: data });
  } catch (e) {
    console.error("PATCH /api/admin/testimonials/[id]", e);
    return apiError("Internal server error", 500);
  }
}
