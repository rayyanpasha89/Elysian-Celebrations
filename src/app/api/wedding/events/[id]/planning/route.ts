import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext } from "@/lib/wedding-plan.server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

type MenuDraft = {
  id?: unknown;
  name?: unknown;
  mealPeriod?: unknown;
  serviceStyle?: unknown;
  notes?: unknown;
  items?: unknown;
};

type MenuItemDraft = {
  id?: unknown;
  name?: unknown;
  course?: unknown;
  dietaryTags?: unknown;
  notes?: unknown;
};

type TaskDraft = {
  id?: unknown;
  title?: unknown;
  owner?: unknown;
  status?: unknown;
  dueDate?: unknown;
};

type PlanningSupabase = Awaited<
  ReturnType<typeof getClientWeddingContext>
>["supabase"];

type ExistingMenuRow = {
  id: string;
  name: string;
  meal_period: string | null;
  sort_order: number;
};

type ExistingMenuItemRow = {
  id: string;
  menu_id: string;
  name: string;
  course: string | null;
  sort_order: number;
};

type ExistingTaskRow = {
  id: string;
  title: string;
  owner: string | null;
  sort_order: number;
};

class PlanningSaveError extends Error {
  constructor(
    message: string,
    public readonly logLabel: string,
    public readonly detail: unknown
  ) {
    super(message);
  }
}

function toOptionalString(value: unknown, maxLength = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function toRequiredString(value: unknown, fallback: string, maxLength = 160) {
  return toOptionalString(value, maxLength) ?? fallback;
}

function toOptionalId(value: unknown) {
  return toOptionalString(value, 80);
}

function toOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim().slice(0, 80));
}

function toOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeTaskStatus(value: unknown) {
  const status = toOptionalString(value, 40)?.toUpperCase();
  if (status === "IN_PROGRESS" || status === "DONE") return status;
  return "OPEN";
}

function normalizeMenus(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 8).map((menu: MenuDraft, menuIndex) => ({
    id: toOptionalId(menu.id),
    name: toRequiredString(menu.name, `Menu ${menuIndex + 1}`),
    meal_period: toOptionalString(menu.mealPeriod, 80),
    service_style: toOptionalString(menu.serviceStyle, 120),
    notes: toOptionalString(menu.notes, 1000),
    sort_order: menuIndex,
    items: Array.isArray(menu.items)
      ? menu.items.slice(0, 40).map((item: MenuItemDraft, itemIndex) => ({
          id: toOptionalId(item.id),
          name: toRequiredString(item.name, `Menu item ${itemIndex + 1}`),
          course: toOptionalString(item.course, 80),
          dietary_tags: toOptionalStringArray(item.dietaryTags),
          notes: toOptionalString(item.notes, 500),
          sort_order: itemIndex,
        }))
      : [],
  }));
}

function normalizeTasks(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 40)
    .map((task: TaskDraft, taskIndex) => ({
      id: toOptionalId(task.id),
      title: toOptionalString(task.title, 180),
      owner: toOptionalString(task.owner, 80),
      status: normalizeTaskStatus(task.status),
      due_date: toOptionalDate(task.dueDate),
      sort_order: taskIndex,
    }))
    .filter((task) => task.title);
}

