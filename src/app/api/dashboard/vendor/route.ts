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
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select(
        "id, business_name, slug, rating, review_count, is_verified, city, country"
      )
      .eq("user_id", session.userId)
      .maybeSingle();

    if (vErr) {
      console.error("vendor_profiles:", vErr);
      return apiError("Failed to load vendor profile", 500);
    }

    if (!vp) {
      return apiSuccess({
        vendor: null,
        stats: {
          totalBookings: 0,
          pendingInquiries: 0,
          confirmedBookings: 0,
          avgRating: 0,
          revenueMonth: 0,
          profileViews: 0,
        },
        pendingInquiries: [],
        upcomingEvents: [],
        needsOnboarding: true,
      });
    }

    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("vendor_profile_id", vp.id);

    const { count: pendingInquiryCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("vendor_profile_id", vp.id)
      .eq("status", "INQUIRY");

    const { count: confirmedBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("vendor_profile_id", vp.id)
      .in("status", ["CONFIRMED", "DEPOSIT_PAID", "COMPLETED"]);

    const { data: revenueRows } = await supabase
      .from("bookings")
      .select("paid_amount, updated_at")
      .eq("vendor_profile_id", vp.id);

    const revenueMonth = (revenueRows ?? []).reduce((sum, row) => {
      if (!row.updated_at) return sum;
      return new Date(row.updated_at) >= monthStart
        ? sum + (row.paid_amount ?? 0)
        : sum;
    }, 0);

    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("vendor_profile_id", vp.id)
      .eq("is_published", true);

    const ratings = reviews ?? [];
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
        : vp.rating ?? 0;

    const { data: inquiryRows } = await supabase
      .from("bookings")
      .select(
        "id, event_date, notes, client:client_profiles(partner_name, user_id)"
      )
      .eq("vendor_profile_id", vp.id)
      .eq("status", "INQUIRY")
      .order("created_at", { ascending: false })
      .limit(5);

    const inquiryList = (inquiryRows ?? []).map((row) => {
      const c = row.client as { partner_name?: string; user_id?: string } | null;
      return {
        id: row.id,
        couple: c?.partner_name ?? "Couple",
        destination: "—",
        date: row.event_date
          ? new Date(row.event_date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "TBD",
        service: "Booking inquiry",
      };
    });

    const { data: upcoming } = await supabase
      .from("bookings")
      .select(
        "event_date, client:client_profiles(partner_name), wedding_event:wedding_events(name)"
      )
      .eq("vendor_profile_id", vp.id)
      .in("status", ["CONFIRMED", "DEPOSIT_PAID"])
      .not("event_date", "is", null)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(5);

    const upcomingEvents = (upcoming ?? []).map((u) => {
      const c = u.client as { partner_name?: string } | null;
      const we = u.wedding_event as { name?: string } | null;
      const ed = u.event_date ? new Date(u.event_date) : null;
      return {
        couple: c?.partner_name ?? "Couple",
        event: we?.name ?? "Event",
        date: ed
          ? ed.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
          : "",
        location: vp.city ?? vp.country ?? "",
      };
    });

    const needsOnboarding = !vp.business_name?.trim();

    return apiSuccess({
      vendor: {
        id: vp.id,
        businessName: vp.business_name,
        slug: vp.slug,
        isVerified: vp.is_verified,
      },
      stats: {
        totalBookings: totalBookings ?? 0,
        pendingInquiries: pendingInquiryCount ?? 0,
        confirmedBookings: confirmedBookings ?? 0,
        avgRating: Math.round(avgRating * 10) / 10,
        revenueMonth,
        profileViews: 0,
      },
      pendingInquiries: inquiryList,
      upcomingEvents,
      needsOnboarding,
      subtitle: `${pendingInquiryCount ?? 0} new inquiries · ${upcomingEvents.length} upcoming events`,
    });
  } catch (e) {
    console.error("dashboard vendor", e);
    return apiError("Internal server error", 500);
  }
}
