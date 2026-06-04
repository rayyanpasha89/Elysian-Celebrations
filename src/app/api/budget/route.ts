import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  BUDGET_CATEGORY_BLUEPRINTS,
  budgetColorForCategory,
  recommendedAllocation,
} from "@/lib/budget-blueprint";

type BudgetPayload = {
  budgetName: string;
  totalBudget: number;
  categories: {
    id: string;
    name: string;
    allocated: number;
    sortOrder: number;
    color: string;
    items: {
      id: string;
      eventId: string | null;
      name: string;
      estimatedCost: number;
      actualCost: number | null;
      quantity: number;
      isPaid: boolean;
      notes: string;
      sortOrder: number;
    }[];
  }[];
};

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
};

type EventPlanSpendSummary = {
  weddingName: string;
  totalEstimated: number;
  eventCount: number;
  days: EventPlanSpendDay[];
};

async function getEventPlanSpendSummary(
  profileId: string
): Promise<EventPlanSpendSummary | null> {
  const supabase = createAdminSupabaseClient();

  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id, name")
    .eq("client_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weddingError) {
    console.error("getEventPlanSpendSummary wedding:", weddingError);
    return null;
  }

  if (!wedding) {
    return null;
  }

  const [{ data: dayRows, error: daysError }, { data: eventRows, error: eventsError }] =
    await Promise.all([
      supabase
        .from("wedding_days")
        .select("id, name, date, sort_order")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("wedding_events")
        .select(
          "id, wedding_day_id, name, event_type, date, start_time, estimated_budget, sort_order"
        )
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
    ]);

  if (daysError || eventsError) {
    console.error("getEventPlanSpendSummary days/events:", daysError ?? eventsError);
    return null;
  }

  const days = dayRows ?? [];
  const events = eventRows ?? [];

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
    const eventSummary: EventPlanSpendEvent = {
      id: event.id,
      name: event.name,
      eventType: event.event_type,
      date: event.date,
      startTime: event.start_time,
      estimatedSpend: amount,
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

async function getAllowedWeddingEventIds(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id")
    .eq("client_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weddingError) {
    throw weddingError;
  }

  if (!wedding) {
    return new Set<string>();
  }

  const { data: events, error: eventError } = await supabase
    .from("wedding_events")
    .select("id")
    .eq("wedding_id", wedding.id);

  if (eventError) {
    throw eventError;
  }

  return new Set((events ?? []).map((event) => event.id));
}

async function getOrCreateBudget(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error } = await supabase
    .from("budgets")
    .select("id, name, total_budget")
    .eq("client_profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertErr } = await supabase
    .from("budgets")
    .insert({
      client_profile_id: profileId,
      name: "Event Investment Plan",
      total_budget: 2500000,
    })
    .select("id, name, total_budget")
    .single();

  if (insertErr || !created) {
    throw insertErr ?? new Error("Could not create budget");
  }

  return created;
}

async function ensureDefaultCategories(budgetId: string, totalBudget: number) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error } = await supabase
    .from("budget_categories")
    .select("id")
    .eq("budget_id", budgetId)
    .limit(1);

  if (error) {
    throw error;
  }

  if ((existing ?? []).length > 0) {
    return;
  }

  const { error: insertErr } = await supabase.from("budget_categories").insert(
    BUDGET_CATEGORY_BLUEPRINTS.map((category, index) => ({
      budget_id: budgetId,
      name: category.name,
      allocated: recommendedAllocation(category.name, totalBudget),
      sort_order: index,
    }))
  );

  if (insertErr) {
    throw insertErr;
  }
}

