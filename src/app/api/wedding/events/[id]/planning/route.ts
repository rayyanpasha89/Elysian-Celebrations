import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext } from "@/lib/wedding-plan.server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

type MenuDraft = {
  name?: unknown;
  mealPeriod?: unknown;
  serviceStyle?: unknown;
  notes?: unknown;
  items?: unknown;
};

type MenuItemDraft = {
  name?: unknown;
  course?: unknown;
  dietaryTags?: unknown;
  notes?: unknown;
};

type TaskDraft = {
  title?: unknown;
  owner?: unknown;
  status?: unknown;
  dueDate?: unknown;
};

function toOptionalString(value: unknown, maxLength = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function toRequiredString(value: unknown, fallback: string, maxLength = 160) {
  return toOptionalString(value, maxLength) ?? fallback;
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
    name: toRequiredString(menu.name, `Menu ${menuIndex + 1}`),
    meal_period: toOptionalString(menu.mealPeriod, 80),
    service_style: toOptionalString(menu.serviceStyle, 120),
    notes: toOptionalString(menu.notes, 1000),
    sort_order: menuIndex,
    items: Array.isArray(menu.items)
      ? menu.items.slice(0, 40).map((item: MenuItemDraft, itemIndex) => ({
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
      title: toOptionalString(task.title, 180),
      owner: toOptionalString(task.owner, 80),
      status: normalizeTaskStatus(task.status),
      due_date: toOptionalDate(task.dueDate),
      sort_order: taskIndex,
    }))
    .filter((task) => task.title);
}

async function requireOwnedEvent(userId: string, eventId: string) {
  const { supabase, wedding } = await getClientWeddingContext(userId);
  if (!wedding) {
    return { error: apiError("Wedding not found", 404) };
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

    const { error: deleteMenusError } = await supabase
      .from("wedding_event_menus")
      .delete()
      .eq("wedding_event_id", id);

    if (deleteMenusError) {
      console.error("wedding_event_menus delete:", deleteMenusError);
      return apiError("Failed to refresh event menus", 500);
    }

    if (menus.length > 0) {
      const { data: insertedMenus, error: insertMenusError } = await supabase
        .from("wedding_event_menus")
        .insert(
          menus.map((menu) => ({
            wedding_event_id: id,
            name: menu.name,
            meal_period: menu.meal_period,
            service_style: menu.service_style,
            notes: menu.notes,
            sort_order: menu.sort_order,
          }))
        )
        .select("id, sort_order");

      if (insertMenusError || !insertedMenus) {
        console.error("wedding_event_menus insert:", insertMenusError);
        return apiError("Failed to save event menus", 500);
      }

      const menuIdBySort = new Map(
        insertedMenus.map((menu) => [menu.sort_order as number, menu.id as string])
      );
      const itemsToInsert = menus.flatMap((menu) => {
        const menuId = menuIdBySort.get(menu.sort_order);
        if (!menuId) return [];
        return menu.items.map((item) => ({
          menu_id: menuId,
          name: item.name,
          course: item.course,
          dietary_tags: item.dietary_tags,
          notes: item.notes,
          sort_order: item.sort_order,
        }));
      });

      if (itemsToInsert.length > 0) {
        const { error: insertItemsError } = await supabase
          .from("wedding_event_menu_items")
          .insert(itemsToInsert);

        if (insertItemsError) {
          console.error("wedding_event_menu_items insert:", insertItemsError);
          return apiError("Failed to save menu items", 500);
        }
      }
    }

    const { error: deleteTasksError } = await supabase
      .from("wedding_event_tasks")
      .delete()
      .eq("wedding_event_id", id);

    if (deleteTasksError) {
      console.error("wedding_event_tasks delete:", deleteTasksError);
      return apiError("Failed to refresh event tasks", 500);
    }

    if (tasks.length > 0) {
      const { error: insertTasksError } = await supabase
        .from("wedding_event_tasks")
        .insert(
          tasks.map((task) => ({
            wedding_event_id: id,
            title: task.title,
            owner: task.owner,
            status: task.status,
            due_date: task.due_date,
            sort_order: task.sort_order,
          }))
        );

      if (insertTasksError) {
        console.error("wedding_event_tasks insert:", insertTasksError);
        return apiError("Failed to save event tasks", 500);
      }
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("PATCH /api/wedding/events/[id]/planning", error);
    return apiError("Internal server error", 500);
  }
}
