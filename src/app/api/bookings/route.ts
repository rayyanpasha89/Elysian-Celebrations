import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import {
  EVENT_READINESS_SELECT,
  eventReadinessPercent,
  type EventReadinessRow,
} from "@/lib/event-readiness";

const BOOKING_SELECT = `id, client_profile_id, vendor_profile_id, vendor_service_id, wedding_event_id, status, event_date, total_amount, vendor_amount, final_price, price_published, service_fee, paid_amount, notes, created_at, updated_at, client:client_profiles(id, partner_name, weddings(destination:destinations(name))), vendor:vendor_profiles(business_name, slug), service:vendor_services(id, name, description, service_scope, base_price, max_price, unit, event_type_fit, inclusions, deliverables, add_ons, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)), event:wedding_events(id, name, event_type, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, menu_notes, decor_style, decor_notes, attire_notes, notes, wedding_day:wedding_days(id, name, date, notes), logistics:wedding_event_logistics(guest_arrival_time, vendor_load_in_time, family_call_time, transport_notes, rooming_notes, weather_plan, ceremony_notes), menus:wedding_event_menus(id, name, meal_period, service_style, notes, sort_order, items:wedding_event_menu_items(id, name, course, dietary_tags, notes, sort_order)))`;

type Relation<T> = T | T[] | null | undefined;

type BookingEventDayRow = {
  id: string;
  name: string | null;
  date: string | null;
  notes: string | null;
};

type BookingEventLogisticsRow = {
  guest_arrival_time: string | null;
  vendor_load_in_time: string | null;
  family_call_time: string | null;
  transport_notes: string | null;
  rooming_notes: string | null;
  weather_plan: string | null;
  ceremony_notes: string | null;
};

type BookingEventMenuItemRow = {
  id: string;
  name: string;
  course: string | null;
  dietary_tags: string[] | null;
  notes: string | null;
  sort_order: number | null;
};

type BookingEventMenuRow = {
  id: string;
  name: string;
  meal_period: string | null;
  service_style: string | null;
  notes: string | null;
  sort_order: number | null;
  items?: BookingEventMenuItemRow[] | null;
};

type BookingEventRow = {
  id: string;
  name: string;
  event_type: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  guest_count: number | null;
  estimated_budget: number | null;
  food_style: string | null;
  menu_notes: string | null;
  decor_style: string | null;
  decor_notes: string | null;
  attire_notes: string | null;
  notes: string | null;
  wedding_day?: Relation<BookingEventDayRow>;
  logistics?: Relation<BookingEventLogisticsRow>;
  menus?: BookingEventMenuRow[] | null;
};

type BookingRow = {
  status?: string | null;
  wedding_event_id?: string | null;
  event_date?: string | null;
  total_amount?: number | null;
  vendor_amount?: number | null;
  final_price?: number | null;
  price_published?: boolean | null;
  service_fee?: number | null;
  event?: Relation<BookingEventRow>;
};

function stripRelationUserId(value: unknown) {
  const strip = (entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const safeEntry = { ...(entry as Record<string, unknown>) };
    delete safeEntry.user_id;
    return safeEntry;
  };

  return Array.isArray(value) ? value.map(strip) : strip(value);
}

function relationOne<T>(relation: Relation<T>) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function withEventContext<T extends BookingRow>(booking: T) {
  const event = relationOne(booking.event);
  const day = relationOne(event?.wedding_day);
  const logistics = relationOne(event?.logistics);
  const menus = (event?.menus ?? [])
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .map((menu) => ({
      id: menu.id,
      name: menu.name,
      mealPeriod: menu.meal_period,
      serviceStyle: menu.service_style,
      notes: menu.notes,
      items: (menu.items ?? [])
        .slice()
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
        .map((item) => ({
          id: item.id,
          name: item.name,
          course: item.course,
          dietaryTags: item.dietary_tags ?? [],
          notes: item.notes,
        })),
    }));

  return {
    ...booking,
    event_date: event?.date ?? booking.event_date ?? null,
    event_context: event
      ? {
          id: event.id,
          name: event.name,
          eventType: event.event_type,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          venue: event.venue,
          guestCount: event.guest_count,
          estimatedBudget: event.estimated_budget,
          foodStyle: event.food_style,
          menuNotes: event.menu_notes,
          decorStyle: event.decor_style,
          decorNotes: event.decor_notes,
          attireNotes: event.attire_notes,
          notes: event.notes,
          day: day
            ? {
                id: day.id,
                name: day.name,
                date: day.date,
                notes: day.notes,
              }
            : null,
          logistics: logistics
            ? {
                guestArrivalTime: logistics.guest_arrival_time,
                vendorLoadInTime: logistics.vendor_load_in_time,
                familyCallTime: logistics.family_call_time,
                transportNotes: logistics.transport_notes,
                roomingNotes: logistics.rooming_notes,
                weatherPlan: logistics.weather_plan,
                ceremonyNotes: logistics.ceremony_notes,
              }
            : null,
          menus,
        }
      : null,
  };
}

