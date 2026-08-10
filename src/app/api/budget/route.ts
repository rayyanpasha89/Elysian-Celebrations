import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  EVENT_READINESS_SELECT,
  evaluateEventReadiness,
  type EventReadinessGap,
  type EventReadinessResult,
  type EventReadinessRow,
} from "@/lib/event-readiness";

async function getClientProfileId(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: profile, error } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.id ?? null;
}

type EventPlanSpendDay = {
  id: string;
  name: string;
  date: string | null;
  sortOrder: number;
  estimatedSpend: number;
  eventCount: number;
  events: EventPlanSpendEvent[];
};

type EventPlanSpendEvent = {
  id: string;
  name: string;
  eventType: string | null;
  date: string | null;
  startTime: string | null;
  estimatedSpend: number;
  readinessPercent: number;
  readinessGaps: EventReadinessGap[];
};

type EventPlanSpendSummary = {
  weddingName: string;
  totalEstimated: number;
  eventCount: number;
  days: EventPlanSpendDay[];
};

type EventPlanDayRow = {
  id: string;
  name: string;
  date: string | null;
  sort_order: number | null;
};

type EventPlanContext = {
  wedding: { id: string; name: string };
  days: EventPlanDayRow[];
  events: EventReadinessRow[];
  readinessByEventId: Map<string, EventReadinessResult>;
  dayNameById: Map<string, string>;
  eventIds: string[];
};

async function loadEventPlanContext(
  profileId: string
): Promise<EventPlanContext | null> {
  const supabase = createAdminSupabaseClient();
  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id, name")
    .eq("client_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weddingError) {
    throw weddingError;
  }
  if (!wedding) return null;

  const [{ data: dayRows, error: daysError }, { data: eventRows, error: eventsError }] =
    await Promise.all([
      supabase
        .from("wedding_days")
        .select("id, name, date, sort_order")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("wedding_events")
        .select(EVENT_READINESS_SELECT)
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
    ]);

  if (daysError || eventsError) {
    throw daysError ?? eventsError;
  }

  const days = (dayRows ?? []) as EventPlanDayRow[];
  const events = (eventRows ?? []) as unknown as EventReadinessRow[];
  const readinessByEventId = new Map(
    events.map(
      (event) => [event.id, evaluateEventReadiness(event)] as const
    )
  );
  return {
    wedding,
    days,
    events,
    readinessByEventId,
    dayNameById: new Map(days.map((day) => [day.id, day.name])),
    eventIds: events.map((event) => event.id),
  };
}

function getEventPlanSpendSummary(
  context: EventPlanContext | null
): EventPlanSpendSummary | null {
  if (!context) return null;
  const { wedding, days, events, readinessByEventId } = context;

  const byDay = new Map<
    string,
    { spend: number; count: number; events: EventPlanSpendEvent[] }
  >();
  for (const day of days) {
    byDay.set(day.id, { spend: 0, count: 0, events: [] });
  }

  let unassignedSpend = 0;
  let unassignedCount = 0;
  const unassignedEvents: EventPlanSpendEvent[] = [];

  for (const event of events) {
    const amount = event.estimated_budget ?? 0;
    const readiness = readinessByEventId.get(event.id);
    const eventSummary: EventPlanSpendEvent = {
      id: event.id,
      name: event.name,
      eventType: event.event_type,
      date: event.date,
      startTime: event.start_time,
      estimatedSpend: amount,
      readinessPercent: readiness?.percent ?? 0,
      readinessGaps: readiness?.gaps ?? [],
    };
    const dayId = event.wedding_day_id;
    if (dayId && byDay.has(dayId)) {
      const bucket = byDay.get(dayId)!;
      bucket.spend += amount;
      bucket.count += 1;
      bucket.events.push(eventSummary);
    } else {
      unassignedSpend += amount;
      unassignedCount += 1;
      unassignedEvents.push(eventSummary);
    }
  }

  const daySummaries: EventPlanSpendDay[] = days.map((day, index) => {
    const bucket = byDay.get(day.id) ?? { spend: 0, count: 0, events: [] };
    return {
      id: day.id,
      name: day.name,
      date: day.date,
      sortOrder: day.sort_order ?? index,
      estimatedSpend: bucket.spend,
      eventCount: bucket.count,
      events: bucket.events,
    };
  });

  if (unassignedCount > 0) {
    daySummaries.push({
      id: "__unassigned__",
      name: "Unassigned events",
      date: null,
      sortOrder: 9999,
      estimatedSpend: unassignedSpend,
      eventCount: unassignedCount,
      events: unassignedEvents,
    });
  }

  const totalEstimated = events.reduce(
    (sum, event) => sum + (event.estimated_budget ?? 0),
    0
  );

  return {
    weddingName: wedding.name,
    totalEstimated,
    eventCount: events.length,
    days: daySummaries,
  };
}

