import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { recordAudit } from "@/lib/admin-audit";
import {
  EVENT_READINESS_SELECT,
  eventReadinessPercent,
  type EventReadinessRow,
} from "@/lib/event-readiness";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type RawBooking = {
  id: string;
  wedding_event_id: string | null;
  status: string | null;
  total_amount: number | null;
  vendor_amount: number | null;
  final_price: number | null;
  service_fee: number | null;
  price_published: boolean | null;
  vendor:
    | { business_name: string | null; category: { name: string | null } | { name: string | null }[] | null }
    | { business_name: string | null; category: { name: string | null } | { name: string | null }[] | null }[]
    | null;
  service:
    | { name: string | null; base_price: number | null }
    | { name: string | null; base_price: number | null }[]
    | null;
};

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profiles, error: profErr } = await supabase
      .from("client_profiles")
      .select("id, partner_name, user:users(name, email)")
      .order("created_at", { ascending: false });
    if (profErr) throw profErr;

    const profileIds = (profiles ?? []).map((p) => p.id);
    if (profileIds.length === 0) return apiSuccess({ clients: [] });

    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("id, name, date, client_profile_id, created_at")
      .in("client_profile_id", profileIds)
      .order("created_at", { ascending: false });
    if (weddingsError) throw weddingsError;

    // latest wedding per client
    const weddingByProfile = new Map<string, { id: string; name: string; date: string | null }>();
    for (const w of weddings ?? []) {
      if (!weddingByProfile.has(w.client_profile_id)) {
        weddingByProfile.set(w.client_profile_id, { id: w.id, name: w.name, date: w.date });
      }
    }
    const weddingIds = [...weddingByProfile.values()].map((w) => w.id);
    if (weddingIds.length === 0) {
      return apiSuccess({
        clients: (profiles ?? []).map((p) => {
          const u = firstRel(p.user) as { name?: string; email?: string } | null;
          return {
            id: p.id,
            name: u?.name ?? p.partner_name ?? "Client",
            email: u?.email ?? null,
            wedding: null,
            totals: { finalTotal: 0, vendorTotal: 0, feeTotal: 0, bookingCount: 0, pricedCount: 0 },
            readiness: { percent: 0, eventCount: 0, eventsReady: 0 },
            days: [],
          };
        }),
      });
    }

    const [
      { data: days, error: daysError },
      { data: events, error: eventsError },
    ] = await Promise.all([
      supabase
        .from("wedding_days")
        .select("id, name, date, sort_order, wedding_id")
        .in("wedding_id", weddingIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("wedding_events")
        .select(EVENT_READINESS_SELECT)
        .in("wedding_id", weddingIds)
        .order("sort_order", { ascending: true }),
    ]);
    if (daysError || eventsError) throw daysError ?? eventsError;

    const hydratedEvents = (events ?? []) as unknown as EventReadinessRow[];
    const eventIds = hydratedEvents.map((event) => event.id);
    let bookingRows: RawBooking[] = [];
    if (eventIds.length > 0) {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `id, wedding_event_id, status, total_amount, vendor_amount, final_price, service_fee, price_published,
           vendor:vendor_profiles(business_name, category:vendor_categories(name)),
           service:vendor_services(name, base_price)`
        )
        .in("wedding_event_id", eventIds)
        .neq("status", "CANCELLED")
        .order("created_at", { ascending: true });
      if (bookingsError) throw bookingsError;
      bookingRows = (bookings ?? []) as RawBooking[];
    }

    const bookingsByEvent = new Map<string, RawBooking[]>();
    for (const b of bookingRows) {
      if (!b.wedding_event_id) continue;
      const list = bookingsByEvent.get(b.wedding_event_id) ?? [];
      list.push(b);
      bookingsByEvent.set(b.wedding_event_id, list);
    }

    const eventsByDay = new Map<string, EventReadinessRow[]>();
    for (const e of hydratedEvents) {
      const key = e.wedding_day_id ?? "__none__";
      const list = eventsByDay.get(key) ?? [];
      list.push(e);
      eventsByDay.set(key, list);
    }

    const daysByWedding = new Map<string, typeof days>();
    for (const d of days ?? []) {
      const list = daysByWedding.get(d.wedding_id) ?? [];
      list.push(d);
      daysByWedding.set(d.wedding_id, list as typeof days);
    }

    const clients = (profiles ?? []).map((p) => {
      const u = firstRel(p.user) as { name?: string; email?: string } | null;
      const wedding = weddingByProfile.get(p.id) ?? null;

      let finalTotal = 0;
      let vendorTotal = 0;
      let feeTotal = 0;
      let bookingCount = 0;
      let pricedCount = 0;
      let eventCount = 0;
      let eventsReady = 0;

      const dayList = wedding ? (daysByWedding.get(wedding.id) ?? []) : [];
      const days = dayList.map((d) => {
        const evs = (eventsByDay.get(d.id) ?? []).map((e) => {
          const bs = bookingsByEvent.get(e.id) ?? [];
          const mappedBookings = bs.map((b) => {
            const vendor = firstRel(b.vendor);
            const service = firstRel(b.service);
            const category = firstRel(vendor?.category ?? null);
            const finalPrice = b.final_price ?? null;
            const listedPrice = b.vendor_amount ?? null;
            const fee =
              b.service_fee ??
              (finalPrice != null && listedPrice != null
                ? finalPrice - listedPrice
                : null);
            bookingCount += 1;
            if (finalPrice != null) {
              pricedCount += 1;
              finalTotal += finalPrice;
              if (listedPrice != null) vendorTotal += listedPrice;
              if (fee != null) feeTotal += fee;
            }
            return {
              id: b.id,
              status: b.status ?? "INQUIRY",
              vendorName: vendor?.business_name ?? "Vendor",
              serviceName: service?.name ?? null,
              categoryName: category?.name ?? "Other",
              listedPrice,
              totalAmount: b.total_amount ?? null,
              finalPrice,
              pricePublished: Boolean(b.price_published),
              fee,
            };
          });
          const readiness = eventReadinessPercent(e);
          eventCount += 1;
          if (readiness >= 100) eventsReady += 1;
          return {
            id: e.id,
            name: e.name,
            date: e.date,
            venue: e.venue,
            guestCount: e.guest_count,
            startTime: e.start_time,
            endTime: e.end_time,
            readiness,
            bookings: mappedBookings,
          };
        });
        return { id: d.id, name: d.name, date: d.date, events: evs };
      });

      return {
        id: p.id,
        name: u?.name ?? p.partner_name ?? "Client",
        email: u?.email ?? null,
        wedding,
        totals: {
          finalTotal,
          vendorTotal,
          feeTotal,
          bookingCount,
          pricedCount,
        },
        readiness: {
          percent: eventCount > 0 ? Math.round((eventsReady / eventCount) * 100) : 0,
          eventCount,
          eventsReady,
        },
        days,
      };
    });

    return apiSuccess({ clients, isAdmin: true });
  } catch (e) {
    console.error("GET /api/admin/pricing", e);
    return apiError("Failed to load pricing data", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  // Setting the client-facing final price is admin-only.
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as {
      bookingId?: unknown;
      finalPrice?: unknown;
      pricePublished?: unknown;
    };
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : null;
    if (!bookingId) return apiError("bookingId is required", 400);

    const toAmount = (v: unknown) =>
      v === null || v === ""
        ? null
        : typeof v === "number" && Number.isFinite(v)
          ? Math.max(0, Math.round(v))
          : undefined;

    const updates: Record<string, unknown> = {};
    if (body.finalPrice !== undefined) {
      const v = toAmount(body.finalPrice);
      if (v === undefined) return apiError("Invalid final price", 400);
      updates.final_price = v;
    }
    if (body.pricePublished !== undefined) {
      if (typeof body.pricePublished !== "boolean") {
        return apiError("pricePublished must be a boolean", 400);
      }
      updates.price_published = body.pricePublished;
    }
    if (Object.keys(updates).length === 0) {
      return apiError("Nothing to update", 400);
    }

    const supabase = createAdminSupabaseClient();
    const { data: current, error: currentErr } = await supabase
      .from("bookings")
      .select("id, vendor_amount, final_price, price_published")
      .eq("id", bookingId)
      .maybeSingle();
    if (currentErr) {
      console.error("PATCH /api/admin/pricing load:", currentErr);
      return apiError("Failed to load pricing", 500);
    }
    if (!current) return apiError("Booking not found", 404);

    const listedPrice = current.vendor_amount ?? null;
    const nextFinalPrice =
      Object.hasOwn(updates, "final_price")
        ? (updates.final_price as number | null)
        : current.final_price;

    if (
      nextFinalPrice != null &&
      listedPrice != null &&
      nextFinalPrice < listedPrice
    ) {
      return apiError("Final price cannot be lower than the vendor price", 400);
    }
    if (nextFinalPrice != null && listedPrice == null) {
      return apiError("A vendor amount is required before setting the final price", 400);
    }
    if (updates.price_published === true && nextFinalPrice == null) {
      return apiError("Set a final price before publishing", 400);
    }
    if (nextFinalPrice == null && current.price_published) {
      updates.price_published = false;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .select("id, vendor_amount, final_price, service_fee, price_published")
      .single();

    if (error) {
      console.error("PATCH /api/admin/pricing update:", error);
      return apiError("Failed to update pricing", 500);
    }

    const updatedListedPrice = data.vendor_amount ?? null;
    const fee =
      data.service_fee ??
      (data.final_price != null && updatedListedPrice != null
        ? data.final_price - updatedListedPrice
        : null);

    await recordAudit({
      actorUserId: session.userId,
      action: body.pricePublished !== undefined ? "PRICE_PUBLISH" : "PRICE_SET",
      entityType: "booking",
      entityId: bookingId,
      summary: `vendor ₹${updatedListedPrice ?? "—"} · fee ₹${fee ?? "—"} · final ₹${data.final_price ?? "—"}${
        data.price_published ? " · published" : ""
      }`,
      meta: {
        listedPrice: updatedListedPrice,
        fee,
        finalPrice: data.final_price ?? null,
        published: Boolean(data.price_published),
      },
    });

    return apiSuccess({
      booking: {
        id: data.id,
        listedPrice: updatedListedPrice,
        finalPrice: data.final_price ?? null,
        pricePublished: Boolean(data.price_published),
        fee,
      },
    });
  } catch (e) {
    console.error("PATCH /api/admin/pricing", e);
    return apiError("Failed to update pricing", 500);
  }
}
