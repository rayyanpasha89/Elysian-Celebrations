import { NextRequest, NextResponse } from "next/server";
import {
  EVENT_REQUIREMENT_CATEGORIES,
  normalizeEventRequirementPayload,
} from "@/lib/event-platform";
import { getClientWeddingContext } from "@/lib/wedding-plan.server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

const ALLOWED_CATEGORIES = new Set(
  EVENT_REQUIREMENT_CATEGORIES.map((category) => category.key)
);
const ALLOWED_REQUIREMENT_STATUSES = new Set([
  "DRAFT",
  "NEEDS_VENDOR",
  "QUOTE_NEEDED",
  "CONFIRMED",
  "DONE",
]);
const ALLOWED_REQUIREMENT_PRIORITIES = new Set([
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
]);

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

type RequirementDraft = {
  id?: unknown;
  category?: unknown;
  title?: unknown;
  status?: unknown;
  priority?: unknown;
  vendorProfileId?: unknown;
  vendorServiceId?: unknown;
  payload?: unknown;
  notes?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    .filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim().length > 0
    )
    .slice(0, 40)
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
  return (value as MenuDraft[]).slice(0, 8).map((menu, menuIndex) => ({
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
  return (value as TaskDraft[])
    .slice(0, 40)
    .map((task, taskIndex) => ({
      id: toOptionalId(task.id),
      title: toOptionalString(task.title, 180),
      owner: toOptionalString(task.owner, 80),
      status: normalizeTaskStatus(task.status),
      due_date: toOptionalDate(task.dueDate),
      sort_order: taskIndex,
    }))
    .filter((task) => task.title);
}

function normalizeLogistics(value: Record<string, unknown>) {
  return {
    guest_arrival_time: toOptionalString(value.guestArrivalTime, 40),
    vendor_load_in_time: toOptionalString(value.vendorLoadInTime, 40),
    family_call_time: toOptionalString(value.familyCallTime, 40),
    transport_notes: toOptionalString(value.transportNotes, 1000),
    rooming_notes: toOptionalString(value.roomingNotes, 1000),
    weather_plan: toOptionalString(value.weatherPlan, 1000),
    ceremony_notes: toOptionalString(value.ceremonyNotes, 1000),
  };
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase().replace(/[\s_/]+/g, "-");
}

function normalizeCategory(value: unknown) {
  if (typeof value !== "string") return "custom";
  const lookup = normalizeLookup(value);
  return ALLOWED_CATEGORIES.has(lookup as never) ? lookup : "custom";
}

function normalizeRequirementStatus(value: unknown) {
  const status = toOptionalString(value, 40)?.toUpperCase();
  return status && ALLOWED_REQUIREMENT_STATUSES.has(status) ? status : "DRAFT";
}

function normalizeRequirementPriority(value: unknown) {
  const priority = toOptionalString(value, 40)?.toUpperCase();
  return priority && ALLOWED_REQUIREMENT_PRIORITIES.has(priority)
    ? priority
    : "NORMAL";
}

function normalizeRequirements(value: unknown) {
  return (value as RequirementDraft[]).slice(0, 60).map((requirement, index) => {
    const category = normalizeCategory(requirement.category);
    return {
      id: toOptionalId(requirement.id),
      category,
      title:
        toOptionalString(requirement.title, 160) ??
        EVENT_REQUIREMENT_CATEGORIES.find((item) => item.key === category)?.label ??
        "Requirement",
      status: normalizeRequirementStatus(requirement.status),
      priority: normalizeRequirementPriority(requirement.priority),
      vendor_profile_id: toOptionalId(requirement.vendorProfileId),
      vendor_service_id: toOptionalId(requirement.vendorServiceId),
      payload: normalizeEventRequirementPayload(requirement.payload),
      notes: toOptionalString(requirement.notes, 4000),
      sort_order: index,
    };
  });
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

function planningRpcError(code?: string) {
  if (code === "22007" || code === "22023") {
    return apiError("Some event planning details are invalid", 400);
  }
  if (code === "23503" || code === "23505") {
    return apiError("A selected planning item is no longer available", 409);
  }
  if (code === "42501") {
    return apiError("Event not found", 404);
  }
  return apiError("Failed to save event planning", 500);
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
    const body = (await request.json()) as Record<string, unknown>;

    if (
      !Array.isArray(body.menus) ||
      !Array.isArray(body.tasks) ||
      !isRecord(body.logistics) ||
      (body.requirements !== undefined && !Array.isArray(body.requirements))
    ) {
      return apiError("Event planning payload has an invalid shape", 400);
    }

    const ownership = await requireOwnedEvent(session.userId, id);
    if ("error" in ownership) return ownership.error;

    const { data, error } = await ownership.supabase.rpc("save_event_planning", {
      p_actor_user_id: session.userId,
      p_event_id: id,
      p_menus: normalizeMenus(body.menus),
      p_logistics: normalizeLogistics(body.logistics),
      p_tasks: normalizeTasks(body.tasks),
      p_requirements:
        body.requirements === undefined
          ? null
          : normalizeRequirements(body.requirements),
    });

    if (error) {
      console.error("save_event_planning RPC:", error);
      return planningRpcError(error.code);
    }

    return apiSuccess({ ok: true, result: data });
  } catch (error) {
    console.error("PATCH /api/wedding/events/[id]/planning", error);
    return apiError("Internal server error", 500);
  }
}
