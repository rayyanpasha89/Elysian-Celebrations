import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { recordAudit } from "@/lib/admin-audit";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type RawBooking = {
  id: string;
  wedding_event_id: string | null;
  status: string | null;
  total_amount: number | null;
  vendor_cost: number | null;
  final_price: number | null;
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

/** Simple per-event progress proxy from the data we have (admin overview). */
function eventReadiness(event: {
  venue: string | null;
  guest_count: number | null;
  start_time: string | null;
  end_time: string | null;
  bookingCount: number;
}) {
  const signals = [
    Boolean(event.venue?.trim()),
    Boolean(event.guest_count),
    Boolean(event.start_time),
    Boolean(event.end_time),
    event.bookingCount > 0,
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;
  const isAdmin = session.role === "admin";

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profiles, error: profErr } = await supabase
      .from("client_profiles")
      .select("id, partner_name, user:users(name, email)")
      .order("created_at", { ascending: false });
    if (profErr) throw profErr;

    const profileIds = (profiles ?? []).map((p) => p.id);
    if (profileIds.length === 0) return apiSuccess({ clients: [] });

    const { data: weddings } = await supabase
      .from("weddings")
      .select("id, name, date, client_profile_id, created_at")
      .in("client_profile_id", profileIds)
      .order("created_at", { ascending: false });

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
            totals: { revenue: 0, cost: 0, margin: 0, bookingCount: 0, pricedCount: 0 },
            readiness: { percent: 0, eventCount: 0, eventsReady: 0 },
            days: [],
          };
        }),
      });
    }

    const [{ data: days }, { data: events }] = await Promise.all([
      supabase
        .from("wedding_days")
        .select("id, name, date, sort_order, wedding_id")
        .in("wedding_id", weddingIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("wedding_events")
        .select(
          "id, name, date, venue, guest_count, start_time, end_time, wedding_day_id, wedding_id, sort_order"
        )
        .in("wedding_id", weddingIds)
        .order("sort_order", { ascending: true }),
    ]);

    const eventIds = (events ?? []).map((e) => e.id);
    let bookingRows: RawBooking[] = [];
    if (eventIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          `id, wedding_event_id, status, total_amount, vendor_cost, final_price, price_published,
           vendor:vendor_profiles(business_name, category:vendor_categories(name)),
           service:vendor_services(name, base_price)`
        )
        .in("wedding_event_id", eventIds)
        .order("created_at", { ascending: true });
      bookingRows = (bookings ?? []) as RawBooking[];
    }

    const bookingsByEvent = new Map<string, RawBooking[]>();
    for (const b of bookingRows) {
      if (!b.wedding_event_id) continue;
      const list = bookingsByEvent.get(b.wedding_event_id) ?? [];
      list.push(b);
      bookingsByEvent.set(b.wedding_event_id, list);
    }

    const eventsByDay = new Map<string, typeof events>();
    for (const e of events ?? []) {
      const key = e.wedding_day_id ?? "__none__";
      const list = eventsByDay.get(key) ?? [];
      list.push(e);
      eventsByDay.set(key, list as typeof events);
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

      let revenue = 0;
      let cost = 0;
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
            const vendorCost = b.vendor_cost ?? null;
            bookingCount += 1;
            if (finalPrice != null) {
              pricedCount += 1;
              revenue += finalPrice;
            }
            if (vendorCost != null) cost += vendorCost;
            return {
              id: b.id,
              status: b.status ?? "INQUIRY",
              vendorName: vendor?.business_name ?? "Vendor",
              serviceName: service?.name ?? null,
              categoryName: category?.name ?? "Other",
              listedPrice: service?.base_price ?? null,
              totalAmount: b.total_amount ?? null,
              vendorCost,
              finalPrice,
              pricePublished: Boolean(b.price_published),
              margin: finalPrice != null && vendorCost != null ? finalPrice - vendorCost : null,
            };
          });
          const readiness = eventReadiness({
            venue: e.venue,
            guest_count: e.guest_count,
            start_time: e.start_time,
            end_time: e.end_time,
            bookingCount: bs.length,
          });
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
          revenue,
          cost,
          margin: revenue - cost,
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

    // Managers never see cost / margin / final price — only progress + prices
    // are theirs; the money is admin-only.
    if (!isAdmin) {
      for (const c of clients) {
        c.totals = { revenue: 0, cost: 0, margin: 0, bookingCount: c.totals.bookingCount, pricedCount: c.totals.pricedCount };
        for (const d of c.days)
          for (const e of d.events)
            for (const b of e.bookings) {
              b.vendorCost = null;
              b.listedPrice = null;
              b.margin = null;
            }
      }
    }

    return apiSuccess({ clients, isAdmin });
  } catch (e) {
    console.error("GET /api/admin/pricing", e);
    return apiError("Failed to load pricing data", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  // Setting cost / final price is admin-only (managers can't see or change money).
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as {
      bookingId?: unknown;
      vendorCost?: unknown;
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
    if (body.vendorCost !== undefined) {
      const v = toAmount(body.vendorCost);
      if (v === undefined) return apiError("Invalid vendor cost", 400);
      updates.vendor_cost = v;
    }
    if (body.finalPrice !== undefined) {
      const v = toAmount(body.finalPrice);
      if (v === undefined) return apiError("Invalid final price", 400);
      updates.final_price = v;
    }
    if (body.pricePublished !== undefined) {
      updates.price_published = Boolean(body.pricePublished);
    }
    if (Object.keys(updates).length === 0) {
      return apiError("Nothing to update", 400);
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .select("id, vendor_cost, final_price, price_published")
      .single();

    if (error) {
      console.error("PATCH /api/admin/pricing update:", error);
      return apiError("Failed to update pricing", 500);
    }

    await recordAudit({
      actorUserId: session.userId,
      action: body.pricePublished !== undefined ? "PRICE_PUBLISH" : "PRICE_SET",
      entityType: "booking",
      entityId: bookingId,
      summary: `cost ₹${data.vendor_cost ?? "—"} · final ₹${data.final_price ?? "—"}${
        data.price_published ? " · published" : ""
      }`,
      meta: {
        vendorCost: data.vendor_cost ?? null,
        finalPrice: data.final_price ?? null,
        published: Boolean(data.price_published),
      },
    });

    return apiSuccess({
      booking: {
        id: data.id,
        vendorCost: data.vendor_cost ?? null,
        finalPrice: data.final_price ?? null,
        pricePublished: Boolean(data.price_published),
        margin:
          data.final_price != null && data.vendor_cost != null
            ? data.final_price - data.vendor_cost
            : null,
      },
    });
  } catch (e) {
    console.error("PATCH /api/admin/pricing", e);
    return apiError("Failed to update pricing", 500);
  }
}