// ─── Two-way sync: event-plan vendor picks → budget line items ──────────────

/** Map a planner vendor category slug onto a budget category name. */
const VENDOR_SLUG_TO_BUDGET_CATEGORY: Record<string, string> = {
  catering: "Catering",
  food: "Catering",
  decor: "Decor & Design",
  design: "Decor & Design",
  floral: "Decor & Design",
  flowers: "Decor & Design",
  photography: "Photography & Video",
  photo: "Photography & Video",
  videography: "Photography & Video",
  film: "Photography & Video",
  entertainment: "Entertainment",
  music: "Entertainment",
  travel: "Travel & Logistics",
  logistics: "Travel & Logistics",
  transport: "Travel & Logistics",
  planning: "Venue & Hospitality",
  hospitality: "Venue & Hospitality",
  venue: "Venue & Hospitality",
  makeup: "Makeup & Styling",
  beauty: "Makeup & Styling",
  styling: "Makeup & Styling",
};

function budgetCategoryForVendorSlug(slug: string | null | undefined) {
  if (!slug) return "Miscellaneous";
  return VENDOR_SLUG_TO_BUDGET_CATEGORY[slug.toLowerCase()] ?? "Miscellaneous";
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export type PlanLineItem = {
  bookingId: string;
  eventId: string;
  eventName: string;
  dayName: string | null;
  categoryName: string;
  vendorName: string;
  serviceName: string | null;
  name: string;
  estimatedCost: number;
  displayCost: number;
  costState: "estimate" | "final";
  paidAmount: number;
  status: string;
  stage: "selected" | "booked" | "confirmed";
};

/** Map a raw booking status onto a simple 3-stage funnel. */
function bookingStage(status: string | null): "selected" | "booked" | "confirmed" {
  if (status === "CONFIRMED" || status === "COMPLETED") return "confirmed";
  if (status === "DEPOSIT_PAID") return "booked";
  return "selected";
}

type RawBudgetBookingRow = {
  id: string;
  wedding_event_id: string | null;
  total_amount: number | null;
  final_price: number | null;
  price_published: boolean | null;
  paid_amount: number | null;
  status: string | null;
  vendor:
    | {
        business_name: string | null;
        category:
          | { slug: string | null }
          | { slug: string | null }[]
          | null;
      }
    | {
        business_name: string | null;
        category: { slug: string | null } | { slug: string | null }[] | null;
      }[]
    | null;
  service:
    | { name: string | null; base_price: number | null }
    | { name: string | null; base_price: number | null }[]
    | null;
};

/**
 * Reads the latest wedding's vendor bookings and shapes them into budget line
 * items the client can one-click import — the "event plan → budget" direction
 * of the two-way sync. (The reverse direction already rolls budget items back
 * into each event's estimated_budget on save.)
 */
async function getPlanVendorLineItems(
  context: EventPlanContext | null
): Promise<PlanLineItem[]> {
  if (!context || context.eventIds.length === 0) return [];
  const supabase = createAdminSupabaseClient();
  const { dayNameById, events, eventIds, readinessByEventId } = context;
  const eventInfo = new Map(
    events.map((event) => [
      event.id as string,
      {
        name: (event.name as string) ?? "Function",
        dayName: event.wedding_day_id
          ? dayNameById.get(event.wedding_day_id as string) ?? null
          : null,
        ready: readinessByEventId.get(event.id)?.ready ?? false,
      },
    ])
  );

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `id, wedding_event_id, total_amount, final_price, price_published, paid_amount, status,
       vendor:vendor_profiles(business_name, category:vendor_categories(slug)),
       service:vendor_services(name, base_price)`
    )
    .in("wedding_event_id", eventIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const bookingRows = (bookings ?? []) as RawBudgetBookingRow[];
  const pricingByEvent = new Map<
    string,
    { active: number; published: number }
  >();
  for (const row of bookingRows) {
    if (!row.wedding_event_id || row.status === "CANCELLED") continue;
    const state = pricingByEvent.get(row.wedding_event_id) ?? {
      active: 0,
      published: 0,
    };
    state.active += 1;
    if (row.price_published && row.final_price != null) state.published += 1;
    pricingByEvent.set(row.wedding_event_id, state);
  }

  const lineItems: PlanLineItem[] = [];
  for (const row of bookingRows) {
    if (row.status === "CANCELLED") continue;
    const eventId = row.wedding_event_id;
    if (!eventId) continue;
    const info = eventInfo.get(eventId);
    if (!info) continue;

    const vendor = firstRelation(row.vendor);
    const service = firstRelation(row.service);
    const category = firstRelation(vendor?.category ?? null);

    const vendorName = vendor?.business_name?.trim() || "Vendor";
    const serviceName = service?.name?.trim() || null;
    const catalogueEstimate = Math.max(
      0,
      Math.round(service?.base_price ?? 0)
    );
    const pricingState = pricingByEvent.get(eventId);
    const eventPricingComplete =
      Boolean(pricingState?.active) &&
      pricingState?.active === pricingState?.published;
    const finalPriceVisible =
      info.ready &&
      eventPricingComplete &&
      row.price_published === true &&
      row.final_price != null;
    const visibleCost = finalPriceVisible
      ? Math.max(0, Math.round(row.final_price ?? 0))
      : catalogueEstimate;

    lineItems.push({
      bookingId: row.id,
      eventId,
      eventName: info.name,
      dayName: info.dayName,
      categoryName: budgetCategoryForVendorSlug(category?.slug),
      vendorName,
      serviceName,
      name: serviceName ? `${vendorName} · ${serviceName}` : vendorName,
      // Never return the privately agreed vendor payout to the client. Once the
      // final price is visible, both values converge so the service fee cannot
      // be inferred by subtracting an estimate from the published total.
      estimatedCost: visibleCost,
      displayCost: visibleCost,
      costState: finalPriceVisible ? "final" : "estimate",
      paidAmount: Math.max(0, Math.round(row.paid_amount ?? 0)),
      status: row.status ?? "INQUIRY",
      stage: bookingStage(row.status),
    });
  }

  return lineItems;
}

export type ConfirmedEvent = {
  eventId: string;
  eventName: string;
  dayName: string | null;
  finalTotal: number | null;
  locked: boolean;
};

/**
 * Elysian's published final prices the client is allowed to see. The locked
 * flag is true once the client's own event is "complete enough" (venue, guests,
 * and times set) — only then do we reveal the confirmed amount.
 */
async function getConfirmedEventPricing(
  context: EventPlanContext | null
): Promise<ConfirmedEvent[]> {
  if (!context || context.eventIds.length === 0) return [];
  const supabase = createAdminSupabaseClient();
  const { dayNameById, events, eventIds, readinessByEventId } = context;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("wedding_event_id, status, final_price, price_published")
    .in("wedding_event_id", eventIds);

  if (bookingsError) throw bookingsError;

  const pricingByEvent = new Map<
    string,
    { active: number; published: number; finalTotal: number }
  >();
  for (const b of bookings ?? []) {
    if (b.status === "CANCELLED") continue;
    const id = b.wedding_event_id as string;
    const state = pricingByEvent.get(id) ?? {
      active: 0,
      published: 0,
      finalTotal: 0,
    };
    state.active += 1;
    if (b.price_published && b.final_price != null) {
      state.published += 1;
      state.finalTotal += b.final_price as number;
    }
    pricingByEvent.set(id, state);
  }

  const out: ConfirmedEvent[] = [];
  for (const e of events) {
    const pricing = pricingByEvent.get(e.id as string);
    if (
      !pricing ||
      pricing.active === 0 ||
      pricing.published !== pricing.active ||
      pricing.finalTotal < 0
    ) {
      continue;
    }
    const ready = readinessByEventId.get(e.id)?.ready ?? false;
    out.push({
      eventId: e.id as string,
      eventName: (e.name as string) ?? "Function",
      dayName: e.wedding_day_id ? dayNameById.get(e.wedding_day_id as string) ?? null : null,
      finalTotal: ready ? pricing.finalTotal : null,
      locked: ready,
    });
  }
  return out;
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const profileId = await getClientProfileId(session.userId);
    if (!profileId) {
      return apiSuccess({ needsOnboarding: true, budget: null });
    }

    const eventPlanContext = await loadEventPlanContext(profileId);
    const [planLineItems, confirmedEvents] = await Promise.all([
      getPlanVendorLineItems(eventPlanContext),
      getConfirmedEventPricing(eventPlanContext),
    ]);
    return apiSuccess({
      needsOnboarding: false,
      // Legacy editable-budget tables are intentionally excluded from reads.
      // The planner and admin-published prices are the live source of truth.
      budget: null,
      eventPlanSpend: getEventPlanSpendSummary(eventPlanContext),
      planLineItems,
      confirmedEvents,
    });
  } catch (error) {
    console.error("GET /api/budget", error);
    return apiError("Failed to load budget", 500);
  }
}