function entityKey(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (part ?? "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
}

function takeById<T extends { id: string }>(rows: T[], id: string | null) {
  if (!id) return null;
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const [row] = rows.splice(index, 1);
  return row ?? null;
}

function takeByKey<T extends { id: string }>(
  rows: T[],
  getKey: (row: T) => string,
  key: string
) {
  if (!key.replaceAll("|", "")) return null;
  const index = rows.findIndex((row) => getKey(row) === key);
  if (index < 0) return null;
  const [row] = rows.splice(index, 1);
  return row ?? null;
}

function takeBySort<T extends { id: string; sort_order: number }>(
  rows: T[],
  sortOrder: number
) {
  const index = rows.findIndex((row) => row.sort_order === sortOrder);
  if (index < 0) return null;
  const [row] = rows.splice(index, 1);
  return row ?? null;
}

function throwPlanningSaveError(
  logLabel: string,
  message: string,
  detail: unknown
): never {
  console.error(logLabel, detail);
  throw new PlanningSaveError(message, logLabel, detail);
}

async function syncEventMenus(
  supabase: PlanningSupabase,
  eventId: string,
  menus: ReturnType<typeof normalizeMenus>
) {
  const { data: existingMenusData, error: existingMenusError } = await supabase
    .from("wedding_event_menus")
    .select("id, name, meal_period, sort_order")
    .eq("wedding_event_id", eventId)
    .order("sort_order", { ascending: true });

  if (existingMenusError) {
    throwPlanningSaveError(
      "wedding_event_menus load:",
      "Failed to load existing event menus",
      existingMenusError
    );
  }

  const existingMenus = (existingMenusData ?? []) as ExistingMenuRow[];
  const menuIds = existingMenus.map((menu) => menu.id);
  const { data: existingItemsData, error: existingItemsError } =
    menuIds.length > 0
      ? await supabase
          .from("wedding_event_menu_items")
          .select("id, menu_id, name, course, sort_order")
          .in("menu_id", menuIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

  if (existingItemsError) {
    throwPlanningSaveError(
      "wedding_event_menu_items load:",
      "Failed to load existing menu items",
      existingItemsError
    );
  }

  const itemsByMenu = new Map<string, ExistingMenuItemRow[]>();
  for (const item of (existingItemsData ?? []) as ExistingMenuItemRow[]) {
    const list = itemsByMenu.get(item.menu_id) ?? [];
    list.push(item);
    itemsByMenu.set(item.menu_id, list);
  }

  const remainingMenus = [...existingMenus];
  const keptMenuIds = new Set<string>();

  for (const menu of menus) {
    const matchedMenu =
      takeById(remainingMenus, menu.id) ??
      takeByKey(
        remainingMenus,
        (row) => entityKey(row.name, row.meal_period),
        entityKey(menu.name, menu.meal_period)
      ) ??
      takeBySort(remainingMenus, menu.sort_order);

    let menuId = matchedMenu?.id ?? null;
    const menuPayload = {
      wedding_event_id: eventId,
      name: menu.name,
      meal_period: menu.meal_period,
      service_style: menu.service_style,
      notes: menu.notes,
      sort_order: menu.sort_order,
    };

    if (menuId) {
      const { error: updateMenuError } = await supabase
        .from("wedding_event_menus")
        .update(menuPayload)
        .eq("id", menuId)
        .eq("wedding_event_id", eventId);

      if (updateMenuError) {
        throwPlanningSaveError(
          "wedding_event_menus update:",
          "Failed to update event menu",
          updateMenuError
        );
      }
    } else {
      const { data: insertedMenu, error: insertMenuError } = await supabase
        .from("wedding_event_menus")
        .insert(menuPayload)
        .select("id")
        .single();

      if (insertMenuError || !insertedMenu?.id) {
        throwPlanningSaveError(
          "wedding_event_menus insert:",
          "Failed to save event menu",
          insertMenuError
        );
      }

      menuId = insertedMenu.id as string;
    }

    keptMenuIds.add(menuId);
    const remainingItems = [...(itemsByMenu.get(menuId) ?? [])];
    const keptItemIds = new Set<string>();

    for (const item of menu.items) {
      const matchedItem =
        takeById(remainingItems, item.id) ??
        takeByKey(
          remainingItems,
          (row) => entityKey(row.name, row.course),
          entityKey(item.name, item.course)
        ) ??
        takeBySort(remainingItems, item.sort_order);

      const itemPayload = {
        menu_id: menuId,
        name: item.name,
        course: item.course,
        dietary_tags: item.dietary_tags,
        notes: item.notes,
        sort_order: item.sort_order,
      };

      if (matchedItem) {
        const { error: updateItemError } = await supabase
          .from("wedding_event_menu_items")
          .update(itemPayload)
          .eq("id", matchedItem.id)
          .eq("menu_id", menuId);

        if (updateItemError) {
          throwPlanningSaveError(
            "wedding_event_menu_items update:",
            "Failed to update menu item",
            updateItemError
          );
        }

        keptItemIds.add(matchedItem.id);
      } else {
        const { data: insertedItem, error: insertItemError } = await supabase
          .from("wedding_event_menu_items")
          .insert(itemPayload)
          .select("id")
          .single();

        if (insertItemError || !insertedItem?.id) {
          throwPlanningSaveError(
            "wedding_event_menu_items insert:",
            "Failed to save menu item",
            insertItemError
          );
        }

        keptItemIds.add(insertedItem.id as string);
      }
    }

    const staleItemIds = remainingItems
      .filter((item) => !keptItemIds.has(item.id))
      .map((item) => item.id);

    if (staleItemIds.length > 0) {
      const { error: deleteItemsError } = await supabase
        .from("wedding_event_menu_items")
        .delete()
        .in("id", staleItemIds);

      if (deleteItemsError) {
        throwPlanningSaveError(
          "wedding_event_menu_items delete:",
          "Failed to remove old menu items",
          deleteItemsError
        );
      }
    }
  }

  const staleMenuIds = remainingMenus
    .filter((menu) => !keptMenuIds.has(menu.id))
    .map((menu) => menu.id);

  if (staleMenuIds.length > 0) {
    const { error: deleteMenusError } = await supabase
      .from("wedding_event_menus")
      .delete()
      .eq("wedding_event_id", eventId)
      .in("id", staleMenuIds);

    if (deleteMenusError) {
      throwPlanningSaveError(
        "wedding_event_menus delete:",
        "Failed to remove old event menus",
        deleteMenusError
      );
    }
  }
}

async function syncEventTasks(
  supabase: PlanningSupabase,
  eventId: string,
  tasks: ReturnType<typeof normalizeTasks>
) {
  const { data: existingTasksData, error: existingTasksError } = await supabase
    .from("wedding_event_tasks")
    .select("id, title, owner, sort_order")
    .eq("wedding_event_id", eventId)
    .order("sort_order", { ascending: true });

  if (existingTasksError) {
    throwPlanningSaveError(
      "wedding_event_tasks load:",
      "Failed to load existing event tasks",
      existingTasksError
    );
  }

  const remainingTasks = [
    ...((existingTasksData ?? []) as ExistingTaskRow[]),
  ];
  const keptTaskIds = new Set<string>();

  for (const task of tasks) {
    if (!task.title) continue;

    const matchedTask =
      takeById(remainingTasks, task.id) ??
      takeByKey(
        remainingTasks,
        (row) => entityKey(row.title, row.owner),
        entityKey(task.title, task.owner)
      ) ??
      takeBySort(remainingTasks, task.sort_order);

    const taskPayload = {
      wedding_event_id: eventId,
      title: task.title,
      owner: task.owner,
      status: task.status,
      due_date: task.due_date,
      sort_order: task.sort_order,
    };

    if (matchedTask) {
      const { error: updateTaskError } = await supabase
        .from("wedding_event_tasks")
        .update(taskPayload)
        .eq("id", matchedTask.id)
        .eq("wedding_event_id", eventId);

      if (updateTaskError) {
        throwPlanningSaveError(
          "wedding_event_tasks update:",
          "Failed to update event task",
          updateTaskError
        );
      }

      keptTaskIds.add(matchedTask.id);
    } else {
      const { data: insertedTask, error: insertTaskError } = await supabase
        .from("wedding_event_tasks")
        .insert(taskPayload)
        .select("id")
        .single();

      if (insertTaskError || !insertedTask?.id) {
        throwPlanningSaveError(
          "wedding_event_tasks insert:",
          "Failed to save event task",
          insertTaskError
        );
      }

      keptTaskIds.add(insertedTask.id as string);
    }
  }

  const staleTaskIds = remainingTasks
    .filter((task) => !keptTaskIds.has(task.id))
    .map((task) => task.id);

  if (staleTaskIds.length > 0) {
    const { error: deleteTasksError } = await supabase
      .from("wedding_event_tasks")
      .delete()
      .eq("wedding_event_id", eventId)
      .in("id", staleTaskIds);

    if (deleteTasksError) {
      throwPlanningSaveError(
        "wedding_event_tasks delete:",
        "Failed to remove old event tasks",
        deleteTasksError
      );
    }
  }
}

async function requireOwnedEvent(userId: string, eventId: string) {
  const { supabase, wedding } = await getClientWeddingContext(userId);
  if (!wedding) {
    return { error: apiError("Event plan not found", 404) };
  }

  const { data: event, error } = await supabase
    .from("wedding_events")
    .select("id")
    .eq("id", eventId)
    .eq("wedding_id", wedding.id)
    .maybeSingle();

  if (error) {
    console.error("wedding_events planning load:", error);
    return { error: apiError("Failed to load event", 500) };
  }

  if (!event) {
    return { error: apiError("Event not found", 404) };
  }

  return { supabase };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const ownership = await requireOwnedEvent(session.userId, id);
    if ("error" in ownership) return ownership.error;

    const body = (await request.json()) as Record<string, unknown>;
    const menus = normalizeMenus(body.menus);
    const tasks = normalizeTasks(body.tasks);
    const logistics = body.logistics as Record<string, unknown> | undefined;
    const supabase = ownership.supabase;

    const { error: logisticsError } = await supabase
      .from("wedding_event_logistics")
      .upsert(
        {
          wedding_event_id: id,
          guest_arrival_time: toOptionalString(logistics?.guestArrivalTime, 40),
          vendor_load_in_time: toOptionalString(logistics?.vendorLoadInTime, 40),
          family_call_time: toOptionalString(logistics?.familyCallTime, 40),
          transport_notes: toOptionalString(logistics?.transportNotes, 1000),
          rooming_notes: toOptionalString(logistics?.roomingNotes, 1000),
          weather_plan: toOptionalString(logistics?.weatherPlan, 1000),
          ceremony_notes: toOptionalString(logistics?.ceremonyNotes, 1000),
        },
        { onConflict: "wedding_event_id" }
      );

    if (logisticsError) {
      console.error("wedding_event_logistics upsert:", logisticsError);
      return apiError("Failed to save event logistics", 500);
    }

    await syncEventMenus(supabase, id, menus);
    await syncEventTasks(supabase, id, tasks);

    return apiSuccess({ ok: true });
  } catch (error) {
    if (error instanceof PlanningSaveError) {
      return apiError(error.message, 500);
    }

    console.error("PATCH /api/wedding/events/[id]/planning", error);
    return apiError("Internal server error", 500);
  }
}
