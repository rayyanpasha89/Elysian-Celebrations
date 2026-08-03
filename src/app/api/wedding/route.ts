import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ensureWeddingDays } from "@/lib/wedding-plan.server";
import { buildDefaultCelebrationPlan } from "@/lib/wedding-plan";
import {
  buildDefaultRequirementsForEvent,
  buildCelebrationPlanFromEventDefinition,
  buildEventDefinitionPayload,
  extractEventDefinitionDays,
  hasExplicitEventDefinition,
  mealPeriodForTimeBlock,
  normalizeDayCount as normalizeEventDayCount,
  normalizeTimeBlockKey,
  type EventRequirementCategoryKey,
} from "@/lib/event-platform";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { eventReadinessPercent } from "@/lib/event-readiness";

type WeddingEventRow = {
  id: string;
  wedding_day_id: string | null;
  name: string;
  event_type: string | null;
  time_block: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  guest_count: number | null;
  estimated_budget: number | null;
  food_style: string | null;
  food_preferences: string[] | null;
  menu_notes: string | null;
  decor_style: string | null;
  decor_notes: string | null;
  attire_notes: string | null;
  notes: string | null;
  requirement_payload: Record<string, unknown> | null;
  sort_order: number;
};

type EventMenuItemRow = {
  id: string;
  menu_id: string;
  name: string;
  course: string | null;
  dietary_tags: string[] | null;
  notes: string | null;
  sort_order: number;
};

type EventMenuRow = {
  id: string;
  wedding_event_id: string;
  name: string;
  meal_period: string | null;
  service_style: string | null;
  notes: string | null;
  sort_order: number;
};

type EventLogisticsRow = {
  id: string;
  wedding_event_id: string;
  guest_arrival_time: string | null;
  vendor_load_in_time: string | null;
  family_call_time: string | null;
  transport_notes: string | null;
  rooming_notes: string | null;
  weather_plan: string | null;
  ceremony_notes: string | null;
};

type EventTaskRow = {
  id: string;
  wedding_event_id: string;
  title: string;
  owner: string | null;
  status: string;
  due_date: string | null;
  sort_order: number;
};

type EventRequirementRow = {
  id: string;
  wedding_event_id: string;
  category: string;
  title: string;
  status: string;
  priority: string;
  vendor_profile_id: string | null;
  vendor_service_id: string | null;
  payload: Record<string, unknown> | null;
  notes: string | null;
  sort_order: number;
};

type EventBookingRow = {
  id: string;
  wedding_event_id: string | null;
  status: string;
  event_date: string | null;
  notes: string | null;
  total_amount: number | null;
  final_price: number | null;
  price_published: boolean | null;
  paid_amount: number | null;
  vendor:
    | {
        id: string;
        business_name?: string;
        slug?: string;
        category?: { name?: string; slug?: string } | null;
      }
    | null;
      service:
    | {
        id: string;
        name?: string;
        description?: string | null;
        service_scope?: string | null;
        base_price?: number | null;
        max_price?: number | null;
        unit?: string | null;
        event_type_fit?: string[] | null;
        inclusions?: string[] | null;
        deliverables?: string[] | null;
        add_ons?: string[] | null;
        items?: {
          id: string;
          item_type: string;
          name: string;
          description: string | null;
          dietary_tags: string[] | null;
          sort_order: number | null;
        }[] | null;
      }
    | null;
};

type EventBookingRelation<T> = T | T[] | null;

type RawEventBookingRow = Omit<EventBookingRow, "vendor" | "service"> & {
  vendor: EventBookingRelation<{
    id: string;
    business_name?: string | null;
    slug?: string | null;
    category?: EventBookingRelation<{
      name?: string | null;
      slug?: string | null;
    }>;
  }>;
  service: EventBookingRelation<{
    id: string;
    name?: string | null;
    description?: string | null;
    service_scope?: string | null;
    base_price?: number | null;
    max_price?: number | null;
    unit?: string | null;
    event_type_fit?: string[] | null;
    inclusions?: string[] | null;
    deliverables?: string[] | null;
    add_ons?: string[] | null;
    items?: {
      id: string;
      item_type: string;
      name: string;
      description: string | null;
      dietary_tags: string[] | null;
      sort_order: number | null;
    }[] | null;
  }>;
};

