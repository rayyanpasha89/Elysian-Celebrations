import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import type { Database } from "@/types/database.types";

type ContactInquiryUpdate =
  Database["public"]["Tables"]["contact_inquiries"]["Update"];
type InquiryStatus = NonNullable<ContactInquiryUpdate["status"]>;

const INQUIRY_STATUSES = [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "CONVERTED",
  "CLOSED",
] as const satisfies readonly InquiryStatus[];

function isInquiryStatus(value: unknown): value is InquiryStatus {
  return (
    typeof value === "string" &&
    INQUIRY_STATUSES.some((status) => status === value)
  );
}

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

    const updates: ContactInquiryUpdate = {};
    if (typeof status === "string") {
      if (!isInquiryStatus(status)) return apiError("Invalid status", 400);
      updates.status = status;
    }

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
