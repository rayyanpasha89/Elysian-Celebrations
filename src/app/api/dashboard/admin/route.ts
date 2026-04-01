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

    const { data: usersByRole } = await supabase
      .from("users")
      .select("role");

    const roleCounts = { client: 0, vendor: 0, admin: 0 };
    for (const u of usersByRole ?? []) {
      const r = String(u.role ?? "").toUpperCase();
      if (r === "CLIENT") roleCounts.client++;
      else if (r === "VENDOR") roleCounts.vendor++;
      else if (r === "ADMIN") roleCounts.admin++;
    }

    const { count: weddingsCount } = await supabase
      .from("weddings")
      .select("id", { count: "exact", head: true });

    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("status");

    const bookingsByStatus: Record<string, number> = {};
    for (const b of bookingRows ?? []) {
      const s = b.status as string;
      bookingsByStatus[s] = (bookingsByStatus[s] ?? 0) + 1;
    }

    const { count: newInquiriesCount } = await supabase
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "NEW");

    const { data: pendingVendors } = await supabase
      .from("vendor_profiles")
      .select(
        "id, business_name, created_at, category:vendor_categories(name)"
      )
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: recentInquiries } = await supabase
      .from("contact_inquiries")
      .select("id, name, email, destination, status, created_at, message")
      .order("created_at", { ascending: false })
      .limit(5);

    const pendingVendorList = (pendingVendors ?? []).map((v) => {
      const cat = v.category as { name?: string } | null;
      return {
        id: v.id,
        name: v.business_name,
        category: cat?.name ?? "—",
        date: new Date(v.created_at).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        }),
      };
    });

    const recentContactInquiries = (recentInquiries ?? []).map((q) => ({
      id: q.id,
      name: q.name,
      email: q.email,
      destination: q.destination,
      status: q.status,
      createdAt: q.created_at,
      preview: q.message?.slice(0, 120) ?? "",
    }));

    const pendingCount = pendingVendorList.length;

    return apiSuccess({
      usersByRole: roleCounts,
      weddingsCount: weddingsCount ?? 0,
      bookingsByStatus,
      newContactInquiries: newInquiriesCount ?? 0,
      pendingVendors: pendingVendorList,
      pendingVendorCount: pendingCount,
      recentContactInquiries,
      subtitle: `${newInquiriesCount ?? 0} new inquiries · ${pendingCount} vendor applications pending review.`,
    });
  } catch (e) {
    console.error("dashboard admin", e);
    return apiError("Internal server error", 500);
  }
}