function firstRelation<T>(value: EventBookingRelation<T> | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeEventBookingRows(rows: RawEventBookingRow[]) {
  return rows.map((row): EventBookingRow => {
    const vendor = firstRelation(row.vendor);
    const category = firstRelation(vendor?.category);
    const service = firstRelation(row.service);

    return {
      ...row,
      vendor: vendor
        ? {
            id: vendor.id,
            business_name: vendor.business_name ?? undefined,
            slug: vendor.slug ?? undefined,
            category: category
              ? {
                  name: category.name ?? undefined,
                  slug: category.slug ?? undefined,
                }
              : null,
          }
        : null,
      service: service
        ? {
            id: service.id,
            name: service.name ?? undefined,
            description: service.description ?? null,
            service_scope: service.service_scope ?? null,
            base_price: service.base_price ?? null,
            max_price: service.max_price ?? null,
            unit: service.unit ?? null,
            event_type_fit: service.event_type_fit ?? [],
            inclusions: service.inclusions ?? [],
            deliverables: service.deliverables ?? [],
            add_ons: service.add_ons ?? [],
            items: (service.items ?? [])
              .slice()
              .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)),
          }
        : null,
    };
  });
}

function mapEventBookings(rows: EventBookingRow[]) {
  const bookingsByEvent = new Map<string, EventBookingRow[]>();

  for (const row of rows) {
    if (!row.wedding_event_id) continue;
    const list = bookingsByEvent.get(row.wedding_event_id) ?? [];
    list.push(row);
    bookingsByEvent.set(row.wedding_event_id, list);
  }

  return bookingsByEvent;
}

function groupByEvent<T extends { wedding_event_id: string }>(rows: T[]) {
  const byEvent = new Map<string, T[]>();

  for (const row of rows) {
    const list = byEvent.get(row.wedding_event_id) ?? [];
    list.push(row);
    byEvent.set(row.wedding_event_id, list);
  }

  return byEvent;
}

