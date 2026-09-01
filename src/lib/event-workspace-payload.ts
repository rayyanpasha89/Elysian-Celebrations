import {
  EVENT_REQUIREMENT_CATEGORIES,
  normalizeEventRequirementPayload,
} from "@/lib/event-platform";
import { toOptionalVenueId } from "@/lib/venue-selection";

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

export function isRecord(value: unknown): value is Record<string, unknown> {
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
  return [
    ...new Set(
      value
        .filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0
        )
        .map((entry) => entry.trim().slice(0, 80))
    ),
  ].slice(0, 40);
}

function toOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toOptionalPositiveInt(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const parsed = Math.round(value);
  return parsed > 0 ? parsed : null;
}

function normalizeTaskStatus(value: unknown) {
  const status = toOptionalString(value, 40)?.toUpperCase();
  if (status === "IN_PROGRESS" || status === "DONE") return status;
  return "OPEN";
}

export function normalizeMenus(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((rawMenu, menuIndex) => {
    const menu: MenuDraft = isRecord(rawMenu) ? rawMenu : {};
    return {
      id: toOptionalId(menu.id),
      name: toRequiredString(menu.name, `Menu ${menuIndex + 1}`),
      meal_period: toOptionalString(menu.mealPeriod, 80),
      service_style: toOptionalString(menu.serviceStyle, 120),
      notes: toOptionalString(menu.notes, 1000),
      sort_order: menuIndex,
      items: Array.isArray(menu.items)
        ? menu.items.slice(0, 40).map((rawItem, itemIndex) => {
            const item: MenuItemDraft = isRecord(rawItem) ? rawItem : {};
            return {
              id: toOptionalId(item.id),
              name: toRequiredString(
                item.name,
                `Menu item ${itemIndex + 1}`
              ),
              course: toOptionalString(item.course, 80),
              dietary_tags: toOptionalStringArray(item.dietaryTags),
              notes: toOptionalString(item.notes, 500),
              sort_order: itemIndex,
            };
          })
        : [],
    };
  });
}

export function normalizeTasks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 40)
    .map((rawTask, taskIndex) => {
      const task: TaskDraft = isRecord(rawTask) ? rawTask : {};
      return {
        id: toOptionalId(task.id),
        title: toOptionalString(task.title, 180),
        owner: toOptionalString(task.owner, 80),
        status: normalizeTaskStatus(task.status),
        due_date: toOptionalDate(task.dueDate),
        sort_order: taskIndex,
      };
    })
    .filter((task) => task.title);
}

export function normalizeLogistics(value: unknown) {
  const logistics = isRecord(value) ? value : {};
  return {
    guest_arrival_time: toOptionalString(logistics.guestArrivalTime, 40),
    vendor_load_in_time: toOptionalString(logistics.vendorLoadInTime, 40),
    family_call_time: toOptionalString(logistics.familyCallTime, 40),
    transport_notes: toOptionalString(logistics.transportNotes, 1000),
    rooming_notes: toOptionalString(logistics.roomingNotes, 1000),
    weather_plan: toOptionalString(logistics.weatherPlan, 1000),
    ceremony_notes: toOptionalString(logistics.ceremonyNotes, 1000),
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

export function normalizeRequirements(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 60).map((rawRequirement, index) => {
    const requirement: RequirementDraft = isRecord(rawRequirement)
      ? rawRequirement
      : {};
    const category = normalizeCategory(requirement.category);
    return {
      id: toOptionalId(requirement.id),
      category,
      title:
        toOptionalString(requirement.title, 160) ??
        EVENT_REQUIREMENT_CATEGORIES.find((item) => item.key === category)
          ?.label ??
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

export function normalizeEventDetails(value: unknown) {
  const event = isRecord(value) ? value : {};
  return {
    wedding_day_id: toOptionalId(event.weddingDayId),
    name: toRequiredString(event.name, "Event"),
    event_type: toOptionalString(event.eventType, 120),
    date: toOptionalDate(event.date),
    start_time: toOptionalString(event.startTime, 40),
    end_time: toOptionalString(event.endTime, 40),
    venue: toOptionalString(event.venue, 240),
    venue_id: toOptionalVenueId(event.venueId),
    guest_count: toOptionalPositiveInt(event.guestCount),
    estimated_budget: toOptionalPositiveInt(event.estimatedBudget),
    food_style: toOptionalString(event.foodStyle, 160),
    food_preferences: toOptionalStringArray(event.foodPreferences),
    menu_notes: toOptionalString(event.menuNotes, 4000),
    decor_style: toOptionalString(event.decorStyle, 160),
    decor_notes: toOptionalString(event.decorNotes, 4000),
    attire_notes: toOptionalString(event.attireNotes, 4000),
    notes: toOptionalString(event.notes, 4000),
    requirement_payload: normalizeEventRequirementPayload(
      event.requirementPayload
    ),
  };
}

export function normalizeVendorSelections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 60).map((rawSelection) => {
    const selection = isRecord(rawSelection) ? rawSelection : {};
    return {
      vendor_profile_id: toOptionalId(selection.vendorProfileId),
      vendor_service_id: toOptionalId(selection.vendorServiceId),
    };
  });
}
