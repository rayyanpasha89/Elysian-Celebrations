import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function weekLabel(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vendorProfile } = await supabase
      .from("vendor_profiles")
      .select("id, rating, review_count")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!vendorProfile) {
      return apiSuccess({
        bookingsTotal: 0,
        bookingsByStatus: {},
        revenueEstimate: 0,
        paidThisMonth: 0,
        quotePipeline: 0,
        completedBookings: 0,
        liveInquiries: 0,
        rating: 0,
        reviewCount: 0,
        weeklyInquiryVolume: Array.from({ length: 6 }, (_, index) => ({
          label: `W${index + 1}`,
          count: 0,
        })),
      });
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("status, total_amount, paid_amount, created_at, updated_at, event_date")
      .eq("vendor_profile_id", vendorProfile.id);

    if (error) {
      console.error("GET /api/vendor/analytics bookings", error);
      return apiError("Failed to load vendor analytics", 500);
    }

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    const currentWeekStart = startOfWeek(now);
    const weeklyInquiryVolume = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(currentWeekStart);
      start.setUTCDate(start.getUTCDate() - (5 - index) * 7);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      return {
        label: weekLabel(start),
        count: 0,
        start,
        end,
      };
    });

    const bookingsByStatus: Record<string, number> = {};
    let revenueEstimate = 0;
    let paidThisMonth = 0;
    let quotePipeline = 0;
    let completedBookings = 0;
    let liveInquiries = 0;

    for (const booking of bookings ?? []) {
      bookingsByStatus[booking.status] =
        (bookingsByStatus[booking.status] ?? 0) + 1;
      revenueEstimate += booking.paid_amount ?? 0;

      const updatedAt = booking.updated_at ? new Date(booking.updated_at) : null;
      if (updatedAt && updatedAt >= monthStart) {
        paidThisMonth += booking.paid_amount ?? 0;
      }

      if (booking.status !== "CANCELLED") {
        quotePipeline += booking.total_amount ?? 0;
      }

      if (booking.status === "COMPLETED") {
        completedBookings += 1;
      }

      if (booking.status === "INQUIRY" || booking.status === "QUOTE_SENT") {
        liveInquiries += 1;
        if (booking.created_at) {
          const createdAt = new Date(booking.created_at);
          const bucket = weeklyInquiryVolume.find(
            (item) => createdAt >= item.start && createdAt < item.end
          );
          if (bucket) {
            bucket.count += 1;
          }
        }
      }
    }

    return apiSuccess({
      bookingsTotal: bookings?.length ?? 0,
      bookingsByStatus,
      revenueEstimate,
      paidThisMonth,
      quotePipeline,
      completedBookings,
      liveInquiries,
      rating: vendorProfile.rating,
      reviewCount: vendorProfile.review_count,
      weeklyInquiryVolume: weeklyInquiryVolume.map(({ label, count }) => ({
        label,
        count,
      })),
    });
  } catch (e) {
    console.error("GET /api/vendor/analytics", e);
    return apiError("Internal server error", 500);
  }
}
