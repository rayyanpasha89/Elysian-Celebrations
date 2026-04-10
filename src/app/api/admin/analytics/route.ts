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
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const [
      { data: usersByRole },
      { count: weddings },
      { data: bookingRows },
      { count: newInquiries },
    ] = await Promise.all([
      supabase.from("users").select("role"),
      supabase
        .from("weddings")
        .select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("status"),
      supabase
        .from("contact_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "NEW"),
    ]);

    const roleCounts = { client: 0, vendor: 0, admin: 0 };
    for (const u of usersByRole ?? []) {
      const r = String(u.role ?? "").toUpperCase();
      if (r === "CLIENT") roleCounts.client++;
      else if (r === "VENDOR") roleCounts.vendor++;
      else if (r === "ADMIN") roleCounts.admin++;
    }

    const bookingsByStatus: Record<string, number> = {};
    for (const b of bookingRows ?? []) {
      const s = b.status as string;
      bookingsByStatus[s] = (bookingsByStatus[s] ?? 0) + 1;
    }

    return apiSuccess({
      usersByRole: roleCounts,
      weddingsCount: weddings ?? 0,
      bookingsByStatus,
      newContactInquiries: newInquiries ?? 0,
    });
  } catch (e) {
    console.error("GET /api/admin/analytics", e);
    return apiError("Internal server error", 500);
  }
}