async function loadBudgetPayload(profileId: string): Promise<BudgetPayload> {
  const supabase = createAdminSupabaseClient();
  const budget = await getOrCreateBudget(profileId);
  await ensureDefaultCategories(budget.id, budget.total_budget);

  const { data: categories, error: categoryErr } = await supabase
    .from("budget_categories")
    .select("id, name, allocated, sort_order")
    .eq("budget_id", budget.id)
    .order("sort_order", { ascending: true });

  if (categoryErr) {
    throw categoryErr;
  }

  const categoryIds = (categories ?? []).map((category) => category.id);

  let items:
    | {
        id: string;
        budget_category_id: string;
        wedding_event_id: string | null;
        name: string;
        estimated_cost: number;
        actual_cost: number | null;
        quantity: number;
        is_paid: boolean;
        notes: string | null;
        sort_order: number;
      }[]
    | null = null;

  if (categoryIds.length > 0) {
    const { data: itemRows, error: itemErr } = await supabase
      .from("budget_items")
      .select(
        "id, budget_category_id, wedding_event_id, name, estimated_cost, actual_cost, quantity, is_paid, notes, sort_order"
      )
      .in("budget_category_id", categoryIds)
      .order("sort_order", { ascending: true });

    if (itemErr) {
      throw itemErr;
    }

    items = itemRows ?? [];
  }

  return {
    budgetName: budget.name,
    totalBudget: budget.total_budget,
    categories: (categories ?? []).map((category, index) => ({
      id: category.id,
      name: category.name,
      allocated: category.allocated ?? 0,
      sortOrder: category.sort_order ?? index,
      color: budgetColorForCategory(category.name),
      items: (items ?? [])
        .filter((item) => item.budget_category_id === category.id)
        .map((item, itemIndex) => ({
          id: item.id,
          eventId: item.wedding_event_id ?? null,
          name: item.name,
          estimatedCost: item.estimated_cost ?? 0,
          actualCost: item.actual_cost ?? null,
          quantity: item.quantity ?? 1,
          isPaid: item.is_paid ?? false,
          notes: item.notes ?? "",
          sortOrder: item.sort_order ?? itemIndex,
        })),
    })),
  };
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

    const [budget, eventPlanSpend] = await Promise.all([
      loadBudgetPayload(profileId),
      getEventPlanSpendSummary(profileId),
    ]);
    return apiSuccess({ needsOnboarding: false, budget, eventPlanSpend });
  } catch (error) {
    console.error("GET /api/budget", error);
    return apiError("Failed to load budget", 500);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const profileId = await getClientProfileId(session.userId);
    if (!profileId) {
      return apiError("Complete onboarding before saving your budget", 409);
    }

    const body = (await request.json()) as Partial<BudgetPayload>;
    const budgetName =
      typeof body.budgetName === "string" && body.budgetName.trim()
        ? body.budgetName.trim()
        : "Event Investment Plan";
    const totalBudget =
      typeof body.totalBudget === "number" && Number.isFinite(body.totalBudget)
        ? Math.max(0, Math.floor(body.totalBudget))
        : 0;
    const categories = Array.isArray(body.categories) ? body.categories : [];

    const supabase = createAdminSupabaseClient();
    const budget = await getOrCreateBudget(profileId);
    const allowedEventIds = await getAllowedWeddingEventIds(profileId);

    const { error: budgetErr } = await supabase
      .from("budgets")
      .update({
        name: budgetName,
        total_budget: totalBudget,
      })
      .eq("id", budget.id);

    if (budgetErr) {
      throw budgetErr;
    }

    const { data: existingCategories, error: existingCategoryErr } =
      await supabase
        .from("budget_categories")
        .select("id")
        .eq("budget_id", budget.id);

    if (existingCategoryErr) {
      throw existingCategoryErr;
    }

    const existingCategoryIds = new Set(
      (existingCategories ?? []).map((category) => category.id)
    );
    const existingCategoryIdList = Array.from(existingCategoryIds);
    let existingItems:
      | { id: string; budget_category_id: string }[]
      | null = null;

    if (existingCategoryIdList.length > 0) {
      const { data: itemRows, error: existingItemsErr } = await supabase
        .from("budget_items")
        .select("id, budget_category_id")
        .in("budget_category_id", existingCategoryIdList);

      if (existingItemsErr) {
        throw existingItemsErr;
      }

      existingItems = itemRows ?? [];
    }

    const existingItemIds = new Set((existingItems ?? []).map((item) => item.id));
    const seenCategoryIds = new Set<string>();
    const seenItemIds = new Set<string>();

    for (const [categoryIndex, category] of categories.entries()) {
      const categoryName =
        typeof category?.name === "string" && category.name.trim()
          ? category.name.trim()
          : `Category ${categoryIndex + 1}`;
      const allocated =
        typeof category?.allocated === "number" && Number.isFinite(category.allocated)
          ? Math.max(0, Math.floor(category.allocated))
          : 0;

      let categoryId =
        typeof category?.id === "string" && existingCategoryIds.has(category.id)
          ? category.id
          : null;

      if (categoryId) {
        const { error: categoryUpdateErr } = await supabase
          .from("budget_categories")
          .update({
            name: categoryName,
            allocated,
            sort_order: categoryIndex,
          })
          .eq("id", categoryId)
          .eq("budget_id", budget.id);

        if (categoryUpdateErr) {
          throw categoryUpdateErr;
        }
      } else {
        const { data: insertedCategory, error: categoryInsertErr } =
          await supabase
            .from("budget_categories")
            .insert({
              budget_id: budget.id,
              name: categoryName,
              allocated,
              sort_order: categoryIndex,
            })
            .select("id")
            .single();

        if (categoryInsertErr || !insertedCategory) {
          throw categoryInsertErr ?? new Error("Could not insert category");
        }

        categoryId = insertedCategory.id;
      }

      if (!categoryId) {
        throw new Error("Could not resolve category");
      }

      const resolvedCategoryId = categoryId;
      seenCategoryIds.add(resolvedCategoryId);

      const items = Array.isArray(category?.items) ? category.items : [];
      if (items.length === 0) {
        continue;
      }

      const validItems = items.filter(
        (item) => typeof item?.name === "string" && item.name.trim()
      );
      const payload = validItems.map((item, itemIndex) => {
          const eventId =
            typeof item.eventId === "string" && allowedEventIds.has(item.eventId)
              ? item.eventId
              : null;

          return {
            budget_category_id: resolvedCategoryId,
            wedding_event_id: eventId,
            name: item.name.trim(),
            estimated_cost:
              typeof item.estimatedCost === "number" &&
              Number.isFinite(item.estimatedCost)
                ? Math.max(0, Math.floor(item.estimatedCost))
                : 0,
            actual_cost:
              typeof item.actualCost === "number" &&
              Number.isFinite(item.actualCost)
                ? Math.max(0, Math.floor(item.actualCost))
                : null,
            quantity:
              typeof item.quantity === "number" && Number.isFinite(item.quantity)
                ? Math.max(1, Math.floor(item.quantity))
                : 1,
            is_paid: Boolean(item.isPaid),
            notes: typeof item.notes === "string" ? item.notes : null,
            sort_order: itemIndex,
          };
        });

      for (const [itemIndex, itemPayload] of payload.entries()) {
        const sourceItem = validItems[itemIndex];
        const itemId =
          typeof sourceItem?.id === "string" && existingItemIds.has(sourceItem.id)
            ? sourceItem.id
            : null;

        if (itemId) {
          const { error: itemUpdateErr } = await supabase
            .from("budget_items")
            .update(itemPayload)
            .eq("id", itemId)
            .in("budget_category_id", existingCategoryIdList);

          if (itemUpdateErr) {
            throw itemUpdateErr;
          }

          seenItemIds.add(itemId);
        } else {
          const { error: itemInsertErr } = await supabase
            .from("budget_items")
            .insert(itemPayload);

          if (itemInsertErr) {
            throw itemInsertErr;
          }
        }
      }
    }

    const removedItemIds = Array.from(existingItemIds).filter(
      (itemId) => !seenItemIds.has(itemId)
    );

    if (removedItemIds.length > 0) {
      const { error: itemDeleteErr } = await supabase
        .from("budget_items")
        .delete()
        .in("id", removedItemIds)
        .in("budget_category_id", existingCategoryIdList);

      if (itemDeleteErr) {
        throw itemDeleteErr;
      }
    }

    const removedCategoryIds = existingCategoryIdList.filter(
      (categoryId) => !seenCategoryIds.has(categoryId)
    );

    if (removedCategoryIds.length > 0) {
      const { error: categoryDeleteErr } = await supabase
        .from("budget_categories")
        .delete()
        .eq("budget_id", budget.id)
        .in("id", removedCategoryIds);

      if (categoryDeleteErr) {
        throw categoryDeleteErr;
      }
    }

    const [refreshed, eventPlanSpend] = await Promise.all([
      loadBudgetPayload(profileId),
      getEventPlanSpendSummary(profileId),
    ]);
    return apiSuccess({ budget: refreshed, eventPlanSpend });
  } catch (error) {
    console.error("PUT /api/budget", error);
    return apiError("Failed to save budget", 500);
  }
}