function groupMenuItems(rows: EventMenuItemRow[]) {
  const byMenu = new Map<string, EventMenuItemRow[]>();

  for (const row of rows) {
    const list = byMenu.get(row.menu_id) ?? [];
    list.push(row);
    byMenu.set(row.menu_id, list);
  }

  return byMenu;
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (profileError) {
      console.error("client_profiles:", profileError);
      return apiError("Failed to load profile", 500);
    }

    if (!profile?.id) {
      return apiSuccess({ wedding: null, days: [] });
    }

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select(
        `id, name, date, status, event_type, custom_event_type, event_platform_version, definition_payload,
        destination:destinations(id, name, slug, country, tagline, hero_image),
        package_tier:package_tiers(name, slug)`
      )
      .eq("client_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weddingError) {
      console.error("weddings:", weddingError);
      return apiError("Failed to load event plan", 500);
    }

    if (!wedding) {
      return apiSuccess({ wedding: null, days: [] });
    }

    const { data: initialEvents, error: eventsError } = await supabase
      .from("wedding_events")
      .select(
        "id, wedding_day_id, name, event_type, time_block, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, food_preferences, menu_notes, decor_style, decor_notes, attire_notes, notes, requirement_payload, sort_order"
      )
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true });

    if (eventsError) {
      console.error("wedding_events:", eventsError);
      return apiError("Failed to load event blocks", 500);
    }

    const days = await ensureWeddingDays(
      supabase,
      { id: wedding.id, date: wedding.date },
      (initialEvents ?? []).map((event) => ({
        id: event.id,
        date: event.date,
        wedding_day_id: event.wedding_day_id,
      }))
    );

    const { data: events, error: refreshedEventsError } = await supabase
      .from("wedding_events")
      .select(
        "id, wedding_day_id, name, event_type, time_block, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, food_preferences, menu_notes, decor_style, decor_notes, attire_notes, notes, requirement_payload, sort_order"
      )
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true });

    if (refreshedEventsError) {
      console.error("wedding_events reload:", refreshedEventsError);
      return apiError("Failed to load event plan", 500);
    }

    const eventIds = (events ?? []).map((event) => event.id);
    let bookingsByEvent = new Map<string, EventBookingRow[]>();
    let menusByEvent = new Map<string, EventMenuRow[]>();
    let menuItemsByMenu = new Map<string, EventMenuItemRow[]>();
    let logisticsByEvent = new Map<string, EventLogisticsRow>();
    let tasksByEvent = new Map<string, EventTaskRow[]>();
    let requirementsByEvent = new Map<string, EventRequirementRow[]>();

    if (eventIds.length > 0) {
      const [
        { data: eventBookings, error: bookingsError },
        { data: eventMenus, error: menusError },
        { data: eventLogistics, error: logisticsError },
        { data: eventTasks, error: tasksError },
        { data: eventRequirements, error: requirementsError },
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            `id, wedding_event_id, status, event_date, notes, total_amount, final_price, price_published, paid_amount,
            vendor:vendor_profiles(id, business_name, slug, category:vendor_categories(name, slug)),
            service:vendor_services(id, name, description, service_scope, base_price, max_price, unit, event_type_fit, inclusions, deliverables, add_ons, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order))`
          )
          .in("wedding_event_id", eventIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("wedding_event_menus")
          .select("id, wedding_event_id, name, meal_period, service_style, notes, sort_order")
          .in("wedding_event_id", eventIds)
          .order("sort_order", { ascending: true }),
        supabase
          .from("wedding_event_logistics")
          .select(
            "id, wedding_event_id, guest_arrival_time, vendor_load_in_time, family_call_time, transport_notes, rooming_notes, weather_plan, ceremony_notes"
          )
          .in("wedding_event_id", eventIds),
        supabase
          .from("wedding_event_tasks")
          .select("id, wedding_event_id, title, owner, status, due_date, sort_order")
          .in("wedding_event_id", eventIds)
          .order("sort_order", { ascending: true }),
        supabase
          .from("wedding_event_requirements")
          .select(
            "id, wedding_event_id, category, title, status, priority, vendor_profile_id, vendor_service_id, payload, notes, sort_order"
          )
          .in("wedding_event_id", eventIds)
          .order("sort_order", { ascending: true }),
      ]);

      if (bookingsError) {
        console.error("bookings:", bookingsError);
        return apiError("Failed to load selected vendors", 500);
      }
      if (menusError) {
        console.error("wedding_event_menus:", menusError);
        return apiError("Failed to load event menus", 500);
      }
      if (logisticsError) {
        console.error("wedding_event_logistics:", logisticsError);
        return apiError("Failed to load event logistics", 500);
      }
      if (tasksError) {
        console.error("wedding_event_tasks:", tasksError);
        return apiError("Failed to load event tasks", 500);
      }
      if (requirementsError) {
        console.error("wedding_event_requirements:", requirementsError);
        return apiError("Failed to load event requirements", 500);
      }

      bookingsByEvent = mapEventBookings(
        normalizeEventBookingRows((eventBookings ?? []) as RawEventBookingRow[])
      );
      menusByEvent = groupByEvent((eventMenus ?? []) as EventMenuRow[]);
      logisticsByEvent = new Map(
        ((eventLogistics ?? []) as EventLogisticsRow[]).map((row) => [
          row.wedding_event_id,
          row,
        ])
      );
      tasksByEvent = groupByEvent((eventTasks ?? []) as EventTaskRow[]);
      requirementsByEvent = groupByEvent(
        (eventRequirements ?? []) as EventRequirementRow[]
      );

      const menuIds = ((eventMenus ?? []) as EventMenuRow[]).map((menu) => menu.id);
      if (menuIds.length > 0) {
        const { data: menuItems, error: menuItemsError } = await supabase
          .from("wedding_event_menu_items")
          .select("id, menu_id, name, course, dietary_tags, notes, sort_order")
          .in("menu_id", menuIds)
          .order("sort_order", { ascending: true });

        if (menuItemsError) {
          console.error("wedding_event_menu_items:", menuItemsError);
          return apiError("Failed to load menu items", 500);
        }

        menuItemsByMenu = groupMenuItems((menuItems ?? []) as EventMenuItemRow[]);
      }
    }

    const eventsByDay = new Map<string, WeddingEventRow[]>();
    for (const event of (events ?? []) as WeddingEventRow[]) {
      const dayId = event.wedding_day_id;
      if (!dayId) continue;
      const list = eventsByDay.get(dayId) ?? [];
      list.push(event);
      eventsByDay.set(dayId, list);
    }

    const eventReadinessById = new Map<string, number>();
    const clientVisiblePricingEvents = new Set<string>();
    for (const event of (events ?? []) as WeddingEventRow[]) {
      const eventBookings = (bookingsByEvent.get(event.id) ?? []).filter(
        (booking) => booking.status !== "CANCELLED"
      );
      const readiness = eventReadinessPercent({
        ...event,
        requirements: requirementsByEvent.get(event.id) ?? [],
        menus: menusByEvent.get(event.id) ?? [],
        logistics: logisticsByEvent.get(event.id) ?? null,
        tasks: tasksByEvent.get(event.id) ?? [],
        bookings: eventBookings.map((booking) => ({
          status: booking.status,
          total_amount: booking.total_amount,
          service: booking.service
            ? { base_price: booking.service.base_price ?? null }
            : null,
          })),
      });
      eventReadinessById.set(event.id, readiness);

      if (
        readiness >= 100 &&
        eventBookings.length > 0 &&
        eventBookings.every(
          (booking) =>
            booking.price_published === true && booking.final_price != null
        )
      ) {
        clientVisiblePricingEvents.add(event.id);
      }
    }

    return apiSuccess({
      wedding,
      days: days.map((day) => ({
        ...day,
        events: (eventsByDay.get(day.id) ?? [])
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((event) => ({
            ...event,
            readinessPercent: eventReadinessById.get(event.id) ?? 0,
            menus: (menusByEvent.get(event.id) ?? [])
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((menu) => ({
                id: menu.id,
                name: menu.name,
                mealPeriod: menu.meal_period,
                serviceStyle: menu.service_style,
                notes: menu.notes,
                sortOrder: menu.sort_order,
                items: (menuItemsByMenu.get(menu.id) ?? [])
                  .sort((left, right) => left.sort_order - right.sort_order)
                  .map((item) => ({
                    id: item.id,
                    name: item.name,
                    course: item.course,
                    dietaryTags: item.dietary_tags ?? [],
                    notes: item.notes,
                    sortOrder: item.sort_order,
                  })),
              })),
            logistics: logisticsByEvent.get(event.id)
              ? {
                  id: logisticsByEvent.get(event.id)!.id,
                  guestArrivalTime:
                    logisticsByEvent.get(event.id)!.guest_arrival_time,
                  vendorLoadInTime:
                    logisticsByEvent.get(event.id)!.vendor_load_in_time,
                  familyCallTime:
                    logisticsByEvent.get(event.id)!.family_call_time,
                  transportNotes:
                    logisticsByEvent.get(event.id)!.transport_notes,
                  roomingNotes: logisticsByEvent.get(event.id)!.rooming_notes,
                  weatherPlan: logisticsByEvent.get(event.id)!.weather_plan,
                  ceremonyNotes:
                    logisticsByEvent.get(event.id)!.ceremony_notes,
                }
              : null,
            tasks: (tasksByEvent.get(event.id) ?? [])
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((task) => ({
                id: task.id,
                title: task.title,
                owner: task.owner,
                status: task.status,
                dueDate: task.due_date,
                sortOrder: task.sort_order,
              })),
            requirements: (requirementsByEvent.get(event.id) ?? [])
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((requirement) => ({
                id: requirement.id,
                category: requirement.category,
                title: requirement.title,
                status: requirement.status,
                priority: requirement.priority,
                vendorProfileId: requirement.vendor_profile_id,
                vendorServiceId: requirement.vendor_service_id,
                payload: requirement.payload ?? {},
                notes: requirement.notes,
                sortOrder: requirement.sort_order,
              })),
            vendorSelections: (bookingsByEvent.get(event.id) ?? [])
              .filter((booking) => booking.status !== "CANCELLED")
              .map((booking) => ({
              id: booking.id,
              status: booking.status,
              eventDate: booking.event_date,
              notes: booking.notes,
              totalAmount:
                clientVisiblePricingEvents.has(event.id) &&
                booking.price_published === true
                  ? booking.final_price
                  : null,
              paidAmount: booking.paid_amount,
              vendor: booking.vendor
                ? {
                    id: booking.vendor.id,
                    businessName: booking.vendor.business_name ?? "Vendor",
                    slug: booking.vendor.slug ?? "",
                    categoryName: booking.vendor.category?.name ?? "",
                    categorySlug: booking.vendor.category?.slug ?? "",
                  }
                : null,
              service: booking.service
                ? {
                    id: booking.service.id,
                    name: booking.service.name ?? "Service",
                    description: booking.service.description ?? null,
                    serviceScope: booking.service.service_scope ?? null,
                    basePrice: booking.service.base_price ?? null,
                    maxPrice: booking.service.max_price ?? null,
                    unit: booking.service.unit ?? null,
                    eventTypeFit: booking.service.event_type_fit ?? [],
                    inclusions: booking.service.inclusions ?? [],
                    deliverables: booking.service.deliverables ?? [],
                    addOns: booking.service.add_ons ?? [],
                    items: (booking.service.items ?? []).map((item) => ({
                      id: item.id,
                      itemType: item.item_type,
                      name: item.name,
                      description: item.description,
                      dietaryTags: item.dietary_tags ?? [],
                      sortOrder: item.sort_order,
                    })),
                  }
                : null,
              })),
          })),
      })),
    });
  } catch (error) {
    console.error("GET /api/wedding", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (profileError) {
      console.error("client_profiles:", profileError);
      return apiError("Failed to load profile", 500);
    }

    if (!profile?.id) {
      return apiError("Event plan not found", 404);
    }

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("id, name")
      .eq("client_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weddingError) {
      console.error("weddings:", weddingError);
      return apiError("Failed to load event plan", 500);
    }

    if (!wedding) {
      return apiError("Event plan not found", 404);
    }

    const { data: events, error: eventsError } = await supabase
      .from("wedding_events")
      .select("id")
      .eq("wedding_id", wedding.id);

    if (eventsError) {
      console.error("wedding_events:", eventsError);
      return apiError("Failed to load event plan dependencies", 500);
    }

    const eventIds = (events ?? [])
      .map((event) => event.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (eventIds.length > 0) {
      const { error: draftBookingsError } = await supabase
        .from("bookings")
        .delete()
        .in("wedding_event_id", eventIds)
        .in("status", ["INQUIRY", "QUOTE_SENT"]);

      if (draftBookingsError) {
        console.error("bookings draft delete:", draftBookingsError);
        return apiError("Failed to remove draft vendor inquiries", 500);
      }

      const { error: bookingUnlinkError } = await supabase
        .from("bookings")
        .update({ wedding_event_id: null })
        .in("wedding_event_id", eventIds);

      if (bookingUnlinkError) {
        console.error("bookings unlink:", bookingUnlinkError);
        return apiError("Failed to unlink confirmed bookings", 500);
      }

      const { error: budgetUnlinkError } = await supabase
        .from("budget_items")
        .update({ wedding_event_id: null })
        .in("wedding_event_id", eventIds);

      if (budgetUnlinkError) {
        console.error("budget_items unlink:", budgetUnlinkError);
        return apiError("Failed to unlink budget items", 500);
      }
    }

    const { error: deleteError } = await supabase
      .from("weddings")
      .delete()
      .eq("id", wedding.id)
      .eq("client_profile_id", profile.id);

    if (deleteError) {
      console.error("weddings delete:", deleteError);
      return apiError("Failed to delete event plan", 500);
    }

    return apiSuccess({
      ok: true,
      deletedPlans: [{ id: wedding.id, name: wedding.name }],
    });
  } catch (error) {
    console.error("DELETE /api/wedding", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  const supabase = createAdminSupabaseClient();
  let createdWeddingId: string | null = null;

  try {
    const body = await request.json();
    const {
      coupleName,
      weddingDate,
      guestCount,
      destinationId,
      partnerName,
      dayCount,
    } = body as Record<string, unknown>;

    const name =
      typeof coupleName === "string" && coupleName.trim()
        ? coupleName.trim()
        : typeof partnerName === "string" && partnerName.trim()
          ? partnerName.trim()
          : "Untitled Event";

    const dateIso =
      typeof weddingDate === "string" && weddingDate
        ? new Date(weddingDate).toISOString()
        : null;

    const guests =
      typeof guestCount === "number" && guestCount > 0
        ? Math.floor(guestCount)
        : null;

    const destId =
      typeof destinationId === "string" && destinationId
        ? destinationId
        : null;

    const totalDays = normalizeEventDayCount(dayCount);
    const eventDefinitionInput =
      body && typeof body === "object"
        ? ((body.eventDefinition ?? body.definitionPayload) as unknown)
        : null;
    const eventDefinitionObject =
      eventDefinitionInput && typeof eventDefinitionInput === "object"
        ? (eventDefinitionInput as Record<string, unknown>)
        : {};
    const eventDefinition = buildEventDefinitionPayload({
      eventName: name,
      eventType: body.eventType ?? eventDefinitionObject.eventType,
      customEventType: body.customEventType ?? eventDefinitionObject.customEventType,
      primaryVenue: body.primaryVenue ?? eventDefinitionObject.primaryVenue,
      eventDate: dateIso,
      dayCount: totalDays,
      days: extractEventDefinitionDays(body as Record<string, unknown>),
    });
    const useLayeredDefinition = hasExplicitEventDefinition(
      body as Record<string, unknown>
    );

    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(session.userId);
      const primaryEmail =
        clerkUser.emailAddresses.find(
          (entry) => entry.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        null;
      const displayName =
        [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        primaryEmail?.split("@")[0] ||
        "User";

      await supabase.from("users").upsert(
        {
          id: session.userId,
          email: primaryEmail,
          name: displayName,
          role: "CLIENT",
        },
        { onConflict: "id" }
      );
    } catch (error) {
      console.error("user upsert:", error);
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (profileError) {
      console.error("client_profiles:", profileError);
      return apiError("Failed to load profile", 500);
    }

    let profileId = existingProfile?.id ?? null;

    if (!profileId) {
      const { data: insertedProfile, error: insertProfileError } = await supabase
        .from("client_profiles")
        .insert({
          user_id: session.userId,
          partner_name:
            typeof partnerName === "string" ? partnerName : name,
          wedding_date: dateIso,
          estimated_budget: null,
          guest_count: guests,
        })
        .select("id")
        .single();

      if (insertProfileError || !insertedProfile) {
        console.error("client_profiles insert:", insertProfileError);
        return apiError("Failed to create client profile", 500);
      }

      profileId = insertedProfile.id;
    } else {
      const { error: updateProfileError } = await supabase
        .from("client_profiles")
        .update({
          partner_name:
            typeof partnerName === "string" ? partnerName : name,
          wedding_date: dateIso,
          estimated_budget: null,
          ...(guests != null ? { guest_count: guests } : {}),
        })
        .eq("id", profileId);

      if (updateProfileError) {
        console.error("client_profiles update:", updateProfileError);
        return apiError("Failed to update client profile", 500);
      }
    }

    const { data: existingWedding, error: existingWeddingError } = await supabase
      .from("weddings")
      .select("id")
      .eq("client_profile_id", profileId)
      .limit(1)
      .maybeSingle();

    if (existingWeddingError) {
      console.error("weddings lookup:", existingWeddingError);
      return apiError("Failed to check existing event plans", 500);
    }

    if (existingWedding) {
      return apiError("Event plan already exists", 409);
    }

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .insert({
        client_profile_id: profileId,
        name,
        date: dateIso,
        event_type: eventDefinition.eventType,
        custom_event_type: eventDefinition.customEventType,
        event_platform_version: eventDefinition.version,
        definition_payload: eventDefinition,
        destination_id: destId,
        status: "PLANNING",
      })
      .select("id")
      .single();

    if (weddingError?.code === "23505") {
      return apiError("Event plan already exists", 409);
    }

    if (weddingError || !wedding) {
      console.error("weddings insert:", weddingError);
      return apiError("Failed to create event plan", 500);
    }
    createdWeddingId = wedding.id;

    const celebrationPlan = useLayeredDefinition
      ? buildCelebrationPlanFromEventDefinition(eventDefinition).map((day) => ({
          ...day,
          events: day.events.map((event) => ({
            ...event,
            foodStyle: null,
            decorStyle: null,
          })),
        }))
      : buildDefaultCelebrationPlan(eventDefinition.dayCount, dateIso).map((day) => ({
          name: day.name,
          date: day.date,
          sortOrder: day.sortOrder,
          notes: null,
          events: day.events.map((event) => ({
            ...event,
            endTime: null,
            timeBlock: null,
            venue: null,
            notes: null,
          })),
        }));

    const { data: createdDays, error: createdDaysError } = await supabase
      .from("wedding_days")
      .insert(
        celebrationPlan.map((day) => ({
          wedding_id: wedding.id,
          name: day.name,
          date: day.date,
          notes: day.notes,
          sort_order: day.sortOrder,
        }))
      )
      .select("id, sort_order");

    if (createdDaysError || !createdDays) {
      console.error("wedding_days insert:", createdDaysError);
      throw new Error("Failed to create celebration days");
    }

    if (createdDays.length !== celebrationPlan.length) {
      throw new Error("Celebration day creation was incomplete");
    }

    const dayIdBySortOrder = new Map<number, string>();
    for (const day of createdDays) {
      dayIdBySortOrder.set(day.sort_order, day.id);
    }

    // Map each planned event to the needs the client picked for it during the
    // layered definition. Key is `${dayId}:${eventSortOrder}` so it survives the
    // round-trip through the insert. Blocks with no explicit selection are absent
    // here and fall back to the full default requirement set.
    const requirementCategoriesByKey = new Map<
      string,
      EventRequirementCategoryKey[]
    >();
    for (const day of celebrationPlan) {
      const dayId = dayIdBySortOrder.get(day.sortOrder);
      if (!dayId) continue;
      for (const event of day.events) {
        const categories = (
          event as { requirementCategories?: EventRequirementCategoryKey[] }
        ).requirementCategories;
        if (Array.isArray(categories)) {
          requirementCategoriesByKey.set(`${dayId}:${event.sortOrder}`, categories);
        }
      }
    }

    const eventsToInsert = celebrationPlan.flatMap((day) =>
      day.events.map((event) => ({
        wedding_id: wedding.id,
        wedding_day_id: dayIdBySortOrder.get(day.sortOrder) ?? null,
        name: event.name,
        event_type: event.eventType,
        time_block: event.timeBlock,
        date: day.date,
        start_time: event.startTime,
        end_time: event.endTime,
        venue: event.venue ?? null,
        // Per-block guest count from the layered definition; falls back to the
        // event-level guest estimate when a block didn't set its own.
        guest_count:
          (event as { guestCount?: number | null }).guestCount ?? guests ?? null,
        food_style: event.foodStyle,
        decor_style: event.decorStyle,
        notes: event.notes,
        sort_order: event.sortOrder,
      }))
    );

    if (eventsToInsert.length > 0) {
      const { data: createdEvents, error: eventsInsertError } = await supabase
        .from("wedding_events")
        .insert(eventsToInsert)
        .select("id, wedding_day_id, name, event_type, time_block, start_time, end_time, food_style, menu_notes, sort_order");

      if (eventsInsertError) {
        console.error("wedding_events insert:", eventsInsertError);
        throw new Error("Failed to create event functions");
      }

      if (!createdEvents || createdEvents.length !== eventsToInsert.length) {
        throw new Error("Event function creation was incomplete");
      }

      if (createdEvents.length > 0) {
        const menuRows = createdEvents
          .filter((event) => {
            // Only seed a food & beverage plan when this block actually wants
            // food. For the layered definition we honor the client's pick; for
            // legacy plans we keep the old "has a food style" behavior.
            if (useLayeredDefinition) {
              const categories = requirementCategoriesByKey.get(
                `${event.wedding_day_id}:${event.sort_order}`
              );
              return categories ? categories.includes("food") : true;
            }
            return Boolean(event.food_style);
          })
          .map((event) => ({
            wedding_event_id: event.id,
            name: useLayeredDefinition
              ? `${event.name} Food and beverage plan`
              : `${event.name} Menu`,
            meal_period: mealPeriodForTimeBlock(
              normalizeTimeBlockKey(event.time_block),
              event.start_time
            ),
            service_style: event.food_style ?? null,
            notes:
              event.menu_notes ??
              "Use this starter menu to define drinks, pre-meal stations, mains, post-meal stations, live counters, and custom food requirements.",
            sort_order: 0,
          }));

        if (menuRows.length > 0) {
          const { error: menuInsertError } = await supabase
            .from("wedding_event_menus")
            .insert(menuRows);
          if (menuInsertError) {
            console.error("wedding_event_menus insert:", menuInsertError);
            throw new Error("Failed to create food plans");
          }
        }

        const { error: taskInsertError } = await supabase
          .from("wedding_event_tasks")
          .insert(
            createdEvents.map((event) => ({
              wedding_event_id: event.id,
              title: "Confirm final run of show",
              owner: "Planner",
              status: "OPEN",
              sort_order: 0,
            }))
          );
        if (taskInsertError) {
          console.error("wedding_event_tasks insert:", taskInsertError);
          throw new Error("Failed to create event tasks");
        }

        const requirementRows = createdEvents.flatMap((event) => {
          const key = `${event.wedding_day_id}:${event.sort_order}`;
          const hasExplicitNeeds = requirementCategoriesByKey.has(key);
          const selectedNeeds = requirementCategoriesByKey.get(key) ?? [];

          // Layered definition with an empty selection means the client wants no
          // services for this block — seed nothing so the planner stays clean.
          if (hasExplicitNeeds && selectedNeeds.length === 0) {
            return [];
          }

          return buildDefaultRequirementsForEvent({
            eventName: event.name,
            timeBlock: normalizeTimeBlockKey(event.time_block),
            startTime: event.start_time,
            categories: hasExplicitNeeds ? selectedNeeds : undefined,
          }).map((requirement) => ({
            wedding_event_id: event.id,
            category: requirement.category,
            title: requirement.title,
            status: requirement.status,
            priority: requirement.priority,
            payload: requirement.payload,
            notes: requirement.notes,
            sort_order: requirement.sortOrder,
          }));
        });

        if (requirementRows.length > 0) {
          const { error: requirementsInsertError } = await supabase
            .from("wedding_event_requirements")
            .insert(requirementRows);
          if (requirementsInsertError) {
            console.error(
              "wedding_event_requirements insert:",
              requirementsInsertError
            );
            throw new Error("Failed to create event requirements");
          }
        }
      }
    }

    const { data: existingGuestList, error: guestListLookupError } = await supabase
      .from("guest_lists")
      .select("id")
      .eq("client_profile_id", profileId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (guestListLookupError) {
      console.error("guest_lists lookup:", guestListLookupError);
      throw new Error("Failed to resolve guest list");
    }

    if (!existingGuestList?.id) {
      const { data: createdGuestList, error: guestListError } = await supabase
        .from("guest_lists")
        .insert({
          client_profile_id: profileId,
          name: "Main Guest List",
        })
        .select("id")
        .single();

      if (guestListError || !createdGuestList) {
        console.error("guest_lists insert:", guestListError);
        throw new Error("Failed to create guest list");
      }
    }
    return apiSuccess({ weddingId: wedding.id }, 201);
  } catch (error) {
    console.error("POST /api/wedding", error);

    // PostgREST calls are not transactional. Until this creation flow moves to
    // a database RPC, remove every row created by this request so a retry can
    // never hit the existing-plan guard with a half-built structure.
    let rolledBack = true;
    if (createdWeddingId) {
      const { error: rollbackWeddingError } = await supabase
        .from("weddings")
        .delete()
        .eq("id", createdWeddingId);
      if (rollbackWeddingError) {
        console.error("wedding rollback:", rollbackWeddingError);
        rolledBack = false;
      }
    }

    // Only claim the cleanup happened when it actually did. If the rollback
    // delete failed the wedding row survives, and the next create attempt will
    // hit the "Event plan already exists" guard — telling the user nothing was
    // kept would send them into an unexplainable 409.
    return apiError(
      rolledBack
        ? "Could not create the full event structure. No partial plan was kept."
        : "Could not create the full event structure, and the incomplete plan could not be cleaned up automatically. Please contact support before trying again.",
      500
    );
  }
}
