import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ensureWeddingDays } from "@/lib/wedding-plan.server";
import { buildDefaultCelebrationPlan } from "@/lib/wedding-plan";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

type WeddingEventRow = {
  id: string;
  wedding_day_id: string | null;
  name: string;
  event_type: string | null;
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

type EventBookingRow = {
  id: string;
  wedding_event_id: string | null;
  status: string;
  event_date: string | null;
  notes: string | null;
  total_amount: number | null;
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
        base_price?: number | null;
        max_price?: number | null;
        unit?: string | null;
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
    base_price?: number | null;
    max_price?: number | null;
    unit?: string | null;
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
            base_price: service.base_price ?? null,
            max_price: service.max_price ?? null,
            unit: service.unit ?? null,
          }
        : null,
    };
  });
}

function normalizeDayCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 3;
  return Math.min(7, Math.max(1, Math.round(value)));
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
        `id, name, date, status,
        destination:destinations(id, name, slug, country, tagline, hero_image),
        package_tier:package_tiers(name, slug)`
      )
      .eq("client_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weddingError) {
      console.error("weddings:", weddingError);
      return apiError("Failed to load wedding", 500);
    }

    if (!wedding) {
      return apiSuccess({ wedding: null, days: [] });
    }

    const { data: initialEvents, error: eventsError } = await supabase
      .from("wedding_events")
      .select(
        "id, wedding_day_id, name, event_type, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, food_preferences, menu_notes, decor_style, decor_notes, attire_notes, notes, sort_order"
      )
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true });

    if (eventsError) {
      console.error("wedding_events:", eventsError);
      return apiError("Failed to load wedding events", 500);
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
        "id, wedding_day_id, name, event_type, date, start_time, end_time, venue, guest_count, estimated_budget, food_style, food_preferences, menu_notes, decor_style, decor_notes, attire_notes, notes, sort_order"
      )
      .eq("wedding_id", wedding.id)
      .order("sort_order", { ascending: true });

    if (refreshedEventsError) {
      console.error("wedding_events reload:", refreshedEventsError);
      return apiError("Failed to load wedding plan", 500);
    }

    const eventIds = (events ?? []).map((event) => event.id);
    let bookingsByEvent = new Map<string, EventBookingRow[]>();
    let menusByEvent = new Map<string, EventMenuRow[]>();
    let menuItemsByMenu = new Map<string, EventMenuItemRow[]>();
    let logisticsByEvent = new Map<string, EventLogisticsRow>();
    let tasksByEvent = new Map<string, EventTaskRow[]>();

    if (eventIds.length > 0) {
      const [
        { data: eventBookings, error: bookingsError },
        { data: eventMenus, error: menusError },
        { data: eventLogistics, error: logisticsError },
        { data: eventTasks, error: tasksError },
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            `id, wedding_event_id, status, event_date, notes, total_amount, paid_amount,
            vendor:vendor_profiles(id, business_name, slug, category:vendor_categories(name, slug)),
            service:vendor_services(id, name, description, base_price, max_price, unit)`
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

    return apiSuccess({
      wedding,
      days: days.map((day) => ({
        ...day,
        events: (eventsByDay.get(day.id) ?? [])
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((event) => ({
            ...event,
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
            vendorSelections: (
              bookingsByEvent.get(event.id) ?? []
            ).map((booking) => ({
              id: booking.id,
              status: booking.status,
              eventDate: booking.event_date,
              notes: booking.notes,
              totalAmount: booking.total_amount,
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
                    basePrice: booking.service.base_price ?? null,
                    maxPrice: booking.service.max_price ?? null,
                    unit: booking.service.unit ?? null,
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

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const {
      coupleName,
      weddingDate,
      guestCount,
      destinationId,
      budgetTotal,
      partnerName,
      dayCount,
    } = body as Record<string, unknown>;

    const name =
      typeof coupleName === "string" && coupleName.trim()
        ? coupleName.trim()
        : typeof partnerName === "string" && partnerName.trim()
          ? partnerName.trim()
          : "Our Wedding";

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

    const budget =
      typeof budgetTotal === "number" && budgetTotal > 0
        ? Math.floor(budgetTotal)
        : 500000;

    const totalDays = normalizeDayCount(dayCount);

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
          estimated_budget: budget,
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
      await supabase
        .from("client_profiles")
        .update({
          partner_name:
            typeof partnerName === "string" ? partnerName : name,
          wedding_date: dateIso,
          estimated_budget: budget,
          ...(guests != null ? { guest_count: guests } : {}),
        })
        .eq("id", profileId);
    }

    const { data: existingWedding } = await supabase
      .from("weddings")
      .select("id")
      .eq("client_profile_id", profileId)
      .maybeSingle();

    if (existingWedding) {
      return apiError("Wedding already exists", 409);
    }

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .insert({
        client_profile_id: profileId,
        name,
        date: dateIso,
        destination_id: destId,
        status: "PLANNING",
      })
      .select("id")
      .single();

    if (weddingError || !wedding) {
      console.error("weddings insert:", weddingError);
      return apiError("Failed to create wedding", 500);
    }

    const celebrationPlan = buildDefaultCelebrationPlan(totalDays, dateIso);

    const { data: createdDays, error: createdDaysError } = await supabase
      .from("wedding_days")
      .insert(
        celebrationPlan.map((day) => ({
          wedding_id: wedding.id,
          name: day.name,
          date: day.date,
          sort_order: day.sortOrder,
        }))
      )
      .select("id, sort_order");

    if (createdDaysError || !createdDays) {
      console.error("wedding_days insert:", createdDaysError);
      return apiError("Failed to create celebration days", 500);
    }

    const dayIdBySortOrder = new Map<number, string>();
    for (const day of createdDays) {
      dayIdBySortOrder.set(day.sort_order, day.id);
    }

    const eventsToInsert = celebrationPlan.flatMap((day) =>
      day.events.map((event) => ({
        wedding_id: wedding.id,
        wedding_day_id: dayIdBySortOrder.get(day.sortOrder) ?? null,
        name: event.name,
        event_type: event.eventType,
        date: day.date,
        start_time: event.startTime,
        food_style: event.foodStyle,
        decor_style: event.decorStyle,
        sort_order: event.sortOrder,
      }))
    );

    if (eventsToInsert.length > 0) {
      const { data: createdEvents, error: eventsInsertError } = await supabase
        .from("wedding_events")
        .insert(eventsToInsert)
        .select("id, name, event_type, start_time, food_style, menu_notes, sort_order");

      if (eventsInsertError) {
        console.error("wedding_events insert:", eventsInsertError);
      } else if (createdEvents && createdEvents.length > 0) {
        const menuRows = createdEvents
          .filter((event) => event.food_style)
          .map((event) => ({
            wedding_event_id: event.id,
            name: `${event.name} Menu`,
            meal_period:
              event.start_time && event.start_time < "12:00"
                ? "Breakfast"
                : event.start_time && event.start_time < "17:00"
                  ? "Lunch"
                  : "Dinner",
            service_style: event.food_style,
            notes: event.menu_notes,
            sort_order: 0,
          }));

        if (menuRows.length > 0) {
          const { error: menuInsertError } = await supabase
            .from("wedding_event_menus")
            .insert(menuRows);
          if (menuInsertError) {
            console.error("wedding_event_menus insert:", menuInsertError);
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
        }
      }
    }

    const { error: budgetError } = await supabase.from("budgets").insert({
      client_profile_id: profileId,
      name: "My Wedding Budget",
      total_budget: budget,
    });

    if (budgetError) {
      console.error("budgets insert:", budgetError);
    }

    const { error: guestListError } = await supabase.from("guest_lists").insert({
      client_profile_id: profileId,
      name: "Main Guest List",
    });

    if (guestListError) {
      console.error("guest_lists insert:", guestListError);
    }

    return apiSuccess({ weddingId: wedding.id }, 201);
  } catch (error) {
    console.error("POST /api/wedding", error);
    return apiError("Internal server error", 500);
  }
}
