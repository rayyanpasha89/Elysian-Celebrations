import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "DEPOSIT_PAID"] as const;
const ACTIVE_BOOKING_STATUS_SET = new Set<string>(ACTIVE_BOOKING_STATUSES);
const PAID_TO_DATE_STATUSES = new Set<string>([
  ...ACTIVE_BOOKING_STATUSES,
  "COMPLETED",
]);

type Relation<T> = T | T[] | null | undefined;

type WeddingEventRelation = {
  name?: string | null;
  date?: string | null;
  venue?: string | null;
  wedding?: Relation<{
    destination?: Relation<{ name?: string | null }>;
  }>;
};

function relationOne<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

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

function eventLocation(event: WeddingEventRelation | null) {
  const wedding = relationOne(event?.wedding);
  const destination = relationOne(wedding?.destination)?.name?.trim();
  const venue = event?.venue?.trim();

  if (
    venue &&
    destination &&
    venue.toLocaleLowerCase() !== destination.toLocaleLowerCase()
  ) {
    return `${venue}, ${destination}`;
  }

  return venue || destination || "Location not specified";
}

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
        "id, business_name, slug, rating, review_count, is_verified"
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
          activeBookings: 0,
          avgRating: 0,
          paidToDate: 0,
          outstandingAmount: 0,
          profileViews: 0,
        },
        pendingInquiries: [],
        upcomingEvents: [],
        needsOnboarding: true,
      });
    }

    const [
      totalBookingsResult,
      pendingInquiriesResult,
      activeBookingsResult,
      bookingAmountsResult,
      reviewsResult,
      inquiryRowsResult,
      upcomingResult,
      profileViewsResult,
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_profile_id", vp.id),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_profile_id", vp.id)
        .eq("status", "INQUIRY"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_profile_id", vp.id)
        .in("status", [...ACTIVE_BOOKING_STATUSES]),
      supabase
        .from("bookings")
        .select("status, total_amount, vendor_amount, paid_amount")
        .eq("vendor_profile_id", vp.id),
      supabase
        .from("reviews")
        .select("rating")
        .eq("vendor_profile_id", vp.id)
        .eq("is_published", true),
      supabase
        .from("bookings")
        .select(
          "id, event_date, client:client_profiles(partner_name), service:vendor_services(name), wedding_event:wedding_events(date, venue, wedding:weddings(destination:destinations(name)))"
        )
        .eq("vendor_profile_id", vp.id)
        .eq("status", "INQUIRY")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("bookings")
        .select(
          "event_date, client:client_profiles(partner_name), wedding_event:wedding_events(name, date, venue, wedding:weddings(destination:destinations(name)))"
        )
        .eq("vendor_profile_id", vp.id)
        .in("status", ["CONFIRMED", "DEPOSIT_PAID"])
        .not("event_date", "is", null)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5),
      supabase
        .from("vendor_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("vendor_profile_id", vp.id)
        .gte("created_at", monthStart.toISOString()),
    ]);

    const failedQuery = [
      { name: "total bookings", error: totalBookingsResult.error },
      { name: "pending inquiries", error: pendingInquiriesResult.error },
      { name: "active bookings", error: activeBookingsResult.error },
      { name: "booking amounts", error: bookingAmountsResult.error },
      { name: "reviews", error: reviewsResult.error },
      { name: "inquiry list", error: inquiryRowsResult.error },
      { name: "upcoming events", error: upcomingResult.error },
      { name: "profile views", error: profileViewsResult.error },
    ].find((result) => result.error);

    if (failedQuery) {
      console.error(
        `GET /api/dashboard/vendor ${failedQuery.name}`,
        failedQuery.error
      );
      return apiError("Failed to load vendor dashboard", 500);
    }

    const totalBookings = totalBookingsResult.count;
    const pendingInquiryCount = pendingInquiriesResult.count;
    const activeBookings = activeBookingsResult.count;
    const reviews = reviewsResult.data;
    const inquiryRows = inquiryRowsResult.data;
    const upcoming = upcomingResult.data;
    const profileViewsCount = profileViewsResult.count;

    let paidToDate = 0;
    let outstandingAmount = 0;

    for (const booking of bookingAmountsResult.data ?? []) {
      const amount = currentVendorAmount(booking);
      const paidAmount = paidTowardVendorAmount(booking, amount);

      if (PAID_TO_DATE_STATUSES.has(booking.status)) {
        paidToDate += paidAmount;
      }

      if (ACTIVE_BOOKING_STATUS_SET.has(booking.status)) {
        outstandingAmount += Math.max(0, amount - paidAmount);
      }
    }

    const ratings = reviews ?? [];
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
        : vp.rating ?? 0;

    const inquiryList = (inquiryRows ?? []).map((row) => {
      const client = relationOne(
        row.client as Relation<{ partner_name?: string | null }>
      );
      const service = relationOne(
        row.service as Relation<{ name?: string | null }>
      );
      const weddingEvent = relationOne(
        row.wedding_event as Relation<WeddingEventRelation>
      );
      const eventDate = weddingEvent?.date ?? row.event_date;

      return {
        id: row.id,
        couple: client?.partner_name ?? "Couple",
        location: eventLocation(weddingEvent),
        date: eventDate
          ? new Date(eventDate).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "TBD",
        service: service?.name?.trim() || "Service not specified",
      };
    });

    const upcomingEvents = (upcoming ?? []).map((u) => {
      const client = relationOne(
        u.client as Relation<{ partner_name?: string | null }>
      );
      const weddingEvent = relationOne(
        u.wedding_event as Relation<WeddingEventRelation>
      );
      const eventDate = weddingEvent?.date ?? u.event_date;
      const date = eventDate ? new Date(eventDate) : null;

      return {
        couple: client?.partner_name ?? "Couple",
        event: weddingEvent?.name?.trim() || "Event not specified",
        date: date
          ? date.toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })
          : "",
        location: eventLocation(weddingEvent),
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
        activeBookings: activeBookings ?? 0,
        avgRating: Math.round(avgRating * 10) / 10,
        paidToDate,
        outstandingAmount,
        profileViews: profileViewsCount ?? 0,
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
