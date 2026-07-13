import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

const ACTIVE_BOOKING_STATUSES = new Set(["CONFIRMED", "DEPOSIT_PAID"]);
const PAID_TO_DATE_STATUSES = new Set([
  ...ACTIVE_BOOKING_STATUSES,
  "COMPLETED",
]);
const QUOTE_PIPELINE_STATUSES = new Set(["INQUIRY", "QUOTE_SENT"]);

function currentVendorAmount(booking: {
  vendor_amount?: number | null;
  total_amount?: number | null;
}) {
  return Math.max(0, booking.vendor_amount ?? booking.total_amount ?? 0);
}

function paidTowardVendorAmount(
  booking: {
    paid_amount?: number | null;
    vendor_amount?: number | null;
    total_amount?: number | null;
  },
  amount = currentVendorAmount(booking)
) {
  return Math.min(amount, Math.max(0, booking.paid_amount ?? 0));
}

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
    const { data: vendorProfile, error: profileError } = await supabase
      .from("vendor_profiles")
      .select("id, rating, review_count")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (profileError) {
      console.error("GET /api/vendor/analytics vendor profile", profileError);
      return apiError("Failed to load vendor analytics", 500);
    }

    if (!vendorProfile) {
      return apiSuccess({
        bookingsTotal: 0,
        bookingsByStatus: {},
        paidToDate: 0,
        outstandingAmount: 0,
        quotePipeline: 0,
        completedBookings: 0,
        liveInquiries: 0,
        profileViews: 0,
        rating: 0,
        reviewCount: 0,
        weeklyInquiryVolume: Array.from({ length: 6 }, (_, index) => ({
          label: `W${index + 1}`,
          count: 0,
        })),
      });
    }

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    const currentWeekStart = startOfWeek(now);

    const [bookingsResult, profileViewsResult] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "status, total_amount, vendor_amount, paid_amount, created_at"
        )
        .eq("vendor_profile_id", vendorProfile.id),
      supabase
        .from("vendor_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("vendor_profile_id", vendorProfile.id)
        .gte("created_at", monthStart.toISOString()),
    ]);

    const failedQuery = [
      { name: "bookings", error: bookingsResult.error },
      { name: "profile views", error: profileViewsResult.error },
    ].find((result) => result.error);

    if (failedQuery) {
      console.error(
        `GET /api/vendor/analytics ${failedQuery.name}`,
        failedQuery.error
      );
      return apiError("Failed to load vendor analytics", 500);
    }

    const bookings = bookingsResult.data;
    const profileViewsCount = profileViewsResult.count;

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
    let paidToDate = 0;
    let outstandingAmount = 0;
    let quotePipeline = 0;
    let completedBookings = 0;
    let liveInquiries = 0;

    for (const booking of bookings ?? []) {
      bookingsByStatus[booking.status] =
        (bookingsByStatus[booking.status] ?? 0) + 1;
      const amount = currentVendorAmount(booking);
      const paidAmount = paidTowardVendorAmount(booking, amount);

      if (PAID_TO_DATE_STATUSES.has(booking.status)) {
        paidToDate += paidAmount;
      }

      if (ACTIVE_BOOKING_STATUSES.has(booking.status)) {
        outstandingAmount += Math.max(0, amount - paidAmount);
      }

      if (QUOTE_PIPELINE_STATUSES.has(booking.status)) {
        quotePipeline += amount;
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
      paidToDate,
      outstandingAmount,
      quotePipeline,
      completedBookings,
      liveInquiries,
      profileViews: profileViewsCount ?? 0,
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
