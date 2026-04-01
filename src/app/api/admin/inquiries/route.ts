import { NextRequest, NextResponse } from "next/server";
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
    const { data: rows, error } = await supabase
      .from("contact_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("contact_inquiries:", error);
      return apiError("Failed to load inquiries", 500);
    }

    return apiSuccess({ inquiries: rows ?? [] });
  } catch (e) {
    console.error("GET /api/admin/inquiries", e);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const { id, status } = body as Record<string, unknown>;
    if (!id || typeof id !== "string") {
      return apiError("id is required");
    }

    const updates: Record<string, unknown> = {};
    if (typeof status === "string") updates.status = status;

    const { data: row, error } = await supabase
      .from("contact_inquiries")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("contact_inquiries update:", error);
      return apiError("Failed to update inquiry", 500);
    }

    return apiSuccess(row);
  } catch (e) {
    console.error("PATCH /api/admin/inquiries", e);
    return apiError("Internal server error", 500);
  }
}