function withRoleSafePricing<T extends BookingRow>(
  booking: T,
  role: "client" | "vendor" | "admin" | "manager",
  clientFinalPriceVisible = false
) {
  const enriched = withEventContext(booking);
  const finalVisibleToClient =
    role === "client" &&
    clientFinalPriceVisible &&
    booking.price_published === true &&
    booking.final_price != null;

  const safe = { ...enriched } as Record<string, unknown>;
  safe.client = stripRelationUserId(safe.client);
  safe.vendor = stripRelationUserId(safe.vendor);
  delete safe.vendor_cost;
  delete safe.vendor_amount;
  delete safe.final_price;
  delete safe.price_published;
  delete safe.service_fee;
  delete safe.event;

  if (role === "client") {
    safe.total_amount = finalVisibleToClient
      ? booking.final_price
      : null;
    safe.pricing_state = finalVisibleToClient ? "final" : "pending";
  } else if (role === "vendor") {
    safe.total_amount = booking.vendor_amount ?? booking.total_amount;
    safe.pricing_state = "vendor_amount";
  } else if (role === "admin") {
    safe.vendor_amount = booking.vendor_amount ?? null;
    safe.final_price = booking.final_price ?? null;
    safe.price_published = Boolean(booking.price_published);
    safe.service_fee = booking.service_fee ?? null;
    safe.pricing_state = booking.price_published ? "published" : "draft";
  } else {
    const publishedFinal =
      booking.price_published && booking.final_price != null
        ? booking.final_price
        : null;
    safe.total_amount = publishedFinal ?? booking.total_amount;
    safe.pricing_state = publishedFinal != null ? "published" : "vendor_amount";
  }

  return safe;
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "vendor", "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (session.role === "client") {
      const { data: profile, error: pErr } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (pErr) {
        console.error("Client profile lookup error:", pErr);
        return apiError("Failed to load profile", 500);
      }
      if (!profile) {
        return apiSuccess({ bookings: [] });
      }
      query = query.eq("client_profile_id", profile.id);
    } else if (session.role === "vendor") {
      const { data: profile, error: pErr } = await supabase
        .from("vendor_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (pErr) {
        console.error("Vendor profile lookup error:", pErr);
        return apiError("Failed to load profile", 500);
      }
      if (!profile) {
        return apiSuccess({ bookings: [] });
      }
      query = query.eq("vendor_profile_id", profile.id);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Bookings list error:", error);
      return apiError("Failed to fetch bookings", 500);
    }

    const clientVisiblePricingEvents = new Set<string>();
    if (session.role === "client") {
      const eventIds = [
        ...new Set(
          (bookings ?? [])
            .map((booking) => booking.wedding_event_id as string | null)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      if (eventIds.length > 0) {
        const [
          { data: pricingRows, error: pricingError },
          { data: readinessRows, error: readinessError },
        ] = await Promise.all([
          supabase
            .from("bookings")
            .select("wedding_event_id, status, final_price, price_published")
            .in("wedding_event_id", eventIds),
          supabase
            .from("wedding_events")
            .select(EVENT_READINESS_SELECT)
            .in("id", eventIds),
        ]);
        if (pricingError || readinessError) {
          console.error(
            "Booking pricing visibility error:",
            pricingError ?? readinessError
          );
        } else {
          const readyEventIds = new Set(
            ((readinessRows ?? []) as unknown as EventReadinessRow[])
              .filter((event) => eventReadinessPercent(event) >= 100)
              .map((event) => event.id)
          );
          const stateByEvent = new Map<
            string,
            { active: number; published: number }
          >();
          for (const row of pricingRows ?? []) {
            if (!row.wedding_event_id || row.status === "CANCELLED") continue;
            const state = stateByEvent.get(row.wedding_event_id) ?? {
              active: 0,
              published: 0,
            };
            state.active += 1;
            if (row.price_published && row.final_price != null) state.published += 1;
            stateByEvent.set(row.wedding_event_id, state);
          }
          for (const [eventId, state] of stateByEvent) {
            if (
              readyEventIds.has(eventId) &&
              state.active > 0 &&
              state.active === state.published
            ) {
              clientVisiblePricingEvents.add(eventId);
            }
          }
        }
      }
    }

    return apiSuccess({
      bookings: (bookings ?? []).map((booking) =>
        withRoleSafePricing(
          booking,
          session.role,
          Boolean(
            booking.wedding_event_id &&
              clientVisiblePricingEvents.has(booking.wedding_event_id as string)
          )
        )
      ),
    });
  } catch (error) {
    console.error("Bookings list error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const { vendorProfileId, vendorServiceId, weddingEventId, eventDate, notes } =
      body;

    if (!vendorProfileId || typeof vendorProfileId !== "string") {
      return apiError("Vendor profile ID is required");
    }

    if (vendorServiceId && typeof vendorServiceId !== "string") {
      return apiError("Vendor service ID is invalid", 400);
    }

    if (weddingEventId && typeof weddingEventId !== "string") {
      return apiError("Event block ID is invalid", 400);
    }

    const { data: clientProfile, error: cpErr } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (cpErr) {
      console.error("Client profile error:", cpErr);
      return apiError("Failed to load client profile", 500);
    }
    if (!clientProfile) {
      return apiError("Client profile not found", 404);
    }

    const { data: vendorProfile, error: vendorProfileError } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("id", vendorProfileId)
      .eq("is_verified", true)
      .maybeSingle();

    if (vendorProfileError) {
      console.error("Vendor profile lookup error:", vendorProfileError);
      return apiError("Failed to validate vendor", 500);
    }

    if (!vendorProfile) {
      return apiError("This vendor is not available for client bookings", 409);
    }

    if (vendorServiceId) {
      const { data: service, error: serviceError } = await supabase
        .from("vendor_services")
        .select("id, vendor_profile_id")
        .eq("id", vendorServiceId)
        .eq("is_active", true)
        .maybeSingle();

      if (serviceError) {
        console.error("Vendor service lookup error:", serviceError);
        return apiError("Failed to validate vendor service", 500);
      }

      if (!service || service.vendor_profile_id !== vendorProfileId) {
        return apiError("This service is not available for booking", 409);
      }
    }

    let linkedEventDate: string | null = null;

    if (weddingEventId) {
      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("id")
        .eq("client_profile_id", clientProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (weddingError) {
        console.error("Wedding lookup error:", weddingError);
        return apiError("Failed to validate booking event", 500);
      }

      if (!wedding) {
        return apiError("Event plan not found", 404);
      }

      const { data: linkedEvent, error: linkedEventError } = await supabase
        .from("wedding_events")
        .select("id, date")
        .eq("id", weddingEventId)
        .eq("wedding_id", wedding.id)
        .maybeSingle();

      if (linkedEventError) {
        console.error("Event block lookup error:", linkedEventError);
        return apiError("Failed to validate booking event", 500);
      }

      if (!linkedEvent) {
        return apiError("Event not found for this wedding", 404);
      }

      linkedEventDate = linkedEvent.date ?? null;
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        client_profile_id: clientProfile.id,
        vendor_profile_id: vendorProfileId,
        vendor_service_id: vendorServiceId || null,
        wedding_event_id: weddingEventId || null,
        event_date: linkedEventDate || eventDate || null,
        notes: notes || null,
      })
      .select(BOOKING_SELECT)
      .single();

    if (error) {
      console.error("Booking create error:", error);
      return apiError("Failed to create booking", 500);
    }

    return apiSuccess(withRoleSafePricing(booking, session.role), 201);
  } catch (error) {
    console.error("Booking create error:", error);
    return apiError("Internal server error", 500);
  }
}
