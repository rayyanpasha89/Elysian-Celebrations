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
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { count: activeWeddings } = await supabase
      .from("weddings")
      .select("id", { count: "exact", head: true })
      .eq("status", "PLANNING");

    const { count: pendingInquiries } = await supabase
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "NEW");

    const { count: confirmedBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["CONFIRMED", "DEPOSIT_PAID"]);

    const { count: vendorsAvailable } = await supabase
      .from("vendor_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true);

    const { data: recentInquiries } = await supabase
      .from("contact_inquiries")
      .select("id, name, email, destination, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: upcomingWeddings } = await supabase
      .from("weddings")
      .select("id, name, date, status, destination:destinations(name)")
      .eq("status", "PLANNING")
      .order("date", { ascending: true, nullsFirst: false })
      .limit(5);

    const inquiryList = (recentInquiries ?? []).map((q) => ({
      id: q.id,
      name: q.name,
      email: q.email,
      destination: q.destination,
      status: q.status,
      createdAt: q.created_at,
    }));

    const weddingList = (upcomingWeddings ?? []).map((w) => {
      const dest = w.destination as { name?: string } | null;
      return {
        id: w.id,
        name: w.name,
        date: w.date,
        destination: dest?.name ?? null,
        status: w.status,
      };
    });

    return apiSuccess({
      stats: {
        activeWeddings: activeWeddings ?? 0,
        pendingInquiries: pendingInquiries ?? 0,
        confirmedBookings: confirmedBookings ?? 0,
        vendorsAvailable: vendorsAvailable ?? 0,
      },
      recentInquiries: inquiryList,
      upcomingWeddings: weddingList,
      subtitle: `${pendingInquiries ?? 0} new inquiries · ${activeWeddings ?? 0} active weddings`,
    });
  } catch (e) {
    console.error("dashboard manager", e);
    return apiError("Internal server error", 500);
  }
}
