"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FinalizationBoard } from "@/components/dashboard/finalization-board";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { ProgressRing } from "@/components/dashboard/ui-kit";
import {
  CEREMONY_FLOW_OPTIONS,
  ChipMultiSelect,
  ChipSingleSelect,
  CUISINE_OPTIONS,
  DECOR_PALETTES,
  DECOR_STYLE_OPTIONS as PLANNER_DECOR_STYLE_OPTIONS,
  DIETARY_TAG_OPTIONS,
  DRESS_CODE_OPTIONS,
  FOOD_SERVICE_STYLES,
  GUEST_PRESETS,
  OwnerSelect,
  PresetTagInput,
  ROOMING_OPTIONS,
  SIGNATURE_COUNTER_OPTIONS,
  Stepper,
  SwatchPalette,
  TASK_OWNER_OPTIONS,
  TASK_TEMPLATES,
  TRANSPORT_OPTIONS,
  WEATHER_BACKUP_OPTIONS,
} from "@/components/dashboard/planner-inputs";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import {
  EVENT_TASK_STATUS_OPTIONS,
  MEAL_PERIOD_OPTIONS,
  MENU_COURSE_OPTIONS,
  PLANNER_VENDOR_CATEGORIES,
  type PlannerVendorCategoryKey,
} from "@/lib/wedding-plan";
import { categoryCopy } from "@/lib/vendor-offering";
import {
  EVENT_FINALIZATION_CHECKLIST,
  EVENT_REQUIREMENT_CATEGORIES,
  EVENT_REQUIREMENT_PRIORITY_OPTIONS,
  EVENT_REQUIREMENT_STATUS_OPTIONS,
  EVENT_TIME_BLOCKS,
  type EventRequirementCategoryKey,
  type EventTimeBlockKey,
} from "@/lib/event-platform";
import { cn, formatCurrency } from "@/lib/utils";

type Destination = {
  id?: string;
  name?: string;
  slug?: string;
  country?: string;
  tagline?: string | null;
  hero_image?: string | null;
};

type PackageTier = { name?: string; slug?: string };

type EventVendorSelection = {
  id: string;
  status: string;
  eventDate: string | null;
  notes: string | null;
  totalAmount: number | null;
  paidAmount: number | null;
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    categoryName: string;
    categorySlug: string;
  } | null;
  service: {
    id: string;
    name: string;
    description: string | null;
    serviceScope: string | null;
    basePrice: number | null;
    maxPrice: number | null;
    unit: string | null;
    eventTypeFit: string[];
    inclusions: string[];
    deliverables: string[];
    addOns: string[];
    items: {
      id: string;
      itemType: string;
      name: string;
      description: string | null;
      dietaryTags: string[];
      sortOrder: number | null;
    }[];
  } | null;
};

type EventMenuItem = {
  id: string;
  name: string;
  course: string | null;
  dietaryTags: string[];
  notes: string | null;
  sortOrder: number;
};

type EventMenu = {
  id: string;
  name: string;
  mealPeriod: string | null;
  serviceStyle: string | null;
  notes: string | null;
  sortOrder: number;
  items: EventMenuItem[];
};

type EventLogistics = {
  id: string;
  guestArrivalTime: string | null;
  vendorLoadInTime: string | null;
  familyCallTime: string | null;
  transportNotes: string | null;
  roomingNotes: string | null;
  weatherPlan: string | null;
  ceremonyNotes: string | null;
};

type EventTask = {
  id: string;
  title: string;
  owner: string | null;
  status: string;
  dueDate: string | null;
  sortOrder: number;
};

type EventRequirement = {
  id: string;
  category: EventRequirementCategoryKey;
  title: string;
  status: string;
  priority: string;
  vendorProfileId: string | null;
  vendorServiceId: string | null;
  payload: Record<string, unknown>;
  notes: string | null;
  sortOrder: number;
};

type WeddingEvent = {
  id: string;
  wedding_day_id: string | null;
  name: string;
  event_type: string | null;
  time_block: EventTimeBlockKey | null;
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
  requirement_payload?: Record<string, unknown> | null;
  sort_order: number;
  menus: EventMenu[];
  logistics: EventLogistics | null;
  tasks: EventTask[];
  requirements: EventRequirement[];
  vendorSelections: EventVendorSelection[];
};

type WeddingDay = {
  id: string;
  name: string;
  date: string | null;
  notes: string | null;
  sort_order: number;
  events: WeddingEvent[];
};

type WeddingPayload = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    status: string;
    destination: Destination | null;
    package_tier: PackageTier | null;
  } | null;
  days: WeddingDay[];
};

const EMPTY_DAYS: WeddingDay[] = [];

type VendorPlannerOption = {
  id: string;
  business_name: string;
  slug: string;
  short_bio?: string | null;
  city?: string | null;
  rating?: number | null;
  services: {
    id: string;
    name: string;
    description?: string | null;
    service_scope?: string | null;
    base_price: number;
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
      image_urls: string[] | null;
      reference_url: string | null;
      sort_order: number | null;
    }[] | null;
  }[];
};

type VendorPlannerService = VendorPlannerOption["services"][number];
type VendorPlannerServiceItem = NonNullable<VendorPlannerService["items"]>[number];

type VenueOption = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  capacity?: number | null;
  price_range?: string | null;
  hero_image?: string | null;
  amenities?: string[] | null;
  destination?:
    | {
        name?: string | null;
        slug?: string | null;
        country?: string | null;
      }
    | {
        name?: string | null;
        slug?: string | null;
        country?: string | null;
      }[]
    | null;
};

type PriceRange = {
  min: number;
  max: number;
  source: string;
};

type SpendEstimate = {
  min: number;
  max: number;
  sourceCount: number;
  missingCount: number;
  sources: string[];
  legacyFallback: boolean;
};

type VendorDraftSelection = {
  vendorProfileId: string;
  vendorSlug: string;
  vendorServiceId: string;
};

type MenuItemDraft = {
  clientId: string;
  id: string | null;
  name: string;
  course: string;
  dietaryTags: string[];
  notes: string;
};

type MenuDraft = {
  clientId: string;
  id: string | null;
  name: string;
  mealPeriod: string;
  serviceStyle: string;
  notes: string;
  items: MenuItemDraft[];
};

type LogisticsDraft = {
  guestArrivalTime: string;
  vendorLoadInTime: string;
  familyCallTime: string;
  transportNotes: string;
  roomingNotes: string;
  weatherPlan: string;
  ceremonyNotes: string;
};

type EventTaskDraft = {
  clientId: string;
  id: string | null;
  title: string;
  owner: string;
  status: string;
  dueDate: string;
};

type EventRequirementDraft = {
  clientId: string;
  id: string | null;
  category: EventRequirementCategoryKey;
  title: string;
  status: string;
  priority: string;
  vendorProfileId: string | null;
  vendorServiceId: string | null;
  payload: Record<string, unknown>;
  notes: string;
};

type EventCreationDraft = {
  name: string;
  eventType: string;
  timeBlock: EventTimeBlockKey;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
};

type EventDetailDraft = {
  weddingDayId: string;
  name: string;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  guestCount: string;
  estimatedBudget: string;
  foodStyle: string;
  foodPreferences: string[];
  menuNotes: string;
  decorStyle: string;
  decorNotes: string;
  attireNotes: string;
  notes: string;
  menus: MenuDraft[];
  logistics: LogisticsDraft;
  tasks: EventTaskDraft[];
  requirements: EventRequirementDraft[];
  vendorSelections: Record<PlannerVendorCategoryKey, VendorDraftSelection[]>;
};

type EditorSectionKey =
  | "basics"
  | "food"
  | "design"
  | "media"
  | "entertainment"
  | "logistics"
  | "special"
  | "tasks"
  | "notes";

const EDITOR_SECTIONS: {
  key: EditorSectionKey;
  label: string;
  helper: string;
}[] = [
  {
    key: "basics",
    label: "Basics",
    helper: "Name, day, time, venue, guests, and derived spend context.",
  },
  {
    key: "food",
    label: "Food",
    helper: "Pick a caterer first, then import their catalogue into menus.",
  },
  {
    key: "design",
    label: "Design",
    helper: "Pick decor partners first, then shape palette and styling.",
  },
  {
    key: "media",
    label: "Photo & film",
    helper: "Assign the storyteller, coverage style, and visual deliverables.",
  },
  {
    key: "entertainment",
    label: "Entertainment",
    helper: "Assign artists, music direction, production, and energy cues.",
  },
  {
    key: "logistics",
    label: "Logistics",
    helper: "Select operations partners, transport, rooming, and backup plans.",
  },
  {
    key: "special",
    label: "Special",
    helper: "Capture custom needs that do not fit the standard sections.",
  },
  {
    key: "tasks",
    label: "Tasks",
    helper: "Event-specific action items and owners.",
  },
  {
    key: "notes",
    label: "Notes",
    helper: "Run-of-show notes and final planning reminders.",
  },
];

const MENU_BLUEPRINTS = [
  {
    label: "Cocktail flow",
    foodStyle: "Canapes and cocktails",
    mealPeriod: "Cocktail",
    serviceStyle: "Passed canapes, bar, and one live station",
    notes: "Built for mingling, short speeches, and high-energy guest movement.",
    preferences: ["Vegetarian", "Non-vegetarian"],
    items: [
      ["Welcome drink", "Welcome drink", "Signature mocktail and cocktail"],
      ["Passed canapes", "Starter", "Vegetarian and non-vegetarian rotation"],
      ["Live counter", "Live counter", "One hero station with chef interaction"],
      ["Dessert bites", "Dessert", "Small-format sweets for easy circulation"],
    ],
  },
  {
    label: "Main meal",
    foodStyle: "Buffet spread",
    mealPeriod: "Dinner",
    serviceStyle: "Buffet with live counters and table beverage service",
    notes: "A full meal structure with enough variety for mixed guest groups.",
    preferences: ["Vegetarian", "Non-vegetarian", "Jain"],
    items: [
      ["Pre-meal station", "Starter", "Chaat, kebab, or regional welcome station"],
      ["Main course", "Main", "Indian, global, and regional mains"],
      ["Beverage station", "Beverage", "Soft drinks, mocktails, and bar handoff"],
      ["Dessert room", "Dessert", "Indian sweets, plated desserts, and coffee"],
    ],
  },
  {
    label: "Day brunch",
    foodStyle: "Brunch service",
    mealPeriod: "Brunch",
    serviceStyle: "Relaxed brunch with counters and beverage stations",
    notes: "Best for recovery mornings, poolside lunches, and farewell hosting.",
    preferences: ["Vegetarian", "Kids menu", "Regional specialties"],
    items: [
      ["Fresh beverage bar", "Welcome drink", "Juices, coffee, tea, and hydration"],
      ["Breakfast counter", "Live counter", "Eggs, dosa, paratha, or waffle station"],
      ["Light mains", "Main", "Regional and continental brunch options"],
      ["Dessert and fruit", "Dessert", "Fruit, pastries, and small sweets"],
    ],
  },
] as const;

const LOGISTICS_BLUEPRINTS = [
  {
    label: "Resort flow",
    updates: {
      guestArrivalTime: "18:00",
      vendorLoadInTime: "14:00",
      familyCallTime: "17:30",
      transportNotes:
        "Map buggy / shuttle loop, valet point, driver holding area, and elder access.",
      roomingNotes:
        "Confirm getting-ready rooms, family holding rooms, and room-block handoff.",
      weatherPlan:
        "Keep indoor backup, tenting trigger, heat/rain plan, and signage swap ready.",
      ceremonyNotes:
        "Confirm procession route, cue points, seating hold, and family movement.",
    },
  },
  {
    label: "High-production",
    updates: {
      guestArrivalTime: "17:00",
      vendorLoadInTime: "12:00",
      familyCallTime: "16:30",
      transportNotes:
        "Separate guest entry, artist entry, production parking, and equipment lift path.",
      roomingNotes:
        "Create green rooms, family wait zones, artist holding, and security access.",
      weatherPlan:
        "Protect stage, LED, sound, power, and guest seating with a timed contingency.",
      ceremonyNotes:
        "Lock show caller, backstage cues, emcee handoff, and technical rehearsal.",
    },
  },
] as const;

const TASK_BLUEPRINTS = [
  {
    label: "Vendor handoff",
    tasks: [
      ["Confirm vendor scope and catalogue rows", "Planner"],
      ["Share final guest count and timing with vendors", "Planner"],
      ["Collect quote, payment schedule, and cancellation terms", "Finance"],
    ],
  },
  {
    label: "Run of show",
    tasks: [
      ["Build minute-by-minute run of show", "Planner"],
      ["Confirm family call times and holding areas", "Planner"],
      ["Share final cue sheet with venue and production", "Production"],
    ],
  },
] as const;

const MEDIA_COVERAGE_OPTIONS = [
  { value: "Editorial prep coverage", label: "Editorial prep coverage" },
  { value: "Family portraits", label: "Family portraits" },
  { value: "Candid guest moments", label: "Candid guest moments" },
  { value: "Drone / aerials", label: "Drone / aerials" },
  { value: "Short-form reels", label: "Short-form reels" },
  { value: "Same-day edit", label: "Same-day edit" },
  { value: "Couple portraits", label: "Couple portraits" },
  { value: "Aftermovie story arc", label: "Aftermovie story arc" },
] as const;

const FOOD_QUOTE_ONLY_OPTIONS = [
  "Imported ingredient station",
  "Celebrity chef counter",
  "Custom dessert room",
  "Premium bar upgrade",
  "Late-night after-party menu",
  "Regional live counter",
  "Kids / elder special meals",
  "Allergy-safe service line",
] as const;

const ENTERTAINMENT_DIRECTION_OPTIONS = [
  { value: "Welcome music", label: "Welcome music" },
  { value: "DJ-led dance floor", label: "DJ-led dance floor" },
  { value: "Live singer / band", label: "Live singer / band" },
  { value: "Dhol / baraat energy", label: "Dhol / baraat energy" },
  { value: "Emcee / host cues", label: "Emcee / host cues" },
  { value: "Sound and lights rider", label: "Sound and lights rider" },
  { value: "Artist green room", label: "Artist green room" },
  { value: "After-party handoff", label: "After-party handoff" },
] as const;

const SPECIAL_REQUIREMENT_OPTIONS = [
  { value: "VIP security", label: "VIP security" },
  { value: "Fireworks / cold pyro", label: "Fireworks / cold pyro" },
  { value: "Pet-friendly access", label: "Pet-friendly access" },
  { value: "Accessibility support", label: "Accessibility support" },
  { value: "Branding and signage", label: "Branding and signage" },
  { value: "Kids zone", label: "Kids zone" },
  { value: "Permit or license", label: "Permit or license" },
  { value: "Private gifting", label: "Private gifting" },
  { value: "Live streaming", label: "Live streaming" },
  { value: "Cultural protocol", label: "Cultural protocol" },
] as const;

const REQUIREMENT_STATUS_CHIPS = EVENT_REQUIREMENT_STATUS_OPTIONS.map((status) => ({
  value: status,
  label: requirementOptionLabel(status),
}));

const REQUIREMENT_PRIORITY_CHIPS = EVENT_REQUIREMENT_PRIORITY_OPTIONS.map(
  (priority) => ({
    value: priority,
    label: requirementOptionLabel(priority),
  })
);

const TASK_STATUS_CHIPS = EVENT_TASK_STATUS_OPTIONS.map((status) => ({
  value: status,
  label: requirementOptionLabel(status),
}));

const NOTE_PROMPTS = [
  "Family priority",
  "Vendor question",
  "Approval needed",
  "Weather concern",
  "Payment reminder",
  "On-site instruction",
] as const;

function draftId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createMenuItemDraft(): MenuItemDraft {
  return {
    clientId: draftId("menu_item"),
    id: null,
    name: "",
    course: "",
    dietaryTags: [],
    notes: "",
  };
}

function createMenuDraft(serviceStyle = ""): MenuDraft {
  return {
    clientId: draftId("menu"),
    id: null,
    name: "Primary menu",
    mealPeriod: "",
    serviceStyle,
    notes: "",
    items: [createMenuItemDraft()],
  };
}

function emptyLogisticsDraft(): LogisticsDraft {
  return {
    guestArrivalTime: "",
    vendorLoadInTime: "",
    familyCallTime: "",
    transportNotes: "",
    roomingNotes: "",
    weatherPlan: "",
    ceremonyNotes: "",
  };
}

function createTaskDraft(): EventTaskDraft {
  return {
    clientId: draftId("event_task"),
    id: null,
    title: "",
    owner: "",
    status: "OPEN",
    dueDate: "",
  };
}

function createRequirementDraft(
  category: EventRequirementCategoryKey
): EventRequirementDraft {
  const copy =
    EVENT_REQUIREMENT_CATEGORIES.find((entry) => entry.key === category) ??
    EVENT_REQUIREMENT_CATEGORIES.at(-1)!;

  return {
    clientId: draftId("event_requirement"),
    id: null,
    category,
    title: copy.label,
    status: "DRAFT",
    priority: category === "food" || category === "logistics" ? "HIGH" : "NORMAL",
    vendorProfileId: null,
    vendorServiceId: null,
    payload: { enabled: true },
    notes: copy.description,
  };
}

function defaultRequirementDrafts() {
  return EVENT_REQUIREMENT_CATEGORIES.filter(
    (category) => category.key !== "custom"
  ).map((category) => createRequirementDraft(category.key));
}

function nextAvailableTimeBlockForDay(day: WeddingDay): EventTimeBlockKey {
  const usedBlocks = new Set(
    day.events
      .map((event) => event.time_block)
      .filter((timeBlock): timeBlock is EventTimeBlockKey => Boolean(timeBlock))
  );

  return (
    EVENT_TIME_BLOCKS.find((block) => !usedBlocks.has(block.key))?.key ??
    "evening"
  );
}

function timeBlockDefaults(timeBlock: EventTimeBlockKey) {
  return (
    EVENT_TIME_BLOCKS.find((block) => block.key === timeBlock) ??
    EVENT_TIME_BLOCKS.at(-1)!
  );
}

function createEventDraftForDay(day?: WeddingDay): EventCreationDraft {
  const timeBlock = day ? nextAvailableTimeBlockForDay(day) : "evening";
  const defaults = timeBlockDefaults(timeBlock);

  return {
    name: "",
    eventType: "Custom",
    timeBlock,
    date: day?.date ? day.date.slice(0, 10) : "",
    startTime: defaults.defaultStartTime,
    endTime: defaults.defaultEndTime,
    venue: "",
  };
}

function emptyVendorSelections(): Record<
  PlannerVendorCategoryKey,
  VendorDraftSelection[]
> {
  return Object.fromEntries(
    PLANNER_VENDOR_CATEGORIES.map((category) => [
      category.key,
      [] as VendorDraftSelection[],
    ])
  ) as Record<PlannerVendorCategoryKey, VendorDraftSelection[]>;
}

function emptyVendorOptions(): Record<
  PlannerVendorCategoryKey,
  VendorPlannerOption[]
> {
  return Object.fromEntries(
    PLANNER_VENDOR_CATEGORIES.map((category) => [
      category.key,
      [] as VendorPlannerOption[],
    ])
  ) as Record<PlannerVendorCategoryKey, VendorPlannerOption[]>;
}

function buildDetailDraft(event: WeddingEvent): EventDetailDraft {
  const vendorSelections = emptyVendorSelections();

  for (const selection of event.vendorSelections) {
    const categorySlug = selection.vendor?.categorySlug;
    if (!categorySlug) continue;

    const plannerCategory = PLANNER_VENDOR_CATEGORIES.find(
      (entry) => entry.slug === categorySlug
    );
    if (!plannerCategory || !selection.vendor) continue;

    vendorSelections[plannerCategory.key].push({
      vendorProfileId: selection.vendor.id,
      vendorSlug: selection.vendor.slug,
      vendorServiceId: selection.service?.id ?? "",
    });
  }

  return {
    weddingDayId: event.wedding_day_id ?? "",
    name: event.name,
    eventType: event.event_type ?? "Custom",
    date: event.date ? event.date.slice(0, 10) : "",
    startTime: event.start_time ?? "",
    endTime: event.end_time ?? "",
    venue: event.venue ?? "",
    guestCount: event.guest_count ? String(event.guest_count) : "",
    estimatedBudget: event.estimated_budget
      ? String(event.estimated_budget)
      : "",
    foodStyle: event.food_style ?? "",
    foodPreferences: event.food_preferences ?? [],
    menuNotes: event.menu_notes ?? "",
    decorStyle: event.decor_style ?? "",
    decorNotes: event.decor_notes ?? "",
    attireNotes: event.attire_notes ?? "",
    notes: event.notes ?? "",
    menus:
      event.menus.length > 0
        ? event.menus.map((menu) => ({
            clientId: menu.id,
            id: menu.id,
            name: menu.name,
            mealPeriod: menu.mealPeriod ?? "",
            serviceStyle: menu.serviceStyle ?? "",
            notes: menu.notes ?? "",
            items: menu.items.length
              ? menu.items.map((item) => ({
                  clientId: item.id,
                  id: item.id,
                  name: item.name,
                  course: item.course ?? "",
                  dietaryTags: item.dietaryTags ?? [],
                  notes: item.notes ?? "",
                }))
              : [createMenuItemDraft()],
          }))
        : [createMenuDraft(event.food_style ?? "")],
    logistics: event.logistics
      ? {
          guestArrivalTime: event.logistics.guestArrivalTime ?? "",
          vendorLoadInTime: event.logistics.vendorLoadInTime ?? "",
          familyCallTime: event.logistics.familyCallTime ?? "",
          transportNotes: event.logistics.transportNotes ?? "",
          roomingNotes: event.logistics.roomingNotes ?? "",
          weatherPlan: event.logistics.weatherPlan ?? "",
          ceremonyNotes: event.logistics.ceremonyNotes ?? "",
        }
      : emptyLogisticsDraft(),
    tasks:
      event.tasks.length > 0
        ? event.tasks.map((task) => ({
            clientId: task.id,
            id: task.id,
            title: task.title,
            owner: task.owner ?? "",
            status: task.status || "OPEN",
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
          }))
        : [
            {
              ...createTaskDraft(),
              title: "Confirm final run of show",
              owner: "Planner",
            },
          ],
    requirements:
      (event.requirements ?? []).length > 0
        ? (event.requirements ?? [])
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((requirement) => ({
              clientId: requirement.id,
              id: requirement.id,
              category: requirement.category,
              title: requirement.title,
              status: requirement.status,
              priority: requirement.priority,
              vendorProfileId: requirement.vendorProfileId,
              vendorServiceId: requirement.vendorServiceId,
              payload: requirement.payload ?? {},
              notes: requirement.notes ?? "",
            }))
        : defaultRequirementDrafts(),
    vendorSelections,
  };
}

function planningPayloadFromDraft(draft: EventDetailDraft) {
  return {
    menus: draft.menus
      .filter((menu) => menu.name.trim() || menu.items.some((item) => item.name.trim()))
      .map((menu) => ({
        ...(menu.id ? { id: menu.id } : {}),
        name: menu.name,
        mealPeriod: menu.mealPeriod || null,
        serviceStyle: menu.serviceStyle || null,
        notes: menu.notes || null,
        items: menu.items
          .filter((item) => item.name.trim())
          .map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            name: item.name,
            course: item.course || null,
            dietaryTags: item.dietaryTags,
            notes: item.notes || null,
          })),
      })),
    logistics: draft.logistics,
    tasks: draft.tasks
      .filter((task) => task.title.trim())
      .map((task) => ({
        ...(task.id ? { id: task.id } : {}),
        title: task.title,
        owner: task.owner || null,
        status: task.status,
        dueDate: task.dueDate || null,
      })),
  };
}

function requirementsPayloadFromDraft(draft: EventDetailDraft) {
  return {
    requirements: draft.requirements
      .filter((requirement) => requirement.title.trim())
      .map((requirement) => ({
        ...(requirement.id ? { id: requirement.id } : {}),
        category: requirement.category,
        title: requirement.title,
        status: requirement.status,
        priority: requirement.priority,
        vendorProfileId: requirement.vendorProfileId,
        vendorServiceId: requirement.vendorServiceId,
        payload: requirement.payload,
        notes: requirement.notes || null,
      })),
  };
}

function formatDayDate(value: string | null) {
  if (!value) return "Date to be decided";
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatEventWindow(event: WeddingEvent) {
  const bits = [];
  if (event.start_time) bits.push(event.start_time);
  if (event.end_time) bits.push(event.end_time);
  return bits.length > 0 ? bits.join(" - ") : "Timing to be decided";
}

function eventSummaryChips(event: WeddingEvent) {
  return [
    event.event_type,
    event.food_style,
    event.decor_style,
    event.guest_count ? `${event.guest_count} guests` : null,
  ].filter(Boolean) as string[];
}

function sectionNodeShape(section: EditorSectionKey) {
  const shapes: Record<EditorSectionKey, string> = {
    basics: "rounded-full",
    food: "rounded-[1.25rem]",
    design: "rounded-tl-3xl rounded-br-3xl",
    media: "rounded-tr-3xl rounded-bl-3xl",
    entertainment: "rounded-[999px_999px_999px_0]",
    logistics: "rounded-[0_999px_999px_999px]",
    special: "rotate-[-1deg] rounded-lg",
    tasks: "rounded-sm",
    notes: "rotate-[1deg] rounded-2xl",
  };
  return shapes[section];
}

function readinessTone(percent: number) {
  if (percent >= 100) return "border-sage/35 bg-sage/10 text-sage";
  if (percent >= 70) return "border-gold-primary/35 bg-gold-primary/10 text-gold-dark";
  return "border-charcoal/12 bg-cream/50 text-slate";
}

function findEventById(days: WeddingDay[], eventId: string | null) {
  if (!eventId) return null;

  for (const day of days) {
    const found = day.events.find((event) => event.id === eventId);
    if (found) {
      return found;
    }
  }

  return null;
}

function findEventDay(days: WeddingDay[], eventId: string | null) {
  if (!eventId) return null;

  for (const day of days) {
    if (day.events.some((event) => event.id === eventId)) {
      return day;
    }
  }

  return null;
}

function eventReadinessPercent(event: WeddingEvent, venueOptions: VenueOption[]) {
  const needsFood = (event.requirements ?? []).some(
    (requirement) => requirement.category === "food"
  );
  const needsLogistics = (event.requirements ?? []).some(
    (requirement) => requirement.category === "logistics"
  );
  const estimate = estimateEventSpend(event, venueOptions);
  const checks = [
    Boolean(event.name.trim()),
    Boolean(event.date && event.start_time && event.end_time),
    Boolean(event.venue?.trim()),
    Boolean(event.guest_count && event.guest_count > 0),
    (event.requirements ?? []).length > 0,
    event.vendorSelections.length > 0 ||
      (event.requirements ?? []).some(
        (requirement) =>
          Boolean(requirement.vendorProfileId) ||
          Boolean(requirement.vendorServiceId)
      ),
    estimate.max > 0,
    !needsFood || event.menus.length > 0,
    !needsLogistics || hasLogisticsDetails(event.logistics),
    event.tasks.length > 0,
  ];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

function summarizeDayPlan(day: WeddingDay, venueOptions: VenueOption[]) {
  const eventCount = day.events.length;
  const estimatedSpend = combineSpendEstimates(
    day.events.map((event) => estimateEventSpend(event, venueOptions))
  );
  const vendorPicks = day.events.reduce(
    (sum, event) => sum + event.vendorSelections.length,
    0
  );
  const readiness =
    eventCount > 0
      ? Math.round(
          day.events.reduce(
            (sum, event) => sum + eventReadinessPercent(event, venueOptions),
            0
          ) / eventCount
        )
      : 0;
  return { eventCount, estimatedSpend, vendorPicks, readiness };
}

function formatBookingStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function relationOne<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function venueDestinationLabel(venue: VenueOption) {
  const destination = relationOne(venue.destination);
  return [destination?.name, destination?.country].filter(Boolean).join(", ");
}

function venueMatchesValue(venue: VenueOption, value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    venue.name.trim().toLowerCase() === normalized ||
    venue.slug.trim().toLowerCase() === normalized
  );
}

function findVenueByValue(venues: VenueOption[], value: string | null | undefined) {
  if (!value) return null;
  return venues.find((venue) => venueMatchesValue(venue, value)) ?? null;
}

function positiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function parseIndianMoneyToken(raw: string, inferredUnit?: string | null) {
  const match = raw
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l|k)?/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2] ?? inferredUnit ?? "";

  if (unit === "cr" || unit.startsWith("crore")) return Math.round(amount * 10000000);
  if (unit === "l" || unit.startsWith("lakh") || unit.startsWith("lac")) {
    return Math.round(amount * 100000);
  }
  if (unit === "k") return Math.round(amount * 1000);
  return Math.round(amount);
}

function parseVenuePriceRange(value: string | null | undefined): PriceRange | null {
  if (!value) return null;
  const normalized = value
    .replace(/[₹]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const unitMatch = normalized
    .toLowerCase()
    .match(/(crores?|cr|lakhs?|lacs?|l|k)\b/);
  const parts = normalized
    .split(/[–—-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = parts
    .map((part) => parseIndianMoneyToken(part, unitMatch?.[1]))
    .filter((entry): entry is number => Boolean(entry));

  if (parsed.length === 0) return null;
  const min = Math.min(...parsed);
  const max = Math.max(...parsed);
  return { min, max: max > 0 ? max : min, source: "venue range" };
}

function rangeFromServicePrice({
  base,
  max,
  unit,
  guestCount,
  source,
}: {
  base: number | null | undefined;
  max: number | null | undefined;
  unit?: string | null;
  guestCount: number | null;
  source: string;
}): PriceRange | null {
  const minPrice = positiveNumber(base);
  if (!minPrice) return null;
  const maxPrice = positiveNumber(max) ?? minPrice;
  const unitLabel = unit?.toLowerCase() ?? "";
  const isPerGuest =
    guestCount != null &&
    /guest|person|plate|pax|head/.test(unitLabel) &&
    maxPrice < 50000;
  const multiplier = isPerGuest ? guestCount : 1;

  return {
    min: Math.round(minPrice * multiplier),
    max: Math.round(Math.max(maxPrice, minPrice) * multiplier),
    source,
  };
}

function combineSpendRanges(
  ranges: PriceRange[],
  {
    missingCount = 0,
    fallback,
  }: {
    missingCount?: number;
    fallback?: PriceRange | null;
  } = {}
): SpendEstimate {
  const usableRanges = ranges.filter((range) => range.min > 0 || range.max > 0);
  const effectiveRanges = usableRanges.length > 0 ? usableRanges : fallback ? [fallback] : [];

  return {
    min: effectiveRanges.reduce((sum, range) => sum + range.min, 0),
    max: effectiveRanges.reduce((sum, range) => sum + Math.max(range.max, range.min), 0),
    sourceCount: effectiveRanges.length,
    missingCount,
    sources: uniqueList(effectiveRanges.map((range) => range.source)),
    legacyFallback: usableRanges.length === 0 && Boolean(fallback),
  };
}

function estimateEventSpend(
  event: WeddingEvent,
  venueOptions: VenueOption[]
): SpendEstimate {
  const guestCount = positiveNumber(event.guest_count);
  const ranges: PriceRange[] = [];
  let missingCount = 0;

  const venue = findVenueByValue(venueOptions, event.venue);
  const venueRange = parseVenuePriceRange(venue?.price_range);
  if (venueRange) {
    ranges.push({
      ...venueRange,
      source: `${venue?.name ?? "Venue"} catalogue`,
    });
  }

  for (const selection of event.vendorSelections) {
    const lockedAmount = positiveNumber(selection.totalAmount);
    if (lockedAmount) {
      ranges.push({
        min: lockedAmount,
        max: lockedAmount,
        source: selection.vendor?.businessName ?? "Booked vendor",
      });
      continue;
    }

    const serviceRange = rangeFromServicePrice({
      base: selection.service?.basePrice,
      max: selection.service?.maxPrice,
      unit: selection.service?.unit,
      guestCount,
      source:
        selection.service?.name ??
        selection.vendor?.businessName ??
        "Vendor service",
    });

    if (serviceRange) ranges.push(serviceRange);
    else missingCount += 1;
  }

  return combineSpendRanges(ranges, {
    missingCount,
    fallback: event.estimated_budget
      ? {
          min: event.estimated_budget,
          max: event.estimated_budget,
          source: "saved estimate",
        }
      : null,
  });
}

function estimateDraftSpend({
  draft,
  event,
  venueOptions,
  vendorOptions,
}: {
  draft: EventDetailDraft;
  event: WeddingEvent;
  venueOptions: VenueOption[];
  vendorOptions: Record<PlannerVendorCategoryKey, VendorPlannerOption[]>;
}): SpendEstimate {
  const guestCount = positiveNumber(Number(draft.guestCount));
  const ranges: PriceRange[] = [];
  let missingCount = 0;

  const venue = findVenueByValue(venueOptions, draft.venue);
  const venueRange = parseVenuePriceRange(venue?.price_range);
  if (venueRange) {
    ranges.push({
      ...venueRange,
      source: `${venue?.name ?? "Venue"} catalogue`,
    });
  }

  for (const category of PLANNER_VENDOR_CATEGORIES) {
    for (const selection of draft.vendorSelections[category.key]) {
      if (!selection.vendorProfileId) continue;
      const vendor = (vendorOptions[category.key] ?? []).find(
        (option) => option.id === selection.vendorProfileId
      );
      const service =
        vendor?.services.find((entry) => entry.id === selection.vendorServiceId) ??
        null;

      if (!service) {
        missingCount += 1;
        continue;
      }

      const serviceRange = rangeFromServicePrice({
        base: service.base_price,
        max: service.max_price,
        unit: service.unit,
        guestCount,
        source: service.name,
      });
      if (serviceRange) ranges.push(serviceRange);
      else missingCount += 1;
    }
  }

  const savedEstimate =
    ranges.length === 0 ? estimateEventSpend(event, venueOptions) : null;
  return combineSpendRanges(ranges, {
    missingCount: missingCount + (savedEstimate?.missingCount ?? 0),
    fallback:
      savedEstimate && (savedEstimate.min > 0 || savedEstimate.max > 0)
        ? {
            min: savedEstimate.min,
            max: savedEstimate.max,
            source: savedEstimate.legacyFallback
              ? "saved estimate"
              : "saved vendor picks",
          }
        : null,
  });
}

function combineSpendEstimates(estimates: SpendEstimate[]): SpendEstimate {
  return {
    min: estimates.reduce((sum, estimate) => sum + estimate.min, 0),
    max: estimates.reduce((sum, estimate) => sum + estimate.max, 0),
    sourceCount: estimates.reduce((sum, estimate) => sum + estimate.sourceCount, 0),
    missingCount: estimates.reduce((sum, estimate) => sum + estimate.missingCount, 0),
    sources: uniqueList(estimates.flatMap((estimate) => estimate.sources)),
    legacyFallback: estimates.some((estimate) => estimate.legacyFallback),
  };
}

function spendEstimateLabel(estimate: SpendEstimate) {
  if (estimate.max <= 0) return "Estimate pending";
  if (estimate.max === estimate.min) return formatCurrency(estimate.min);
  return `${formatCurrency(estimate.min)} - ${formatCurrency(estimate.max)}`;
}

function spendEstimateCaption(estimate: SpendEstimate) {
  if (estimate.max <= 0) {
    return "Pick a venue and vendor services to generate a live estimate.";
  }
  const sourceLabel =
    estimate.sourceCount === 1
      ? "1 pricing source"
      : `${estimate.sourceCount} pricing sources`;
  const gapLabel =
    estimate.missingCount > 0
      ? ` · ${estimate.missingCount} price gap${estimate.missingCount === 1 ? "" : "s"}`
      : "";
  const fallbackLabel = estimate.legacyFallback ? " · fallback from saved estimate" : "";
  return `${sourceLabel}${gapLabel}${fallbackLabel}`;
}

function gatedSpendEstimateLabel(
  estimate: SpendEstimate,
  readinessPercent: number
) {
  return readinessPercent >= 100
    ? spendEstimateLabel(estimate)
    : "Unlocks at 100%";
}

function gatedSpendEstimateCaption(
  estimate: SpendEstimate,
  readinessPercent: number
) {
  return readinessPercent >= 100
    ? spendEstimateCaption(estimate)
    : "Finish venue, guests, partners, menu/logistics, and tasks to reveal the estimate.";
}

function vendorCategorySection(
  categoryKey: PlannerVendorCategoryKey
): EditorSectionKey {
  if (categoryKey === "catering") return "food";
  if (categoryKey === "decor") return "design";
  if (categoryKey === "photography") return "media";
  if (categoryKey === "entertainment") return "entertainment";
  if (categoryKey === "logistics" || categoryKey === "hospitality") {
    return "logistics";
  }
  return "special";
}

function vendorCategoryForRequirement(
  category: EventRequirementCategoryKey
): PlannerVendorCategoryKey | null {
  if (category === "food") return "catering";
  if (category === "decor") return "decor";
  if (category === "photo-video") return "photography";
  if (category === "entertainment") return "entertainment";
  if (category === "logistics") return "logistics";
  if (category === "hospitality") return "hospitality";
  return null;
}

function requirementCategoriesForVendorPlanning(event: WeddingEvent) {
  const categories = uniqueList(
    (event.requirements ?? []).map((requirement) => requirement.category)
  ) as EventRequirementCategoryKey[];

  if (categories.length > 0) return categories;

  // Legacy events without requirement rows should still surface the main
  // partner lanes so a user is never trapped with an empty vendor flow.
  return [
    "food",
    "decor",
    "photo-video",
    "entertainment",
    "hospitality",
    "logistics",
  ] satisfies EventRequirementCategoryKey[];
}

function editorSectionsForEvent(event: WeddingEvent | null) {
  const categories = new Set<EventRequirementCategoryKey>(
    (event?.requirements ?? []).map((requirement) => requirement.category)
  );

  if (categories.size === 0) return EDITOR_SECTIONS;

  return EDITOR_SECTIONS.filter((section) => {
    if (section.key === "food") return categories.has("food");
    if (section.key === "design") return categories.has("decor");
    if (section.key === "media") return categories.has("photo-video");
    if (section.key === "entertainment") {
      return categories.has("entertainment");
    }
    if (section.key === "logistics") {
      return categories.has("logistics") || categories.has("hospitality");
    }
    return true;
  });
}

function vendorSelectionForCategory(
  event: WeddingEvent,
  categoryKey: PlannerVendorCategoryKey
) {
  const plannerCategory = PLANNER_VENDOR_CATEGORIES.find(
    (category) => category.key === categoryKey
  );
  if (!plannerCategory) return null;

  return (
    event.vendorSelections
      .filter((selection) => selection.vendor?.categorySlug === plannerCategory.slug)
      .at(-1) ?? null
  );
}

function firstMissingVendorCategory(event: WeddingEvent | null) {
  if (!event) return null;

  const requiredVendorCategories = uniqueList(
    requirementCategoriesForVendorPlanning(event)
      .map(vendorCategoryForRequirement)
      .filter((category): category is PlannerVendorCategoryKey => Boolean(category))
  ) as PlannerVendorCategoryKey[];

  return (
    requiredVendorCategories.find(
      (categoryKey) => !vendorSelectionForCategory(event, categoryKey)
    ) ?? null
  );
}

function firstVendorGapSection(event: WeddingEvent | null): EditorSectionKey {
  const missingCategory = firstMissingVendorCategory(event);
  return missingCategory ? vendorCategorySection(missingCategory) : "food";
}

function vendorDraftSelectionKey(selection: VendorDraftSelection) {
  return `${selection.vendorProfileId}:${selection.vendorServiceId || "no-service"}`;
}

function eventVendorSelectionKey(selection: EventVendorSelection) {
  return `${selection.vendor?.id ?? ""}:${selection.service?.id ?? "no-service"}`;
}

function uniqueVendorDraftSelections(selections: VendorDraftSelection[]) {
  const seen = new Set<string>();
  return selections.filter((selection) => {
    if (!selection.vendorProfileId) return false;
    const key = vendorDraftSelectionKey(selection);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function upsertVendorDraftSelection(
  selections: VendorDraftSelection[],
  nextSelection: VendorDraftSelection
) {
  return uniqueVendorDraftSelections([
    ...selections.filter(
      (selection) => vendorDraftSelectionKey(selection) !== vendorDraftSelectionKey(nextSelection)
    ),
    nextSelection,
  ]);
}

function removeVendorDraftSelection(
  selections: VendorDraftSelection[],
  selectionKey: string
) {
  return selections.filter(
    (selection) => vendorDraftSelectionKey(selection) !== selectionKey
  );
}

function nextBestPlannerAction(
  event: WeddingEvent | null,
  estimate: SpendEstimate | null
): {
  label: string;
  value: string;
  detail: string;
  section: EditorSectionKey;
} {
  if (!event) {
    return {
      label: "Next best action",
      value: "Open an event block",
      detail: "Pick a morning, afternoon, or evening block before editing details.",
      section: "basics",
    };
  }

  const needsFood = (event.requirements ?? []).some(
    (requirement) => requirement.category === "food"
  );
  const needsLogistics = (event.requirements ?? []).some(
    (requirement) => requirement.category === "logistics"
  );

  if (!event.venue?.trim()) {
    return {
      label: "Next best action",
      value: "Choose the venue card",
      detail: "Venue selection unlocks capacity context and venue-based spend range.",
      section: "basics",
    };
  }

  if (!event.guest_count || event.guest_count <= 0) {
    return {
      label: "Next best action",
      value: "Set the guest count",
      detail: "Guest count powers catering, seating, rooming, and per-person estimates.",
      section: "basics",
    };
  }

  if (needsFood && event.menus.length === 0) {
    return {
      label: "Next best action",
      value: "Pick the caterer first",
      detail:
        "Choose a catering partner or package, then import their catalogue rows into menus.",
      section: "food",
    };
  }

  const missingVendorCategory = firstMissingVendorCategory(event);
  if (missingVendorCategory) {
    const category = PLANNER_VENDOR_CATEGORIES.find(
      (entry) => entry.key === missingVendorCategory
    );
    return {
      label: "Next best action",
      value: `Choose ${category?.label.toLowerCase() ?? "partner"} package`,
      detail:
        "Each section now starts with its own partner cards, then customization happens under that choice.",
      section: vendorCategorySection(missingVendorCategory),
    };
  }

  if (!estimate || estimate.max <= 0 || estimate.missingCount > 0) {
    return {
      label: "Next best action",
      value: "Resolve pricing gaps",
      detail: "Choose packages with published prices inside each requirement section.",
      section: firstVendorGapSection(event),
    };
  }

  if (needsLogistics && !hasLogisticsDetails(event.logistics)) {
    return {
      label: "Next best action",
      value: "Apply logistics preset",
      detail: "Start with movement, rooming, weather, and load-in presets.",
      section: "logistics",
    };
  }

  if (event.tasks.length === 0) {
    return {
      label: "Next best action",
      value: "Add task templates",
      detail: "Drop in vendor handoff and run-of-show task packs.",
      section: "tasks",
    };
  }

  return {
    label: "Next best action",
    value: "Review finalization",
    detail: "This block is ready for the Layer 3 gap board.",
    section: "notes",
  };
}

function servicePriceLabel(service: VendorPlannerService) {
  const base = service.base_price ?? 0;
  const max = service.max_price ?? null;
  if (base <= 0) return "Price on request";
  if (max && max > base) {
    return `${formatCurrency(base)} - ${formatCurrency(max)}`;
  }
  return `From ${formatCurrency(base)}`;
}

function orderVendorOptionsByShortlist(
  options: VendorPlannerOption[],
  savedSlugs: string[]
) {
  const saved = new Set(savedSlugs);
  return options
    .slice()
    .sort((left, right) => {
      const leftSaved = saved.has(left.slug) ? 0 : 1;
      const rightSaved = saved.has(right.slug) ? 0 : 1;
      if (leftSaved !== rightSaved) return leftSaved - rightSaved;
      return (right.rating ?? 0) - (left.rating ?? 0);
    });
}

function requirementOptionLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueList(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const PLANNER_TAG_SEPARATOR = " · ";

function splitPlannerTags(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\n")) {
    return trimmed
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter((block) => block && !block.includes("\n"));
  }
  return uniqueList(trimmed.split(PLANNER_TAG_SEPARATOR));
}

function joinPlannerTags(tags: string[]) {
  return uniqueList(tags).join(PLANNER_TAG_SEPARATOR);
}

function labelValueOptions<T extends { label: string; value: string; hint?: string }>(
  options: T[]
) {
  return options.map((option) => ({ ...option, value: option.label }));
}

function mergePlannerTagsWithBlocks(
  existing: string | null | undefined,
  tags: string[]
) {
  const preservedBlocks = (existing ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && block.includes("\n"));
  return [...preservedBlocks, joinPlannerTags(tags)].filter(Boolean).join("\n\n");
}

function planningBlocksFromText(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && block.includes("\n"))
    .map((block) => {
      const [title = "Planning note", ...lines] = block.split("\n");
      return {
        title,
        lines: lines.map((line) => line.replace(/^-\s*/, "")).filter(Boolean),
      };
    });
}

function removePlanningBlock(current: string, title: string) {
  return current
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && block.split("\n")[0] !== title)
    .join("\n\n");
}

function appendPlanningBlock(current: string, title: string, lines: string[]) {
  const cleanedLines = lines.map((line) => line.trim()).filter(Boolean);
  if (cleanedLines.length === 0) return current;
  const block = [title, ...cleanedLines.map((line) => `- ${line}`)].join("\n");
  const trimmed = current.trim();
  if (!trimmed) return block;
  if (trimmed.includes(title)) return trimmed;
  return `${trimmed}\n\n${block}`;
}

function servicePlanningLines(
  service: VendorPlannerService,
  selectedItems: VendorPlannerServiceItem[]
) {
  const lines: string[] = [];
  if (service.service_scope) lines.push(`Scope: ${service.service_scope}`);
  if (selectedItems.length > 0) {
    lines.push(
      `Selected catalogue rows: ${selectedItems.map((item) => item.name).join(", ")}`
    );
  }
  if (service.inclusions?.length) {
    lines.push(`Includes: ${service.inclusions.join(", ")}`);
  }
  if (service.deliverables?.length) {
    lines.push(`Deliverables: ${service.deliverables.join(", ")}`);
  }
  if (service.add_ons?.length) {
    lines.push(`Optional add-ons: ${service.add_ons.join(", ")}`);
  }
  return lines;
}

function courseFromVendorItem(itemType: string) {
  switch (itemType) {
    case "addon":
      return "Live counter";
    case "menu":
      return "Main";
    default:
      return "";
  }
}

function menuDraftFromVendorService({
  vendorName,
  service,
  selectedItems,
  foodStyle,
}: {
  vendorName: string;
  service: VendorPlannerService;
  selectedItems: VendorPlannerServiceItem[];
  foodStyle: string;
}): MenuDraft {
  return {
    clientId: draftId("menu"),
    id: null,
    name: `${vendorName}: ${service.name}`,
    mealPeriod: "",
    serviceStyle: foodStyle || service.unit || "",
    notes: servicePlanningLines(service, selectedItems).join("\n"),
    items: selectedItems.map((item) => ({
      clientId: draftId("menu_item"),
      id: null,
      name: item.name,
      course: courseFromVendorItem(item.item_type),
      dietaryTags: item.dietary_tags ?? [],
      notes: item.description ?? "",
    })),
  };
}

export default function ClientWeddingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeddingPayload | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // Layer tab — Definition (what we're planning), Requirements (the existing
  // 7-step per-block editor, default), Finalization (gap checklist before
  // launch). Requirements is the primary work surface; the other two are
  // light read-mostly views over the same underlying day/event state.
  const [layer, setLayer] = useState<"definition" | "requirements" | "finalization">(
    "requirements"
  );
  const [showDayForm, setShowDayForm] = useState(false);
  const [dayDraft, setDayDraft] = useState({ name: "", date: "", notes: "" });
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayDraft, setEditingDayDraft] = useState({
    name: "",
    date: "",
    notes: "",
  });
  const [eventFormDayId, setEventFormDayId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<EventCreationDraft>(
    createEventDraftForDay
  );
  const [detailDraft, setDetailDraft] = useState<EventDetailDraft | null>(null);
  const [editorSection, setEditorSection] = useState<EditorSectionKey>("basics");
  const [savingDay, setSavingDay] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [vendorOptionsLoading, setVendorOptionsLoading] = useState(false);
  const [vendorOptions, setVendorOptions] = useState<
    Record<PlannerVendorCategoryKey, VendorPlannerOption[]>
  >(emptyVendorOptions);
  const [savedVendorSlugs, setSavedVendorSlugs] = useState<string[]>([]);
  const [venueOptionsLoading, setVenueOptionsLoading] = useState(false);
  const [venueOptions, setVenueOptions] = useState<VenueOption[]>([]);

  const loadWedding = useCallback(async () => {
    const response = await fetch("/api/wedding");
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to load event plan");
    }
    return json as WeddingPayload;
  }, []);

  const refreshWedding = useCallback(async () => {
    const payload = await loadWedding();
    setData(payload);
    return payload;
  }, [loadWedding]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await loadWedding();
        if (!cancelled) {
          setData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setData({ wedding: null, days: [] });
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load event details"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadWedding]);

  useEffect(() => {
    if (!data) return;

    const allEvents = data.days.flatMap((day) => day.events);
    if (allEvents.length === 0) {
      setSelectedEventId(null);
      return;
    }

    const stillExists = allEvents.some((event) => event.id === selectedEventId);
    if (selectedEventId && !stillExists) {
      setSelectedEventId(null);
    }
  }, [data, selectedEventId]);

  const wedding = data?.wedding ?? null;
  const days = data?.days ?? EMPTY_DAYS;
  const selectedEvent = findEventById(days, selectedEventId);
  const selectedDay = findEventDay(days, selectedEventId);

  useEffect(() => {
    if (!selectedEvent) {
      setDetailDraft(null);
      return;
    }

    setDetailDraft(buildDetailDraft(selectedEvent));
  }, [selectedEvent]);

  useEffect(() => {
    if (!wedding) return;

    let cancelled = false;

    (async () => {
      setVendorOptionsLoading(true);

      try {
        const entries = await Promise.all(
          PLANNER_VENDOR_CATEGORIES.map(async (category) => {
            const params = new URLSearchParams({
              category: category.slug,
              limit: "12",
            });

            if (wedding.destination?.slug) {
              params.set("destination", wedding.destination.slug);
            }

            const response = await fetch(`/api/vendors?${params.toString()}`);
            const json = await response.json();
            if (!response.ok) {
              throw new Error(json.error ?? "Failed to load vendors");
            }

            return [
              category.key,
              (json.vendors ?? []) as VendorPlannerOption[],
            ] as const;
          })
        );

        if (!cancelled) {
          setVendorOptions(
            Object.fromEntries(entries) as Record<
              PlannerVendorCategoryKey,
              VendorPlannerOption[]
            >
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load planner vendors"
          );
        }
      } finally {
        if (!cancelled) {
          setVendorOptionsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wedding]);

  useEffect(() => {
    if (!wedding) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/saved-vendors");
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load shortlist");
        }
        if (!cancelled) {
          setSavedVendorSlugs((json.savedSlugs ?? []) as string[]);
        }
      } catch {
        if (!cancelled) setSavedVendorSlugs([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wedding]);

  useEffect(() => {
    if (!wedding) return;

    let cancelled = false;

    (async () => {
      setVenueOptionsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "12" });
        if (wedding.destination?.slug) {
          params.set("destination", wedding.destination.slug);
        }

        const response = await fetch(`/api/venues?${params.toString()}`);
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load venues");
        }
        if (!cancelled) {
          setVenueOptions((json.venues ?? []) as VenueOption[]);
        }
      } catch (error) {
        if (!cancelled) {
          setVenueOptions([]);
          toast.error(
            error instanceof Error ? error.message : "Could not load venues"
          );
        }
      } finally {
        if (!cancelled) {
          setVenueOptionsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wedding]);

  const totalEvents = useMemo(
    () => days.reduce((sum, day) => sum + day.events.length, 0),
    [days]
  );

  const totalSelections = useMemo(
    () =>
      days.reduce(
        (sum, day) =>
          sum +
          day.events.reduce(
            (eventSum, event) => eventSum + event.vendorSelections.length,
            0
          ),
        0
      ),
    [days]
  );

  const estimatedSpend = useMemo(
    () =>
      combineSpendEstimates(
        days.flatMap((day) =>
          day.events.map((event) => estimateEventSpend(event, venueOptions))
        )
      ),
    [days, venueOptions]
  );

  const overallReadiness = useMemo(() => {
    const events = days.flatMap((day) => day.events);
    if (events.length === 0) return 0;
    return Math.round(
      events.reduce(
        (sum, event) => sum + eventReadinessPercent(event, venueOptions),
        0
      ) / events.length
    );
  }, [days, venueOptions]);

  const detailSpendEstimate = useMemo(() => {
    if (!selectedEvent || !detailDraft) return null;
    return estimateDraftSpend({
      draft: detailDraft,
      event: selectedEvent,
      venueOptions,
      vendorOptions,
    });
  }, [detailDraft, selectedEvent, venueOptions, vendorOptions]);

  const nextPlannerAction = useMemo(
    () => nextBestPlannerAction(selectedEvent, detailSpendEstimate),
    [detailSpendEstimate, selectedEvent]
  );

  const openEventSection = useCallback(
    (eventId: string, section: EditorSectionKey = "basics") => {
      setSelectedEventId(eventId);
      setEditorSection(section);
    },
    []
  );

  // Hide the dedicated sections for needs the client didn't ask for. Cross-cutting
  // sections (basics, special, tasks, notes) always show. If the event carries no
  // requirement rows at all — legacy plans, or a block created with zero needs —
  // we show everything so nothing is silently unreachable.
  const visibleEditorSections = useMemo(
    () => editorSectionsForEvent(selectedEvent),
    [selectedEvent]
  );
  const menuPlanningBlocks = useMemo(
    () => planningBlocksFromText(detailDraft?.menuNotes),
    [detailDraft?.menuNotes]
  );

  const activeEditorSection =
    visibleEditorSections.find((section) => section.key === editorSection) ??
    visibleEditorSections[0];

  const resolveFinalizationCheck = useCallback(
    (checkKey: string) => {
      if (checkKey === "definition") {
        setLayer("definition");
        return;
      }

      const firstEvent = days.flatMap((day) => day.events)[0] ?? null;
      if (!selectedEventId && firstEvent) {
        setSelectedEventId(firstEvent.id);
      }
      const targetEvent = selectedEvent ?? firstEvent;

      const sectionByCheck: Record<string, EditorSectionKey> = {
        requirements: "food",
        vendors: firstVendorGapSection(targetEvent),
        budget: "basics",
        "guests-hotels": "logistics",
        "run-of-show": "tasks",
      };

      setLayer("requirements");
      setEditorSection(sectionByCheck[checkKey] ?? "basics");
    },
    [days, selectedEvent, selectedEventId]
  );

  // Keep the active section within the set the selected event actually exposes,
  // so a hidden need-section can never become a dead/blank tab.
  useEffect(() => {
    if (
      !visibleEditorSections.some((section) => section.key === editorSection)
    ) {
      setEditorSection(visibleEditorSections[0]?.key ?? "basics");
    }
  }, [visibleEditorSections, editorSection]);

  const createDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingDay(true);

    try {
      const response = await fetch("/api/wedding/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dayDraft.name.trim() || undefined,
          date: dayDraft.date || undefined,
          notes: dayDraft.notes.trim() || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to add day");
      }

      await refreshWedding();
      setShowDayForm(false);
      setDayDraft({ name: "", date: "", notes: "" });
      toast.success("Celebration day added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add day"
      );
    } finally {
      setSavingDay(false);
    }
  };

  const saveDayEdits = async (dayId: string) => {
    setSavingDay(true);

    try {
      const response = await fetch(`/api/wedding/days/${dayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingDayDraft.name,
          date: editingDayDraft.date || null,
          notes: editingDayDraft.notes.trim() || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to update day");
      }

      await refreshWedding();
      setEditingDayId(null);
      toast.success("Day updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update day"
      );
    } finally {
      setSavingDay(false);
    }
  };

  const deleteDay = async (dayId: string) => {
    setSavingDay(true);

    try {
      const response = await fetch(`/api/wedding/days/${dayId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete day");
      }

      await refreshWedding();
      toast.success("Day removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete day"
      );
    } finally {
      setSavingDay(false);
    }
  };

  const openEventFormForDay = (day: WeddingDay | null | undefined) => {
    if (!day) {
      setShowDayForm(true);
      toast.info("Create a day first, then add events inside it.");
      return;
    }

    setLayer("requirements");
    setEventFormDayId(day.id);
    setEventDraft(createEventDraftForDay(day));
  };

  const moveDay = async (dayId: string, direction: -1 | 1) => {
    const dayIndex = days.findIndex((day) => day.id === dayId);
    const otherDay = days[dayIndex + direction];
    const currentDay = days[dayIndex];

    if (!currentDay || !otherDay) return;

    setSavingDay(true);

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/wedding/days/${currentDay.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: otherDay.sort_order }),
        }),
        fetch(`/api/wedding/days/${otherDay.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: currentDay.sort_order }),
        }),
      ]);
      const [jsonA, jsonB] = await Promise.all([
        resA.json() as Promise<{ error?: string }>,
        resB.json() as Promise<{ error?: string }>,
      ]);
      if (!resA.ok) {
        throw new Error(jsonA.error ?? "Failed to reorder days");
      }
      if (!resB.ok) {
        throw new Error(jsonB.error ?? "Failed to reorder days");
      }

      await refreshWedding();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not reorder days"
      );
    } finally {
      setSavingDay(false);
    }
  };

  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventFormDayId || !eventDraft.name.trim()) return;

    setSavingEvent(true);

    try {
      const response = await fetch("/api/wedding/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingDayId: eventFormDayId,
          name: eventDraft.name,
          eventType: eventDraft.eventType,
          timeBlock: eventDraft.timeBlock,
          date: eventDraft.date || null,
          startTime: eventDraft.startTime || null,
          endTime: eventDraft.endTime || null,
          venue: eventDraft.venue || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to add event");
      }

      const payload = await refreshWedding();
      const createdEventId = json.event?.id as string | undefined;
      if (createdEventId) {
        setSelectedEventId(createdEventId);
      } else {
        setSelectedEventId(
          payload.days.find((day) => day.id === eventFormDayId)?.events.at(-1)?.id ??
            null
        );
      }
      setEventDraft(createEventDraftForDay());
      setEventFormDayId(null);
      toast.success("Event added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add event"
      );
    } finally {
      setSavingEvent(false);
    }
  };

  const syncVendorSelections = async (
    event: WeddingEvent,
    draft: EventDetailDraft
  ) => {
    const currentSelectionsByCategory = Object.fromEntries(
      PLANNER_VENDOR_CATEGORIES.map((category) => [
        category.key,
        event.vendorSelections.filter(
          (selection) => selection.vendor?.categorySlug === category.slug
        ),
      ])
    ) as Record<PlannerVendorCategoryKey, EventVendorSelection[]>;

    for (const category of PLANNER_VENDOR_CATEGORIES) {
      const currentSelections = currentSelectionsByCategory[category.key];
      const nextSelections = uniqueVendorDraftSelections(
        draft.vendorSelections[category.key]
      );
      const currentByKey = new Map(
        currentSelections.map((selection) => [
          eventVendorSelectionKey(selection),
          selection,
        ])
      );
      const nextKeys = new Set(nextSelections.map(vendorDraftSelectionKey));

      for (const currentSelection of currentSelections) {
        const currentKey = eventVendorSelectionKey(currentSelection);
        if (nextKeys.has(currentKey)) continue;

        if (currentSelection.status !== "INQUIRY") {
          throw new Error(
            `${category.label} is already ${formatBookingStatus(
              currentSelection.status
            )}. Update that booking from the bookings area instead.`
          );
        }

        const deleteResponse = await fetch(`/api/bookings/${currentSelection.id}`, {
          method: "DELETE",
        });
        const deleteJson = await deleteResponse.json();
        if (!deleteResponse.ok) {
          throw new Error(
            deleteJson.error ?? `Failed to clear ${category.label.toLowerCase()}`
          );
        }
      }

      for (const nextSelection of nextSelections) {
        if (currentByKey.has(vendorDraftSelectionKey(nextSelection))) continue;

        const createResponse = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorProfileId: nextSelection.vendorProfileId,
            vendorServiceId: nextSelection.vendorServiceId || undefined,
            weddingEventId: event.id,
            eventDate: draft.date || null,
            notes: `Planner selection for ${event.name}`,
          }),
        });
        const createJson = await createResponse.json();
        if (!createResponse.ok) {
          throw new Error(
            createJson.error ?? `Failed to save ${category.label.toLowerCase()}`
          );
        }
      }
    }
  };

  const saveEventDetails = async () => {
    if (!selectedEvent || !detailDraft) return;

    setSavingDetail(true);

    try {
      const response = await fetch(`/api/wedding/events/${selectedEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingDayId: detailDraft.weddingDayId,
          name: detailDraft.name,
          eventType: detailDraft.eventType,
          date: detailDraft.date || null,
          startTime: detailDraft.startTime || null,
          endTime: detailDraft.endTime || null,
          venue: detailDraft.venue || null,
          guestCount: detailDraft.guestCount
            ? Number(detailDraft.guestCount)
            : null,
          estimatedBudget:
            detailSpendEstimate && detailSpendEstimate.min > 0
              ? detailSpendEstimate.min
              : null,
          foodStyle: detailDraft.foodStyle || null,
          foodPreferences: detailDraft.foodPreferences,
          menuNotes: detailDraft.menuNotes || null,
          decorStyle: detailDraft.decorStyle || null,
          decorNotes: detailDraft.decorNotes || null,
          attireNotes: detailDraft.attireNotes || null,
          notes: detailDraft.notes || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save event");
      }

      const planningResponse = await fetch(
        `/api/wedding/events/${selectedEvent.id}/planning`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planningPayloadFromDraft(detailDraft)),
        }
      );
      const planningJson = await planningResponse.json();
      if (!planningResponse.ok) {
        throw new Error(planningJson.error ?? "Failed to save event planning");
      }

      const requirementsResponse = await fetch(
        `/api/wedding/events/${selectedEvent.id}/requirements`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requirementsPayloadFromDraft(detailDraft)),
        }
      );
      const requirementsJson = await requirementsResponse.json();
      if (!requirementsResponse.ok) {
        throw new Error(
          requirementsJson.error ?? "Failed to save event requirements"
        );
      }

      await syncVendorSelections(selectedEvent, detailDraft);
      await refreshWedding();
      toast.success("Event plan saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save event"
      );
    } finally {
      setSavingDetail(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    const eventToDelete = findEventById(days, eventId);
    const shouldDelete =
      !eventToDelete ||
      window.confirm(
        `Delete "${eventToDelete.name}"? This removes its menus, requirements, tasks, and draft vendor inquiries.`
      );

    if (!shouldDelete) return;

    setSavingDetail(true);

    try {
      const response = await fetch(`/api/wedding/events/${eventId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete event");
      }

      const payload = await refreshWedding();
      const nextEvent =
        payload.days.flatMap((day) => day.events).find((event) => event.id !== eventId) ??
        null;
      setSelectedEventId(nextEvent?.id ?? null);
      toast.success("Event removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    } finally {
      setSavingDetail(false);
    }
  };

  const deleteEventPlan = async () => {
    if (!wedding) return;

    const typed = window.prompt(
      `Type DELETE to permanently remove "${wedding.name}" and its days, events, menus, logistics, tasks, and draft vendor inquiries. Confirmed booking history will be preserved but unlinked.`
    );

    if (typed !== "DELETE") {
      toast.info("Event plan delete cancelled");
      return;
    }

    setDeletingPlan(true);

    try {
      const response = await fetch("/api/wedding", {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete event plan");
      }

      setData({ wedding: null, days: [] });
      setSelectedEventId(null);
      setDetailDraft(null);
      setLayer("definition");
      toast.success("Event plan deleted. Start a fresh structure when you're ready.");
      router.replace("/client/onboarding");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event plan"
      );
    } finally {
      setDeletingPlan(false);
    }
  };

  const nudgeEvent = async (eventId: string, direction: -1 | 1) => {
    const day = findEventDay(days, eventId);
    if (!day) return;

    const eventIndex = day.events.findIndex((entry) => entry.id === eventId);
    const otherEvent = day.events[eventIndex + direction];
    const currentEvent = day.events[eventIndex];
    if (!currentEvent || !otherEvent) return;

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/wedding/events/${currentEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weddingDayId: day.id,
            sortOrder: otherEvent.sort_order,
          }),
        }),
        fetch(`/api/wedding/events/${otherEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weddingDayId: day.id,
            sortOrder: currentEvent.sort_order,
          }),
        }),
      ]);
      const [jsonA, jsonB] = await Promise.all([
        resA.json() as Promise<{ error?: string }>,
        resB.json() as Promise<{ error?: string }>,
      ]);
      if (!resA.ok) {
        throw new Error(jsonA.error ?? "Failed to reorder event");
      }
      if (!resB.ok) {
        throw new Error(jsonB.error ?? "Failed to reorder event");
      }

      await refreshWedding();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not reorder event"
      );
    }
  };

  const handleDropOnDay = async (dayId: string) => {
    if (!draggedEventId) return;

    const draggedEvent = findEventById(days, draggedEventId);
    const targetDay = days.find((day) => day.id === dayId);
    if (!draggedEvent || !targetDay) {
      setDraggedEventId(null);
      return;
    }

    if (draggedEvent.wedding_day_id === dayId) {
      setDraggedEventId(null);
      return;
    }

    const nextSortOrder =
      targetDay.events.reduce(
        (max, event) => Math.max(max, event.sort_order),
        -1
      ) + 1;

    try {
      const response = await fetch(`/api/wedding/events/${draggedEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingDayId: dayId,
          sortOrder: nextSortOrder,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Could not move event");
      }

      await refreshWedding();
      setSelectedEventId(draggedEvent.id);
      toast.success("Event moved to a new day");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not move event"
      );
    } finally {
      setDraggedEventId(null);
    }
  };

  const updateLogisticsDraft = (updates: Partial<LogisticsDraft>) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            logistics: { ...current.logistics, ...updates },
          }
        : current
    );
  };

  const addPlanningNoteBlock = (title: string, lines: string[]) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            notes: appendPlanningBlock(current.notes, title, lines),
          }
        : current
    );
    toast.success(`${title} added to planning notes`);
  };

  const addSpecialRequirement = (title?: string) => {
    setDetailDraft((current) => {
      if (!current) return current;
      const baseRequirement = createRequirementDraft("custom");
      return {
        ...current,
        requirements: [
          ...current.requirements,
          {
            ...baseRequirement,
            title: title ?? baseRequirement.title,
            priority: "HIGH",
            notes:
              title && title !== baseRequirement.title
                ? "Describe the exact owner, approval, vendor, or operating detail needed for this special requirement."
                : baseRequirement.notes,
          },
        ],
      };
    });
  };

  const updateRequirementDraft = (
    clientId: string,
    updates: Partial<EventRequirementDraft>
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            requirements: current.requirements.map((requirement) =>
              requirement.clientId === clientId
                ? { ...requirement, ...updates }
                : requirement
            ),
          }
        : current
    );
  };

  const removeRequirementDraft = (clientId: string) => {
    setDetailDraft((current) => {
      if (!current) return current;
      const nextRequirements = current.requirements.filter(
        (requirement) => requirement.clientId !== clientId
      );
      return { ...current, requirements: nextRequirements };
    });
  };

  const addMenu = () => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus: [...current.menus, createMenuDraft(current.foodStyle)],
          }
        : current
    );
  };

  const applyMenuBlueprint = (blueprint: (typeof MENU_BLUEPRINTS)[number]) => {
    setDetailDraft((current) => {
      if (!current) return current;

      const blueprintMenu: MenuDraft = {
        clientId: draftId("menu"),
        id: null,
        name: blueprint.label,
        mealPeriod: blueprint.mealPeriod,
        serviceStyle: blueprint.serviceStyle,
        notes: blueprint.notes,
        items: blueprint.items.map(([name, course, notes]) => ({
          clientId: draftId("menu_item"),
          id: null,
          name,
          course,
          dietaryTags: [],
          notes,
        })),
      };
      const hasPlannedMenu = current.menus.some(
        (menu) =>
          menu.name.trim() ||
          menu.notes.trim() ||
          menu.items.some((item) => item.name.trim())
      );

      return {
        ...current,
        foodStyle: blueprint.foodStyle,
        foodPreferences: uniqueList([
          ...current.foodPreferences,
          ...blueprint.preferences,
        ]),
        menuNotes: appendPlanningBlock(current.menuNotes, blueprint.label, [
          blueprint.notes,
          blueprint.serviceStyle,
        ]),
        menus: hasPlannedMenu ? [...current.menus, blueprintMenu] : [blueprintMenu],
      };
    });
    toast.success(`${blueprint.label} starter added`);
  };

  const addFoodQuoteOnlyItem = (item: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menuNotes: appendPlanningBlock(current.menuNotes, `Quote-only: ${item}`, [
              "Exclude this from estimate until vendor quote is received.",
            ]),
          }
        : current
    );
    toast.success(`${item} marked as quote-only`);
  };

  const removeMenuPlanningBlock = (title: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menuNotes: removePlanningBlock(current.menuNotes, title),
          }
        : current
    );
  };

  const applyVendorServiceToPlan = ({
    categoryKey,
    vendor,
    service,
    selectedItemIds,
  }: {
    categoryKey: PlannerVendorCategoryKey;
    vendor: VendorPlannerOption;
    service: VendorPlannerService;
    selectedItemIds: string[];
  }) => {
    const catalogueItems = (service.items ?? []).slice().sort(
      (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
    );
    const selectedItems =
      catalogueItems.length > 0
        ? catalogueItems.filter((item) => selectedItemIds.includes(item.id))
        : [];
    const title = `${vendor.business_name}: ${service.name}`;
    const lines = servicePlanningLines(service, selectedItems);
    const taskTitle = `Confirm ${vendor.business_name} ${service.name} scope`;

    setDetailDraft((current) => {
      if (!current) return current;

      const nextVendorSelections = {
        ...current.vendorSelections,
        [categoryKey]: upsertVendorDraftSelection(
          current.vendorSelections[categoryKey],
          {
            vendorProfileId: vendor.id,
            vendorSlug: vendor.slug,
            vendorServiceId: service.id,
          }
        ),
      };
      const nextTasks = current.tasks.some((task) => task.title === taskTitle)
        ? current.tasks
        : [
            ...current.tasks,
            {
              ...createTaskDraft(),
              title: taskTitle,
              owner: "Planner",
            },
          ];

      if (categoryKey === "catering") {
        const selectedDietaryTags = selectedItems.flatMap(
          (item) => item.dietary_tags ?? []
        );

        return {
          ...current,
          vendorSelections: nextVendorSelections,
          menus: [
            ...current.menus,
            menuDraftFromVendorService({
              vendorName: vendor.business_name,
              service,
              selectedItems,
              foodStyle: current.foodStyle,
            }),
          ],
          foodPreferences: uniqueList([
            ...current.foodPreferences,
            ...selectedDietaryTags,
          ]),
          menuNotes: appendPlanningBlock(current.menuNotes, title, lines),
          tasks: nextTasks,
        };
      }

      if (categoryKey === "decor") {
        return {
          ...current,
          vendorSelections: nextVendorSelections,
          decorNotes: appendPlanningBlock(current.decorNotes, title, lines),
          tasks: nextTasks,
        };
      }

      if (categoryKey === "logistics") {
        return {
          ...current,
          vendorSelections: nextVendorSelections,
          logistics: {
            ...current.logistics,
            transportNotes: appendPlanningBlock(
              current.logistics.transportNotes,
              title,
              lines
            ),
          },
          tasks: nextTasks,
        };
      }

      if (categoryKey === "hospitality") {
        return {
          ...current,
          vendorSelections: nextVendorSelections,
          logistics: {
            ...current.logistics,
            roomingNotes: appendPlanningBlock(
              current.logistics.roomingNotes,
              title,
              lines
            ),
          },
          tasks: nextTasks,
        };
      }

      return {
        ...current,
        vendorSelections: nextVendorSelections,
        notes: appendPlanningBlock(current.notes, title, lines),
        tasks: nextTasks,
      };
    });

    toast.success(
      categoryKey === "catering"
        ? "Catalogue rows added. Keep editing this menu or add another package."
        : "Offering added. Keep editing this section or add another package."
    );
  };

  const applyLogisticsBlueprint = (
    blueprint: (typeof LOGISTICS_BLUEPRINTS)[number]
  ) => {
    setDetailDraft((current) => {
      if (!current) return current;
      const updates = blueprint.updates;
      return {
        ...current,
        logistics: {
          guestArrivalTime:
            current.logistics.guestArrivalTime || updates.guestArrivalTime,
          vendorLoadInTime:
            current.logistics.vendorLoadInTime || updates.vendorLoadInTime,
          familyCallTime:
            current.logistics.familyCallTime || updates.familyCallTime,
          transportNotes: appendPlanningBlock(
            current.logistics.transportNotes,
            blueprint.label,
            [updates.transportNotes]
          ),
          roomingNotes: appendPlanningBlock(
            current.logistics.roomingNotes,
            blueprint.label,
            [updates.roomingNotes]
          ),
          weatherPlan: appendPlanningBlock(current.logistics.weatherPlan, blueprint.label, [
            updates.weatherPlan,
          ]),
          ceremonyNotes: appendPlanningBlock(
            current.logistics.ceremonyNotes,
            blueprint.label,
            [updates.ceremonyNotes]
          ),
        },
      };
    });
    toast.success(`${blueprint.label} logistics added`);
  };

  const applyTaskBlueprint = (blueprint: (typeof TASK_BLUEPRINTS)[number]) => {
    setDetailDraft((current) => {
      if (!current) return current;
      const existing = new Set(current.tasks.map((task) => task.title));
      const nextTasks = blueprint.tasks
        .filter(([title]) => !existing.has(title))
        .map(([title, owner]) => ({
          ...createTaskDraft(),
          title,
          owner,
        }));

      return {
        ...current,
        tasks: [...current.tasks, ...nextTasks],
      };
    });
    toast.success(`${blueprint.label} tasks added`);
  };

  const selectPlannerVendor = (
    categoryKey: PlannerVendorCategoryKey,
    vendor: VendorPlannerOption | null
  ) => {
    setDetailDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        vendorSelections: {
          ...current.vendorSelections,
          [categoryKey]: vendor
            ? upsertVendorDraftSelection(current.vendorSelections[categoryKey], {
                vendorProfileId: vendor.id,
                vendorSlug: vendor.slug,
                vendorServiceId: "",
              })
            : [],
        },
      };
    });
  };

  const selectPlannerService = (
    categoryKey: PlannerVendorCategoryKey,
    vendorServiceId: string
  ) => {
    setDetailDraft((current) => {
      if (!current) return current;
      const selections = current.vendorSelections[categoryKey];
      const activeSelection = selections.at(-1);
      if (!activeSelection) return current;

      return {
        ...current,
        vendorSelections: {
          ...current.vendorSelections,
          [categoryKey]: upsertVendorDraftSelection(
            selections.filter(
              (selection) =>
                !(
                  selection.vendorProfileId === activeSelection.vendorProfileId &&
                  !selection.vendorServiceId
                )
            ),
            {
              ...activeSelection,
              vendorServiceId,
            }
          ),
        },
      };
    });
  };

  const removePlannerVendorSelection = (
    categoryKey: PlannerVendorCategoryKey,
    selectionKey: string
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            vendorSelections: {
              ...current.vendorSelections,
              [categoryKey]: removeVendorDraftSelection(
                current.vendorSelections[categoryKey],
                selectionKey
              ),
            },
          }
        : current
    );
  };

  const updateMenuDraft = (
    menuClientId: string,
    updates: Partial<Omit<MenuDraft, "items" | "clientId">>
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) =>
              menu.clientId === menuClientId ? { ...menu, ...updates } : menu
            ),
          }
        : current
    );
  };

  const removeMenu = (menuClientId: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus:
              current.menus.length > 1
                ? current.menus.filter((menu) => menu.clientId !== menuClientId)
                : current.menus,
          }
        : current
    );
  };

  const addMenuItem = (menuClientId: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) =>
              menu.clientId === menuClientId
                ? { ...menu, items: [...menu.items, createMenuItemDraft()] }
                : menu
            ),
          }
        : current
    );
  };

  const updateMenuItem = (
    menuClientId: string,
    itemClientId: string,
    updates: Partial<Omit<MenuItemDraft, "clientId">>
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) =>
              menu.clientId === menuClientId
                ? {
                    ...menu,
                    items: menu.items.map((item) =>
                      item.clientId === itemClientId
                        ? { ...item, ...updates }
                        : item
                    ),
                  }
                : menu
            ),
          }
        : current
    );
  };

  const removeMenuItem = (menuClientId: string, itemClientId: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) =>
              menu.clientId === menuClientId
                ? {
                    ...menu,
                    items:
                      menu.items.length > 1
                        ? menu.items.filter((item) => item.clientId !== itemClientId)
                        : menu.items,
                  }
                : menu
            ),
          }
        : current
    );
  };

  const addTask = () => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            tasks: [...current.tasks, createTaskDraft()],
          }
        : current
    );
  };

  const updateTask = (
    taskClientId: string,
    updates: Partial<Omit<EventTaskDraft, "clientId">>
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.clientId === taskClientId ? { ...task, ...updates } : task
            ),
          }
        : current
    );
  };

  const removeTask = (taskClientId: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            tasks:
              current.tasks.length > 1
                ? current.tasks.filter((task) => task.clientId !== taskClientId)
                : current.tasks,
          }
        : current
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-12 w-64 bg-charcoal/10" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 border border-charcoal/8 bg-charcoal/5" />
          <div className="h-32 border border-charcoal/8 bg-charcoal/5" />
          <div className="h-32 border border-charcoal/8 bg-charcoal/5" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="h-[520px] border border-charcoal/8 bg-charcoal/5" />
          <div className="h-[520px] border border-charcoal/8 bg-charcoal/5" />
        </div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="text-[15px] md:text-base [&_.text-sm]:text-[15px] [&_.text-xs]:text-sm [&_input]:text-base [&_select]:text-base [&_textarea]:text-base"
      >
        <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
          <p className={dashLabel}>Event plan</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal md:text-4xl">
            No event plan yet
          </h2>
          <p className="font-heading mt-2 text-sm text-slate">
            Complete onboarding to shape your celebration, day by day.
          </p>
        </motion.header>
        <div className="mt-12">
          <ListEmptyState
            title="Create your first event structure"
            hint="Start with event type, number of days, and morning / afternoon / evening blocks."
          />
          <div className="mt-6 flex justify-center">
            <Link href="/client/onboarding" className={dashBtn}>
              Create event plan
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="text-[15px] md:text-base [&_.text-sm]:text-[15px] [&_.text-xs]:text-sm [&_input]:text-base [&_select]:text-base [&_textarea]:text-base"
    >
      <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
        <p className={dashLabel}>Event operating plan</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold text-charcoal md:text-4xl">
              {wedding.name}
            </h2>
            <p className="font-heading mt-2 max-w-2xl text-sm text-slate">
              Build the celebration day by day. Each event can carry its own
              timing, guest flow, menu logic, decor brief, and vendor picks.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="font-heading text-sm text-slate">
              {wedding.date
                ? new Date(wedding.date).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Date TBD"}
            </div>
            <button
              type="button"
              className="border border-rose/35 px-4 py-2.5 font-accent text-[10px] uppercase tracking-[0.18em] text-rose transition-colors hover:bg-rose hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deletingPlan}
              onClick={() => void deleteEventPlan()}
            >
              {deletingPlan ? "Deleting..." : "Delete event plan"}
            </button>
          </div>
        </div>
      </motion.header>

      <motion.div variants={fadeUp} className="mt-8 grid gap-4 md:grid-cols-3">
        <div className={dashCard}>
          <p className={dashLabel}>Celebration days</p>
          <p className="mt-3 font-display text-3xl text-charcoal">{days.length}</p>
          <p className="mt-2 text-sm text-slate">
            Rename them, reorder them, and keep each event anchored to a real day.
          </p>
        </div>
        <div className={dashCard}>
          <p className={dashLabel}>Events planned</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="font-display text-3xl text-charcoal">{totalEvents}</p>
            <ProgressRing
              percent={overallReadiness}
              size={62}
              stroke={4}
              label=""
            />
          </div>
          <p className="mt-2 text-sm text-slate">
            {overallReadiness}% planner readiness across all active event blocks.
          </p>
        </div>
        <div className={dashCard}>
          <p className={dashLabel}>Derived event spend</p>
          <p className="mt-3 font-display text-3xl text-charcoal">
            {gatedSpendEstimateLabel(estimatedSpend, overallReadiness)}
          </p>
          <p className="mt-2 text-sm text-slate">
            {totalSelections} vendor selections ·{" "}
            {gatedSpendEstimateCaption(estimatedSpend, overallReadiness)}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-10 border-b border-charcoal/10"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <p className={dashLabel}>Layered planner</p>
            <p className="mt-1 text-xs leading-relaxed text-slate">
              {layer === "definition"
                ? "Step 1 · Confirm the shape — name, days, time blocks."
                : layer === "requirements"
                  ? "Step 2 · Choose partners, import packages, then customize details."
                  : "Step 3 · Close the gaps before go-live."}
            </p>
          </div>
          <div className="inline-flex border border-charcoal/12 bg-cream/30 p-1">
            {(
              [
                { key: "definition", label: "1 · Definition" },
                { key: "requirements", label: "2 · Requirements" },
                { key: "finalization", label: "3 · Finalization" },
              ] as const
            ).map((tab) => {
              const active = layer === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLayer(tab.key)}
                  className={cn(
                    "font-accent inline-flex items-center justify-center px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors",
                    active
                      ? "bg-charcoal text-ivory"
                      : "text-slate hover:text-charcoal"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {layer === "definition" ? (
        <DefinitionLayer
          weddingName={wedding.name}
          days={days}
          totalEvents={totalEvents}
        />
      ) : null}

      {layer === "finalization" ? (
        <FinalizationLayer
          days={days}
          venueOptions={venueOptions}
          weddingDate={wedding.date}
          onResolveCheck={resolveFinalizationCheck}
        />
      ) : null}

      {layer === "requirements" ? (
      <>
      <LayerTwoGuidance
        selectedEvent={selectedEvent}
        selectedDay={selectedDay}
        venueOptionsCount={venueOptions.length}
        savedVendorCount={savedVendorSlugs.length}
        nextAction={nextPlannerAction}
        onOpenSection={(section) => setEditorSection(section)}
      />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="xl:order-2 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
          <motion.div
            variants={fadeUp}
            className="flex flex-col gap-4 border-b border-charcoal/10 pb-5"
          >
            <div>
              <p className={dashLabel}>Celebration flow map</p>
              <h3 className="mt-2 font-display text-2xl text-charcoal">
                Pick a day, function, or step
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate">
                The editor opens only after you choose a function. Use the small
                step nodes to jump straight into Basics, Food, Design, and more.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={dashBtn}
                onClick={() => openEventFormForDay(selectedDay ?? days[0])}
              >
                Add event
              </button>
              <button
                type="button"
                className="border border-charcoal/15 px-4 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
                onClick={() => setShowDayForm((current) => !current)}
              >
                {showDayForm ? "Close day form" : "Add day"}
              </button>
            </div>
          </motion.div>

          {showDayForm ? (
            <motion.form
              variants={fadeUp}
              onSubmit={createDay}
              className="mt-5 border border-charcoal/10 bg-ivory p-4"
            >
              <p className={dashLabel}>New celebration day</p>
              <div className="mt-4 grid gap-3">
                <input
                  type="text"
                  value={dayDraft.name}
                  onChange={(event) =>
                    setDayDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Day name"
                  className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
                <input
                  type="date"
                  value={dayDraft.date}
                  onChange={(event) =>
                    setDayDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
              </div>
              <Field label="Day notes" className="mt-4">
                <textarea
                  value={dayDraft.notes}
                  onChange={(event) =>
                    setDayDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-[88px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                  placeholder="Dress code for guests, transport, venue block, family seating..."
                />
              </Field>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="submit" className={dashBtn} disabled={savingDay}>
                  {savingDay ? "Saving..." : "Create day"}
                </button>
                <button
                  type="button"
                  className="border border-charcoal/15 px-4 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal"
                  onClick={() => setShowDayForm(false)}
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          ) : null}

          {days.length === 0 ? (
            <div className="mt-8">
              <ListEmptyState hint="Create your first celebration day to start planning event by event." />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {days
                .slice()
                .sort((left, right) => left.sort_order - right.sort_order)
                .map((day, dayIndex) => {
                  const daySummary = summarizeDayPlan(day, venueOptions);
                  return (
                  <motion.section
                    key={day.id}
                    variants={fadeUp}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDropOnDay(day.id)}
                    className={cn(
                      "relative overflow-hidden border bg-ivory p-4 transition-colors before:absolute before:left-5 before:top-24 before:h-[calc(100%-7rem)] before:w-px before:bg-gradient-to-b before:from-gold-primary/35 before:via-charcoal/10 before:to-transparent",
                      draggedEventId ? "border-gold-primary/35" : "border-charcoal/10"
                    )}
                  >
                    <div className="flex flex-col gap-4 border-b border-charcoal/8 pb-4">
                      <div>
                        {editingDayId === day.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingDayDraft.name}
                              onChange={(event) =>
                                setEditingDayDraft((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-display text-lg text-charcoal outline-none focus:border-gold-primary"
                            />
                            <input
                              type="date"
                              value={editingDayDraft.date}
                              onChange={(event) =>
                                setEditingDayDraft((current) => ({
                                  ...current,
                                  date: event.target.value,
                                }))
                              }
                              className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                            />
                            <Field label="Day notes">
                              <textarea
                                value={editingDayDraft.notes}
                                onChange={(event) =>
                                  setEditingDayDraft((current) => ({
                                    ...current,
                                    notes: event.target.value,
                                  }))
                                }
                                className="min-h-[88px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                                placeholder="Logistics, dress code, venue notes..."
                              />
                            </Field>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                className={dashBtn}
                                disabled={savingDay}
                                onClick={() => void saveDayEdits(day.id)}
                              >
                                {savingDay ? "Saving..." : "Save day"}
                              </button>
                              <button
                                type="button"
                                className="border border-charcoal/15 px-4 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal"
                                onClick={() => setEditingDayId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-primary/35 bg-gold-primary/10 font-display text-lg text-charcoal">
                                {dayIndex + 1}
                              </span>
                              <p className={dashLabel}>Day node</p>
                              <p className="font-heading text-xs text-slate">
                                {formatDayDate(day.date)}
                              </p>
                            </div>
                            <h4 className="mt-2 font-display text-xl text-charcoal">
                              {day.name}
                            </h4>
                            <p className="mt-2 font-heading text-xs text-slate">
                              {daySummary.eventCount}{" "}
                              {daySummary.eventCount === 1 ? "event" : "events"}
                              {" · "}
                              {gatedSpendEstimateLabel(
                                daySummary.estimatedSpend,
                                daySummary.readiness
                              )}
                              {" · "}
                              {daySummary.readiness}% ready
                              {" · "}
                              {daySummary.vendorPicks} vendor{" "}
                              {daySummary.vendorPicks === 1 ? "pick" : "picks"}
                            </p>
                            {day.notes ? (
                              <p className="mt-3 max-w-2xl border-l-2 border-gold-primary/40 pl-4 text-sm leading-relaxed text-charcoal">
                                {day.notes}
                              </p>
                            ) : null}
                            <p className="mt-3 text-sm leading-relaxed text-slate">
                              Drop an event here to move it into this day, or add a new
                              function specifically for this part of the celebration.
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                          onClick={() => moveDay(day.id, -1)}
                          disabled={dayIndex === 0 || savingDay}
                        >
                          Earlier
                        </button>
                        <button
                          type="button"
                          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                          onClick={() => moveDay(day.id, 1)}
                          disabled={dayIndex === days.length - 1 || savingDay}
                        >
                          Later
                        </button>
                        <button
                          type="button"
                          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                          onClick={() => {
                            setEditingDayId(day.id);
                            setEditingDayDraft({
                              name: day.name,
                              date: day.date ? day.date.slice(0, 10) : "",
                              notes: day.notes ?? "",
                            });
                          }}
                        >
                          Edit day
                        </button>
                        <button
                          type="button"
                          className="border border-gold-primary bg-gold-primary/10 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark transition-colors hover:bg-gold-primary hover:text-midnight"
                          onClick={() =>
                            eventFormDayId === day.id
                              ? setEventFormDayId(null)
                              : openEventFormForDay(day)
                          }
                        >
                          {eventFormDayId === day.id ? "Close event form" : "Add event"}
                        </button>
                        <button
                          type="button"
                          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                          onClick={() => void deleteDay(day.id)}
                          disabled={day.events.length > 0 || savingDay}
                        >
                          Delete day
                        </button>
                      </div>
                    </div>

                    {eventFormDayId === day.id ? (
                      <form
                        onSubmit={createEvent}
                        className="mt-5 border border-charcoal/10 bg-cream/40 p-4"
                      >
                        <p className={dashLabel}>Add event to {day.name}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate">
                          Create a new morning, afternoon, or evening block. It
                          will automatically get starter requirements, menu,
                          logistics, and run-of-show tasks.
                        </p>
                        <div className="mt-4 grid gap-3">
                          <input
                            type="text"
                            value={eventDraft.name}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                name: event.target.value,
                                eventType: event.target.value || current.eventType,
                              }))
                            }
                            placeholder="Function name / type"
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          />
                          <select
                            value={eventDraft.timeBlock}
                            onChange={(event) => {
                              const timeBlock = event.target.value as EventTimeBlockKey;
                              const defaults = timeBlockDefaults(timeBlock);
                              setEventDraft((current) => ({
                                ...current,
                                timeBlock,
                                startTime: defaults.defaultStartTime,
                                endTime: defaults.defaultEndTime,
                              }));
                            }}
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          >
                            {EVENT_TIME_BLOCKS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={eventDraft.date}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                date: event.target.value,
                              }))
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          />
                          <input
                            type="time"
                            value={eventDraft.startTime}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                startTime: event.target.value,
                              }))
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          />
                          <input
                            type="time"
                            value={eventDraft.endTime}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                endTime: event.target.value,
                              }))
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          />
                          <div>
                            <p className={dashLabel}>Venue or area</p>
                            <VenuePicker
                              venues={venueOptions}
                              loading={venueOptionsLoading}
                              value={eventDraft.venue}
                              compact
                              onChange={(venue) =>
                                setEventDraft((current) => ({
                                  ...current,
                                  venue,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="submit" className={dashBtn} disabled={savingEvent}>
                            {savingEvent ? "Saving..." : "Create event"}
                          </button>
                          <button
                            type="button"
                            className="border border-charcoal/15 px-4 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal"
                            onClick={() => setEventFormDayId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {day.events.length === 0 ? (
                      <div className="mt-5 border border-dashed border-charcoal/15 bg-cream/30 px-5 py-8 text-center">
                        <p className="font-heading text-sm text-slate">
                          No events in this day yet. Add one or drag an existing event here.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4">
                        {day.events
                          .slice()
                          .sort((left, right) => left.sort_order - right.sort_order)
                          .map((event, eventIndex) => {
                            const eventEstimate = estimateEventSpend(
                              event,
                              venueOptions
                            );
                            const eventReadiness = eventReadinessPercent(
                              event,
                              venueOptions
                            );

                            const eventSections = editorSectionsForEvent(event);

                            return (
                            <article
                              key={event.id}
                              draggable
                              onDragStart={() => setDraggedEventId(event.id)}
                              onDragEnd={() => setDraggedEventId(null)}
                              className={cn(
                                "relative ml-6 border bg-ivory p-4 transition-all before:absolute before:-left-6 before:top-8 before:h-px before:w-6 before:bg-gold-primary/35 hover:-translate-y-0.5 hover:border-gold-primary/45 hover:shadow-[0_18px_40px_rgba(26,26,46,0.08)]",
                                selectedEventId === event.id
                                  ? "border-gold-primary/55 shadow-[0_18px_40px_rgba(201,169,110,0.14)]"
                                  : "border-charcoal/10"
                              )}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className={dashLabel}>
                                    Function node
                                  </p>
                                  <h5 className="mt-2 font-display text-xl text-charcoal">
                                    {event.name}
                                  </h5>
                                  {event.event_type && event.event_type !== event.name ? (
                                    <p className="mt-1 text-xs text-slate">
                                      {event.event_type}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-start gap-3">
                                  <span
                                    className={cn(
                                      "border px-2 py-1 font-accent text-[10px] uppercase tracking-[0.16em]",
                                      readinessTone(eventReadiness)
                                    )}
                                  >
                                    {eventReadiness}% ready
                                  </span>
                                  <button
                                    type="button"
                                    className={dashBtn}
                                    onClick={() => openEventSection(event.id, "basics")}
                                  >
                                    Open
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 space-y-2 text-sm text-charcoal">
                                <p>{formatEventWindow(event)}</p>
                                <p>{event.venue ?? "Venue to be decided"}</p>
                                <p className="text-slate">
                                  {event.date
                                    ? new Date(event.date).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "Date still flexible"}
                                </p>
                                <p className="border-t border-charcoal/8 pt-2 font-heading text-xs text-slate">
                                  <span className="text-charcoal">
                                    {gatedSpendEstimateLabel(
                                      eventEstimate,
                                      eventReadiness
                                    )}
                                  </span>{" "}
                                  ·{" "}
                                  {gatedSpendEstimateCaption(
                                    eventEstimate,
                                    eventReadiness
                                  )}
                                </p>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {eventSummaryChips(event).map((chip) => (
                                  <span
                                    key={`${event.id}-${chip}`}
                                    className="border border-charcoal/10 px-2 py-1 font-heading text-[11px] text-slate"
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>

                              <div className="mt-4 border-t border-charcoal/8 pt-4">
                                <p className={dashLabel}>Breakdown steps</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {eventSections.map((section, sectionIndex) => {
                                    const active =
                                      selectedEventId === event.id &&
                                      editorSection === section.key;
                                    return (
                                      <button
                                        key={`${event.id}-${section.key}`}
                                        type="button"
                                        onClick={() =>
                                          openEventSection(event.id, section.key)
                                        }
                                        className={cn(
                                          "min-h-12 border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-gold-primary/45",
                                          sectionNodeShape(section.key),
                                          active
                                            ? "border-charcoal bg-charcoal text-ivory shadow-[0_14px_34px_rgba(26,26,46,0.16)]"
                                            : "border-charcoal/10 bg-cream/35 text-charcoal"
                                        )}
                                      >
                                        <span className="font-accent text-[9px] uppercase tracking-[0.16em] opacity-70">
                                          {String(sectionIndex + 1).padStart(2, "0")}
                                        </span>
                                        <span className="mt-1 block font-heading text-xs">
                                          {section.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2 border-t border-charcoal/8 pt-4">
                                <button
                                  type="button"
                                  className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                                  onClick={() => nudgeEvent(event.id, -1)}
                                  disabled={eventIndex === 0}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                                  onClick={() => nudgeEvent(event.id, 1)}
                                  disabled={eventIndex === day.events.length - 1}
                                >
                                  Down
                                </button>
                                <button
                                  type="button"
                                  className="border border-rose/35 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-rose transition-colors hover:bg-rose hover:text-ivory"
                                  onClick={() => void deleteEvent(event.id)}
                                  disabled={savingDetail}
                                >
                                  Delete
                                </button>
                                <p className="ml-auto font-heading text-xs text-slate">
                                  {event.vendorSelections.length} vendor picks
                                </p>
                              </div>
                            </article>
                            );
                          })}
                      </div>
                    )}
                  </motion.section>
                  );
                })}
            </div>
          )}
        </div>

        <motion.aside variants={fadeUp} className="self-start xl:order-1">
          <div className="border border-charcoal/10 bg-ivory p-5 md:p-6">
            <p className={dashLabel}>Event editor</p>
            {selectedEvent && detailDraft ? (
              <div className="mt-4 space-y-5">
                <div>
                  <h4 className="font-display text-2xl text-charcoal">
                    {selectedEvent.name}
                  </h4>
                  <p className="mt-2 text-sm text-slate">
                    Refine the flow for this function from food and decor to
                    vendor selections and spend.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="border border-gold-primary bg-gold-primary/10 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark transition-colors hover:bg-gold-primary hover:text-midnight"
                      onClick={() => openEventFormForDay(selectedDay ?? days[0])}
                    >
                      Create another event
                    </button>
                    <button
                      type="button"
                      className="border border-rose/35 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-rose transition-colors hover:bg-rose hover:text-ivory"
                      disabled={savingDetail}
                      onClick={() => void deleteEvent(selectedEvent.id)}
                    >
                      Delete this event
                    </button>
                  </div>
                </div>

                <div className="border border-charcoal/10 bg-cream/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                      Step{" "}
                      {visibleEditorSections.findIndex(
                        (entry) => entry.key === editorSection
                      ) + 1}{" "}
                      of {visibleEditorSections.length}
                    </p>
                    <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                      {activeEditorSection.label}
                    </p>
                  </div>
                  <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto pb-1">
                    {visibleEditorSections.map((section, index) => {
                      const active = editorSection === section.key;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => setEditorSection(section.key)}
                          className={cn(
                            "group inline-flex shrink-0 items-center gap-2 border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
                            active
                              ? "border-gold-primary bg-gold-primary/10 text-charcoal"
                              : "border-charcoal/10 bg-ivory/70 text-slate hover:border-gold-primary/50 hover:text-charcoal"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center border text-[10px]",
                              active
                                ? "border-gold-primary bg-gold-primary text-midnight"
                                : "border-charcoal/15 text-slate"
                            )}
                          >
                            {index + 1}
                          </span>
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate">
                    {activeEditorSection.helper}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Menus</p>
                    <p className="mt-1 font-display text-lg text-charcoal">
                      {detailDraft.menus.length}
                    </p>
                  </div>
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Partners</p>
                    <p className="mt-1 font-display text-lg text-charcoal">
                      {Object.values(detailDraft.vendorSelections).flat().length}
                    </p>
                  </div>
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Ready</p>
                    <p className="mt-1 font-display text-lg text-charcoal">
                      {selectedEvent
                        ? eventReadinessPercent(selectedEvent, venueOptions)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Spend</p>
                    <p className="mt-1 font-display text-base leading-tight text-charcoal">
                      {detailSpendEstimate
                        ? gatedSpendEstimateLabel(
                            detailSpendEstimate,
                            selectedEvent
                              ? eventReadinessPercent(selectedEvent, venueOptions)
                              : 0
                          )
                        : "Pending"}
                    </p>
                  </div>
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Tasks</p>
                    <p className="mt-1 font-display text-lg text-charcoal">
                      {detailDraft.tasks.length}
                    </p>
                  </div>
                </div>

                {editorSection === "basics" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Function name / type" className="md:col-span-2">
                    <input
                      type="text"
                      value={detailDraft.name}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? {
                                ...current,
                                name: event.target.value,
                                eventType: event.target.value,
                              }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-slate">
                      This single name defines the function and its type across
                      the flow map, budget sync, and vendor briefs.
                    </p>
                  </Field>
                  <Field label="Celebration day">
                    <select
                      value={detailDraft.weddingDayId}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, weddingDayId: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    >
                      {days.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date">
                    <input
                      type="date"
                      value={detailDraft.date}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, date: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                  <Field label="Start time">
                    <input
                      type="time"
                      value={detailDraft.startTime}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, startTime: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                  <Field label="End time">
                    <input
                      type="time"
                      value={detailDraft.endTime}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, endTime: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                  <Field label="Venue" className="md:col-span-2">
                    <VenuePicker
                      venues={venueOptions}
                      loading={venueOptionsLoading}
                      value={detailDraft.venue}
                      onChange={(venue) =>
                        setDetailDraft((current) =>
                          current ? { ...current, venue } : current
                        )
                      }
                    />
                  </Field>
                  <Field label="Guest count">
                    <Stepper
                      value={
                        detailDraft.guestCount
                          ? Number(detailDraft.guestCount)
                          : null
                      }
                      min={0}
                      max={5000}
                      step={25}
                      presets={GUEST_PRESETS}
                      suffix="guests"
                      onChange={(guestCount) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, guestCount: String(guestCount) }
                            : current
                        )
                      }
                    />
                  </Field>
                  <Field label="Derived spend estimate">
                    <div className="border border-gold-primary/25 bg-gold-primary/8 p-4">
                      <p className="font-display text-2xl text-charcoal">
                        {detailSpendEstimate
                          ? gatedSpendEstimateLabel(
                              detailSpendEstimate,
                              selectedEvent
                                ? eventReadinessPercent(selectedEvent, venueOptions)
                                : 0
                            )
                          : "Estimate pending"}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate">
                        {detailSpendEstimate
                          ? gatedSpendEstimateCaption(
                              detailSpendEstimate,
                              selectedEvent
                                ? eventReadinessPercent(selectedEvent, venueOptions)
                                : 0
                            )
                          : "Pick a venue and packages to generate this."}
                      </p>
                      {detailSpendEstimate?.sources.length &&
                      selectedEvent &&
                      eventReadinessPercent(selectedEvent, venueOptions) >= 100 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {detailSpendEstimate.sources.slice(0, 4).map((source) => (
                            <span
                              key={source}
                              className="border border-charcoal/10 bg-ivory/60 px-2 py-1 font-heading text-[10px] text-slate"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Field>
                </div>

                ) : null}

                {editorSection === "food" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div>
                    <p className={dashLabel}>Food and menu</p>
                    <p className="mt-1 text-sm text-slate">
                      Start with the caterer&apos;s real catalogue, then
                        customize menus and dietary details below.
                    </p>
                  </div>

                  <EmbeddedVendorPlanner
                    categoryKey="catering"
                    selectedEvent={selectedEvent}
                    selections={detailDraft.vendorSelections.catering}
                    options={vendorOptions.catering ?? []}
                    savedSlugs={savedVendorSlugs}
                    loading={vendorOptionsLoading}
                    intro="Pick a catering partner or package before editing dishes. Imported catalogue rows become menu items, dietary tags, and menu notes."
                    onSelectVendor={(vendor) =>
                      selectPlannerVendor("catering", vendor)
                    }
                    onClearVendor={() => selectPlannerVendor("catering", null)}
                    onSelectService={(serviceId) =>
                      selectPlannerService("catering", serviceId)
                    }
                    onRemoveSelection={(selectionKey) =>
                      removePlannerVendorSelection("catering", selectionKey)
                    }
                    onApplyService={(vendor, service, selectedItemIds) =>
                      applyVendorServiceToPlan({
                        categoryKey: "catering",
                        vendor,
                        service,
                        selectedItemIds,
                      })
                    }
                  />

                  <div className="border border-gold-primary/20 bg-gold-primary/5 p-3">
                    <p className={dashLabel}>Quick menu starters</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate">
                      If no caterer package is ready yet, use a skeleton and
                      fine-tune instead of typing every station from zero.
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {MENU_BLUEPRINTS.map((blueprint) => (
                        <button
                          key={blueprint.label}
                          type="button"
                          onClick={() => applyMenuBlueprint(blueprint)}
                          className="border border-charcoal/10 bg-ivory/75 p-3 text-left transition-colors hover:border-gold-primary/45"
                        >
                          <span className="font-heading text-sm text-charcoal">
                            {blueprint.label}
                          </span>
                          <span className="mt-1 block text-[11px] leading-relaxed text-slate">
                            {blueprint.mealPeriod} · {blueprint.items.length} rows
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-dashed border-charcoal/15 bg-cream/30 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className={dashLabel}>Special food add-ons</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate">
                          Add custom requests that need vendor quote approval.
                          These stay out of the estimate until priced.
                        </p>
                      </div>
                      <span className="border border-gold-primary/25 bg-gold-primary/8 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                        Quote only
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FOOD_QUOTE_ONLY_OPTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addFoodQuoteOnlyItem(item)}
                          className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>
                  </div>

	                  <Field label="Service format">
                    <ChipSingleSelect
                      options={labelValueOptions(FOOD_SERVICE_STYLES)}
                      value={detailDraft.foodStyle}
                      onChange={(foodStyle) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, foodStyle: foodStyle ?? "" }
                            : current
                        )
                      }
                    />
                  </Field>

                  <div>
                    <p className={dashLabel}>Food preferences</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate">
                      Pick dietary needs, cuisines, and counters first. Custom
                      entries are still available when the event needs them.
                    </p>
                    <PresetTagInput
                      className="mt-3"
                      suggestions={[...DIETARY_TAG_OPTIONS, ...CUISINE_OPTIONS]}
                      value={detailDraft.foodPreferences}
                      onChange={(foodPreferences) =>
                        setDetailDraft((current) =>
                          current ? { ...current, foodPreferences } : current
                        )
                      }
                      placeholder="Add cuisine or dietary need"
                    />
                  </div>

                  <Field label="Menu notes">
                    <PresetTagInput
                      suggestions={[...CUISINE_OPTIONS, ...SIGNATURE_COUNTER_OPTIONS]}
                      value={splitPlannerTags(detailDraft.menuNotes)}
                      onChange={(tags) =>
                        setDetailDraft((current) =>
                          current
                            ? {
                                ...current,
                                menuNotes: mergePlannerTagsWithBlocks(
                                  current.menuNotes,
                                  tags
                                ),
                              }
                            : current
                        )
                      }
                      placeholder="Add menu note"
                    />
                    {menuPlanningBlocks.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {menuPlanningBlocks.map((block) => (
                          <div
                            key={block.title}
                            className="border border-dashed border-charcoal/15 bg-cream/35 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-heading text-sm text-charcoal">
                                  {block.title}
                                </p>
                                {block.lines.length > 0 ? (
                                  <ul className="mt-1 space-y-1 text-xs leading-relaxed text-slate">
                                    {block.lines.map((line) => (
                                      <li key={line}>{line}</li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                {block.title
                                  .toLowerCase()
                                  .includes("quote-only") ? (
                                  <span className="border border-gold-primary/25 bg-gold-primary/8 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                                    Quote only
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => removeMenuPlanningBlock(block.title)}
                                  className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate transition-colors hover:text-charcoal"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Field>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className={dashLabel}>Menus</p>
                      <button
                        type="button"
                        className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                        onClick={addMenu}
                      >
                        Add menu
                      </button>
                    </div>

                    {detailDraft.menus.map((menu, menuIndex) => (
                      <div
                        key={menu.clientId}
                        className="space-y-3 border border-charcoal/10 bg-cream/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-display text-lg text-charcoal">
                            Menu {menuIndex + 1}
                          </p>
                          <button
                            type="button"
                            className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                            onClick={() => removeMenu(menu.clientId)}
                            disabled={detailDraft.menus.length === 1}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Menu name">
                            <input
                              type="text"
                              value={menu.name}
                              onChange={(event) =>
                                updateMenuDraft(menu.clientId, {
                                  name: event.target.value,
                                })
                              }
                              className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                            />
                          </Field>
                          <Field label="Meal">
                            <select
                              value={menu.mealPeriod}
                              onChange={(event) =>
                                updateMenuDraft(menu.clientId, {
                                  mealPeriod: event.target.value,
                                })
                              }
                              className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                            >
                              <option value="">Choose meal</option>
                              {MEAL_PERIOD_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Service style" className="md:col-span-2">
                            <ChipSingleSelect
                              options={labelValueOptions(FOOD_SERVICE_STYLES)}
                              value={menu.serviceStyle}
                              onChange={(serviceStyle) =>
                                updateMenuDraft(menu.clientId, {
                                  serviceStyle: serviceStyle ?? "",
                                })
                              }
                            />
                          </Field>
                        </div>

                        <Field label="Menu brief">
                          <PresetTagInput
                            suggestions={[...CUISINE_OPTIONS, ...SIGNATURE_COUNTER_OPTIONS]}
                            value={splitPlannerTags(menu.notes)}
                            onChange={(tags) =>
                              updateMenuDraft(menu.clientId, {
                                notes: mergePlannerTagsWithBlocks(menu.notes, tags),
                              })
                            }
                            placeholder="Add menu brief"
                          />
                        </Field>

                        <div className="space-y-3 border-t border-charcoal/8 pt-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className={dashLabel}>Dishes and counters</p>
                            <button
                              type="button"
                              className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                              onClick={() => addMenuItem(menu.clientId)}
                            >
                              Add item
                            </button>
                          </div>

                          {menu.items.map((item) => (
                            <div
                              key={item.clientId}
                              className="space-y-3 border border-charcoal/10 bg-ivory/70 p-3"
                            >
                              <div className="grid gap-3 md:grid-cols-2">
                                <PresetTagInput
                                  suggestions={SIGNATURE_COUNTER_OPTIONS}
                                  value={item.name ? [item.name] : []}
                                  onChange={(tags) =>
                                    updateMenuItem(menu.clientId, item.clientId, {
                                      name: tags.at(-1) ?? "",
                                    })
                                  }
                                  placeholder="Add dish or station"
                                />
                                <select
                                  value={item.course}
                                  onChange={(event) =>
                                    updateMenuItem(menu.clientId, item.clientId, {
                                      course: event.target.value,
                                    })
                                  }
                                  className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                                >
                                  <option value="">Course</option>
                                  {MENU_COURSE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <ChipMultiSelect
                                options={labelValueOptions(DIETARY_TAG_OPTIONS)}
                                value={item.dietaryTags}
                                onChange={(dietaryTags) =>
                                  updateMenuItem(menu.clientId, item.clientId, {
                                    dietaryTags,
                                  })
                                }
                              />

                              <textarea
                                value={item.notes}
                                onChange={(event) =>
                                  updateMenuItem(menu.clientId, item.clientId, {
                                    notes: event.target.value,
                                  })
                                }
                                className="min-h-[64px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                                placeholder="Spice level, serving notes, substitutions, allergies..."
                              />

                              <button
                                type="button"
                                className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                                onClick={() =>
                                  removeMenuItem(menu.clientId, item.clientId)
                                }
                                disabled={menu.items.length === 1}
                              >
                                Remove item
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                ) : null}

                {editorSection === "design" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div>
                    <p className={dashLabel}>Decor and atmosphere</p>
                    <p className="mt-1 text-sm text-slate">
                      Choose the design partner first, then translate the mood
                      into palette, installations, and styling cues.
                    </p>
                  </div>

                  <EmbeddedVendorPlanner
                    categoryKey="decor"
                    selectedEvent={selectedEvent}
                    selections={detailDraft.vendorSelections.decor}
                    options={vendorOptions.decor ?? []}
                    savedSlugs={savedVendorSlugs}
                    loading={vendorOptionsLoading}
                    intro="Pick the decor or floral partner before styling the block. Imported setups are added to the design brief."
                    onSelectVendor={(vendor) =>
                      selectPlannerVendor("decor", vendor)
                    }
                    onClearVendor={() => selectPlannerVendor("decor", null)}
                    onSelectService={(serviceId) =>
                      selectPlannerService("decor", serviceId)
                    }
                    onRemoveSelection={(selectionKey) =>
                      removePlannerVendorSelection("decor", selectionKey)
                    }
                    onApplyService={(vendor, service, selectedItemIds) =>
                      applyVendorServiceToPlan({
                        categoryKey: "decor",
                        vendor,
                        service,
                        selectedItemIds,
                      })
                    }
                  />

                  <Field label="Decor direction">
                    <ChipSingleSelect
                      options={labelValueOptions(PLANNER_DECOR_STYLE_OPTIONS)}
                      value={detailDraft.decorStyle}
                      onChange={(decorStyle) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, decorStyle: decorStyle ?? "" }
                            : current
                        )
                      }
                    />
                  </Field>

                  <Field label="Palette and atmosphere">
                    <div className="space-y-4">
                      <SwatchPalette
                        swatches={DECOR_PALETTES}
                        value={splitPlannerTags(detailDraft.decorNotes)}
                        onChange={(paletteTags) =>
                          setDetailDraft((current) => {
                            if (!current) return current;
                            const nonPaletteTags = splitPlannerTags(
                              current.decorNotes
                            ).filter(
                              (tag) =>
                                !DECOR_PALETTES.some(
                                  (swatch) => swatch.value === tag
                                )
                            );
                            return {
                              ...current,
                              decorNotes: mergePlannerTagsWithBlocks(
                                current.decorNotes,
                                [...nonPaletteTags, ...paletteTags]
                              ),
                            };
                          })
                        }
                      />
                      <PresetTagInput
                        suggestions={labelValueOptions(PLANNER_DECOR_STYLE_OPTIONS)}
                        value={splitPlannerTags(detailDraft.decorNotes).filter(
                          (tag) =>
                            !DECOR_PALETTES.some(
                              (swatch) => swatch.value === tag
                            )
                        )}
                        onChange={(decorTags) =>
                          setDetailDraft((current) => {
                            if (!current) return current;
                            const paletteTags = splitPlannerTags(
                              current.decorNotes
                            ).filter((tag) =>
                              DECOR_PALETTES.some(
                                (swatch) => swatch.value === tag
                              )
                            );
                            return {
                              ...current,
                              decorNotes: mergePlannerTagsWithBlocks(
                                current.decorNotes,
                                [...paletteTags, ...decorTags]
                              ),
                            };
                          })
                        }
                        placeholder="Add decor cue"
                      />
                    </div>
                  </Field>

                  <Field label="Dress code or styling cues">
                    <ChipMultiSelect
                      options={labelValueOptions(DRESS_CODE_OPTIONS)}
                      value={splitPlannerTags(detailDraft.attireNotes)}
                      onChange={(attireTags) =>
                        setDetailDraft((current) =>
                          current
                            ? {
                                ...current,
                                attireNotes: mergePlannerTagsWithBlocks(
                                  current.attireNotes,
                                  attireTags
                                ),
                              }
                            : current
                        )
                      }
                    />
                  </Field>
                </div>

                ) : null}

                {editorSection === "media" ? (
                  <div className="space-y-4 border-t border-charcoal/8 pt-5">
                    <div>
                      <p className={dashLabel}>Photo and film</p>
                      <p className="mt-1 text-sm text-slate">
                        Choose the storyteller first, then define the exact
                        coverage moments this block needs.
                      </p>
                    </div>

                    <EmbeddedVendorPlanner
                      categoryKey="photography"
                      selectedEvent={selectedEvent}
                      selections={detailDraft.vendorSelections.photography}
                      options={vendorOptions.photography ?? []}
                      savedSlugs={savedVendorSlugs}
                      loading={vendorOptionsLoading}
                      intro="Pick the photo/film team before adding coverage notes. Imported rows become a concrete coverage brief."
                      onSelectVendor={(vendor) =>
                        selectPlannerVendor("photography", vendor)
                      }
                      onClearVendor={() =>
                        selectPlannerVendor("photography", null)
                      }
                      onSelectService={(serviceId) =>
                        selectPlannerService("photography", serviceId)
                      }
                      onRemoveSelection={(selectionKey) =>
                        removePlannerVendorSelection("photography", selectionKey)
                      }
                      onApplyService={(vendor, service, selectedItemIds) =>
                        applyVendorServiceToPlan({
                          categoryKey: "photography",
                          vendor,
                          service,
                          selectedItemIds,
                        })
                      }
                    />

                    <div className="border border-charcoal/10 bg-cream/30 p-4">
                      <p className={dashLabel}>Coverage cues</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Tap the moments you want captured. These are added to
                        planning notes without needing a blank brief.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {MEDIA_COVERAGE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              addPlanningNoteBlock("Photo and film coverage", [
                                option.label,
                              ])
                            }
                            className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                          >
                            + {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {editorSection === "entertainment" ? (
                  <div className="space-y-4 border-t border-charcoal/8 pt-5">
                    <div>
                      <p className={dashLabel}>Entertainment and production</p>
                      <p className="mt-1 text-sm text-slate">
                        Select the energy partner first, then define show flow,
                        artist needs, and technical cues.
                      </p>
                    </div>

                    <EmbeddedVendorPlanner
                      categoryKey="entertainment"
                      selectedEvent={selectedEvent}
                      selections={detailDraft.vendorSelections.entertainment}
                      options={vendorOptions.entertainment ?? []}
                      savedSlugs={savedVendorSlugs}
                      loading={vendorOptionsLoading}
                      intro="Pick the entertainment or production partner before customizing music direction and show flow."
                      onSelectVendor={(vendor) =>
                        selectPlannerVendor("entertainment", vendor)
                      }
                      onClearVendor={() =>
                        selectPlannerVendor("entertainment", null)
                      }
                      onSelectService={(serviceId) =>
                        selectPlannerService("entertainment", serviceId)
                      }
                      onRemoveSelection={(selectionKey) =>
                        removePlannerVendorSelection("entertainment", selectionKey)
                      }
                      onApplyService={(vendor, service, selectedItemIds) =>
                        applyVendorServiceToPlan({
                          categoryKey: "entertainment",
                          vendor,
                          service,
                          selectedItemIds,
                        })
                      }
                    />

                    <div className="border border-charcoal/10 bg-cream/30 p-4">
                      <p className={dashLabel}>Energy and show cues</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Add performance, sound, and flow requirements from
                        presets before writing anything custom.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ENTERTAINMENT_DIRECTION_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              addPlanningNoteBlock("Entertainment direction", [
                                option.label,
                              ])
                            }
                            className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                          >
                            + {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {editorSection === "logistics" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
	                  <div>
	                    <p className={dashLabel}>Logistics</p>
	                    <p className="mt-1 text-sm text-slate">
	                      Select operations support first, then define guest
                        movement, rooming, vendor access, and backup plans.
	                    </p>
	                  </div>

                  <EmbeddedVendorPlanner
                    categoryKey="logistics"
                    selectedEvent={selectedEvent}
                    selections={detailDraft.vendorSelections.logistics}
                    options={vendorOptions.logistics ?? []}
                    savedSlugs={savedVendorSlugs}
                    loading={vendorOptionsLoading}
                    intro="Pick a travel or logistics partner before adjusting transport, access, and movement details."
                    onSelectVendor={(vendor) =>
                      selectPlannerVendor("logistics", vendor)
                    }
                    onClearVendor={() => selectPlannerVendor("logistics", null)}
                    onSelectService={(serviceId) =>
                      selectPlannerService("logistics", serviceId)
                    }
                    onRemoveSelection={(selectionKey) =>
                      removePlannerVendorSelection("logistics", selectionKey)
                    }
                    onApplyService={(vendor, service, selectedItemIds) =>
                      applyVendorServiceToPlan({
                        categoryKey: "logistics",
                        vendor,
                        service,
                        selectedItemIds,
                      })
                    }
                  />

                  <EmbeddedVendorPlanner
                    categoryKey="hospitality"
                    selectedEvent={selectedEvent}
                    selections={detailDraft.vendorSelections.hospitality}
                    options={vendorOptions.hospitality ?? []}
                    savedSlugs={savedVendorSlugs}
                    loading={vendorOptionsLoading}
                    intro="Use this for rooming, welcome amenities, family movement, on-ground guest care, and planning-led hospitality."
                    onSelectVendor={(vendor) =>
                      selectPlannerVendor("hospitality", vendor)
                    }
                    onClearVendor={() =>
                      selectPlannerVendor("hospitality", null)
                    }
                    onSelectService={(serviceId) =>
                      selectPlannerService("hospitality", serviceId)
                    }
                    onRemoveSelection={(selectionKey) =>
                      removePlannerVendorSelection("hospitality", selectionKey)
                    }
                    onApplyService={(vendor, service, selectedItemIds) =>
                      applyVendorServiceToPlan({
                        categoryKey: "hospitality",
                        vendor,
                        service,
                        selectedItemIds,
                      })
                    }
                  />

                  <div className="border border-gold-primary/20 bg-gold-primary/5 p-3">
                    <p className={dashLabel}>Logistics presets</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate">
                      Start with a working operations pattern, then adjust the
                      exact venue movement details.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {LOGISTICS_BLUEPRINTS.map((blueprint) => (
                        <button
                          key={blueprint.label}
                          type="button"
                          onClick={() => applyLogisticsBlueprint(blueprint)}
                          className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                        >
                          {blueprint.label}
                        </button>
                      ))}
                    </div>
                  </div>

	                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Guest arrival">
                      <input
                        type="time"
                        value={detailDraft.logistics.guestArrivalTime}
                        onChange={(event) =>
                          updateLogisticsDraft({
                            guestArrivalTime: event.target.value,
                          })
                        }
                        className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      />
                    </Field>
                    <Field label="Vendor load-in">
                      <input
                        type="time"
                        value={detailDraft.logistics.vendorLoadInTime}
                        onChange={(event) =>
                          updateLogisticsDraft({
                            vendorLoadInTime: event.target.value,
                          })
                        }
                        className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      />
                    </Field>
                    <Field label="Family call">
                      <input
                        type="time"
                        value={detailDraft.logistics.familyCallTime}
                        onChange={(event) =>
                          updateLogisticsDraft({
                            familyCallTime: event.target.value,
                          })
                        }
                        className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      />
                    </Field>
                  </div>

                  <Field label="Transport plan">
                    <ChipMultiSelect
                      options={labelValueOptions(TRANSPORT_OPTIONS)}
                      value={splitPlannerTags(
                        detailDraft.logistics.transportNotes
                      )}
                      onChange={(transportTags) =>
                        updateLogisticsDraft({
                          transportNotes: mergePlannerTagsWithBlocks(
                            detailDraft.logistics.transportNotes,
                            transportTags
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Rooms and family movement">
                    <ChipMultiSelect
                      options={labelValueOptions(ROOMING_OPTIONS)}
                      value={splitPlannerTags(detailDraft.logistics.roomingNotes)}
                      onChange={(roomingTags) =>
                        updateLogisticsDraft({
                          roomingNotes: mergePlannerTagsWithBlocks(
                            detailDraft.logistics.roomingNotes,
                            roomingTags
                          ),
                        })
                      }
                    />
                  </Field>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Weather backup">
                      <ChipMultiSelect
                        options={labelValueOptions(WEATHER_BACKUP_OPTIONS)}
                        value={splitPlannerTags(detailDraft.logistics.weatherPlan)}
                        onChange={(weatherTags) =>
                          updateLogisticsDraft({
                            weatherPlan: mergePlannerTagsWithBlocks(
                              detailDraft.logistics.weatherPlan,
                              weatherTags
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Ceremony or sequence notes">
                      <PresetTagInput
                        suggestions={CEREMONY_FLOW_OPTIONS}
                        value={splitPlannerTags(
                          detailDraft.logistics.ceremonyNotes
                        )}
                        onChange={(ceremonyTags) =>
                          updateLogisticsDraft({
                            ceremonyNotes: mergePlannerTagsWithBlocks(
                              detailDraft.logistics.ceremonyNotes,
                              ceremonyTags
                            ),
                          })
                        }
                        placeholder="Add sequence moment"
                      />
                    </Field>
                  </div>
                </div>

                ) : null}

                {editorSection === "special" ? (
                  <div className="space-y-4 border-t border-charcoal/8 pt-5">
                    <div>
                      <p className={dashLabel}>Special requirements</p>
                      <p className="mt-1 text-sm text-slate">
                        Use this only for unusual needs that do not fit food,
                        design, photo/film, entertainment, or logistics.
                      </p>
                    </div>

                    <div className="border border-gold-primary/20 bg-gold-primary/5 p-4">
                      <p className={dashLabel}>Add a special need</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate">
                        Start from a preset so the plan stays structured. Custom
                        is still available for truly unique requests.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {SPECIAL_REQUIREMENT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => addSpecialRequirement(option.label)}
                            className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                          >
                            + {option.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="mt-3 border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
                        onClick={() => addSpecialRequirement()}
                      >
                        Add custom special need
                      </button>
                    </div>

                    <div className="border border-charcoal/10 bg-cream/30 p-4">
                      <p className={dashLabel}>Standard needs active</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {detailDraft.requirements
                          .filter((requirement) => requirement.category !== "custom")
                          .map((requirement) => (
                            <span
                              key={requirement.clientId}
                              className="border border-charcoal/10 bg-ivory/75 px-2 py-1 font-heading text-[11px] text-slate"
                            >
                              {requirement.title}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {detailDraft.requirements.filter(
                        (requirement) => requirement.category === "custom"
                      ).length === 0 ? (
                        <div className="border border-dashed border-charcoal/15 bg-cream/25 p-4">
                          <p className={dashLabel}>No special needs yet</p>
                          <p className="mt-2 text-xs leading-relaxed text-slate">
                            That is good. Keep this section empty unless the
                            event needs something outside the standard flow.
                          </p>
                        </div>
                      ) : null}

                      {detailDraft.requirements
                        .filter((requirement) => requirement.category === "custom")
                        .map((requirement, requirementIndex) => (
                          <div
                            key={requirement.clientId}
                            className="space-y-3 border border-charcoal/10 bg-cream/30 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className={dashLabel}>
                                  Special need {requirementIndex + 1}
                                </p>
                                <p className="mt-1 text-xs text-slate">
                                  Keep ownership, vendor, permit, and approval
                                  details in one card.
                                </p>
                              </div>
                              <button
                                type="button"
                                className="border border-rose/30 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-rose transition-colors hover:bg-rose hover:text-ivory"
                                onClick={() =>
                                  removeRequirementDraft(requirement.clientId)
                                }
                              >
                                Remove
                              </button>
                            </div>

                            <PresetTagInput
                              suggestions={[...SPECIAL_REQUIREMENT_OPTIONS]}
                              value={requirement.title ? [requirement.title] : []}
                              onChange={(titles) =>
                                updateRequirementDraft(requirement.clientId, {
                                  title: titles.at(-1) ?? "",
                                })
                              }
                              placeholder="Name this special need"
                            />

                            <div className="grid gap-3 md:grid-cols-2">
                              <Field label="Status">
                                <ChipSingleSelect
                                  options={REQUIREMENT_STATUS_CHIPS}
                                  value={requirement.status}
                                  allowClear={false}
                                  onChange={(status) =>
                                    updateRequirementDraft(requirement.clientId, {
                                      status: status ?? "DRAFT",
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Priority">
                                <ChipSingleSelect
                                  options={REQUIREMENT_PRIORITY_CHIPS}
                                  value={requirement.priority}
                                  allowClear={false}
                                  onChange={(priority) =>
                                    updateRequirementDraft(requirement.clientId, {
                                      priority: priority ?? "NORMAL",
                                    })
                                  }
                                />
                              </Field>
                            </div>

                            <Field label="Specific instruction">
                              <textarea
                                value={requirement.notes}
                                onChange={(event) =>
                                  updateRequirementDraft(requirement.clientId, {
                                    notes: event.target.value,
                                  })
                                }
                                className="min-h-[88px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                                placeholder="Who owns it, which vendor or permit is needed, timing, approvals, and any non-negotiables..."
                              />
                            </Field>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {editorSection === "tasks" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={dashLabel}>Event tasks</p>
                      <p className="mt-1 text-sm text-slate">
                        Keep this light: choose a template, assign an owner,
                        then mark the next visible action.
                      </p>
                    </div>
	                    <button
	                      type="button"
	                      className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
	                      onClick={addTask}
	                    >
	                      Add task
	                    </button>
	                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="border border-charcoal/8 bg-cream/35 p-3">
                      <p className={dashLabel}>Open</p>
                      <p className="mt-1 font-display text-xl text-charcoal">
                        {
                          detailDraft.tasks.filter(
                            (task) => task.status !== "DONE"
                          ).length
                        }
                      </p>
                    </div>
                    <div className="border border-charcoal/8 bg-cream/35 p-3">
                      <p className={dashLabel}>Done</p>
                      <p className="mt-1 font-display text-xl text-charcoal">
                        {
                          detailDraft.tasks.filter(
                            (task) => task.status === "DONE"
                          ).length
                        }
                      </p>
                    </div>
                    <div className="border border-charcoal/8 bg-cream/35 p-3">
                      <p className={dashLabel}>Owners</p>
                      <p className="mt-1 font-display text-xl text-charcoal">
                        {
                          uniqueList(
                            detailDraft.tasks.map((task) => task.owner)
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  <div className="border border-gold-primary/20 bg-gold-primary/5 p-3">
                    <p className={dashLabel}>Task templates</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate">
                      Add the common handoff work in one click, then assign dates
                      as the event gets closer.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {TASK_BLUEPRINTS.map((blueprint) => (
                        <button
                          key={blueprint.label}
                          type="button"
                          onClick={() => applyTaskBlueprint(blueprint)}
                          className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                        >
                          {blueprint.label} · {blueprint.tasks.length} tasks
                        </button>
                      ))}
                    </div>
                  </div>

	                  <div className="space-y-3">
                    {detailDraft.tasks.map((task) => (
                      <div
                        key={task.clientId}
                        className="space-y-3 border border-charcoal/10 bg-cream/30 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <PresetTagInput
                              suggestions={TASK_TEMPLATES}
                              value={task.title ? [task.title] : []}
                              onChange={(titles) =>
                                updateTask(task.clientId, {
                                  title: titles.at(-1) ?? "",
                                })
                              }
                              placeholder="Add task title"
                            />
                          </div>
                          <button
                            type="button"
                            className={cn(
                              "border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
                              task.status === "DONE"
                                ? "border-charcoal/15 text-charcoal hover:border-gold-primary"
                                : "border-sage/30 text-sage hover:bg-sage hover:text-ivory"
                            )}
                            onClick={() =>
                              updateTask(task.clientId, {
                                status:
                                  task.status === "DONE" ? "OPEN" : "DONE",
                              })
                            }
                          >
                            {task.status === "DONE" ? "Reopen" : "Mark done"}
                          </button>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <Field label="Status">
                            <ChipSingleSelect
                              options={TASK_STATUS_CHIPS}
                              value={task.status}
                              allowClear={false}
                              onChange={(status) =>
                                updateTask(task.clientId, {
                                  status: status ?? "OPEN",
                                })
                              }
                            />
                          </Field>
                          <Field label="Due date">
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(event) =>
                                updateTask(task.clientId, {
                                  dueDate: event.target.value,
                                })
                              }
                              className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                            />
                          </Field>
                        </div>
                        <Field label="Owner">
                          <OwnerSelect
                            value={task.owner}
                            options={labelValueOptions(TASK_OWNER_OPTIONS)}
                            onChange={(owner) =>
                              updateTask(task.clientId, {
                                owner,
                              })
                            }
                          />
                        </Field>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate transition-colors hover:text-rose disabled:cursor-not-allowed disabled:text-slate/40"
                            onClick={() => removeTask(task.clientId)}
                            disabled={detailDraft.tasks.length === 1}
                          >
                            Remove task
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                ) : null}

                {editorSection === "notes" ? (
                  <div className="space-y-4 border-t border-charcoal/8 pt-5">
                    <div>
                      <p className={dashLabel}>Planning notes</p>
                      <p className="mt-1 text-sm text-slate">
                        Use chips for common reminders, then keep the freeform
                        notes for only the details that need words.
                      </p>
                    </div>
                    <div className="border border-gold-primary/20 bg-gold-primary/5 p-4">
                      <p className={dashLabel}>Quick note prompts</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {NOTE_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() =>
                              addPlanningNoteBlock("Planning note", [prompt])
                            }
                            className="border border-charcoal/10 bg-ivory/75 px-3 py-2 font-heading text-xs text-charcoal transition-colors hover:border-gold-primary/45"
                          >
                            + {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label="Planning notes">
                      <textarea
                        value={detailDraft.notes}
                        onChange={(event) =>
                          setDetailDraft((current) =>
                            current
                              ? { ...current, notes: event.target.value }
                              : current
                          )
                        }
                        className="min-h-[180px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                        placeholder="Run-of-show reminders, family logistics, weather backups..."
                      />
                    </Field>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 border-t border-charcoal/8 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const index = visibleEditorSections.findIndex(
                        (entry) => entry.key === editorSection
                      );
                      const prev = visibleEditorSections[Math.max(0, index - 1)];
                      if (prev) setEditorSection(prev.key);
                    }}
                    disabled={
                      visibleEditorSections.findIndex(
                        (entry) => entry.key === editorSection
                      ) === 0
                    }
                    className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-charcoal/15 disabled:hover:text-charcoal"
                  >
                    ← Prev
                  </button>
                  <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                    {visibleEditorSections.findIndex(
                      (entry) => entry.key === editorSection
                    ) + 1}{" "}
                    / {visibleEditorSections.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const index = visibleEditorSections.findIndex(
                        (entry) => entry.key === editorSection
                      );
                      const next =
                        visibleEditorSections[
                          Math.min(visibleEditorSections.length - 1, index + 1)
                        ];
                      if (next) setEditorSection(next.key);
                    }}
                    disabled={
                      visibleEditorSections.findIndex(
                        (entry) => entry.key === editorSection
                      ) ===
                      visibleEditorSections.length - 1
                    }
                    className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-charcoal/15 disabled:hover:text-charcoal"
                  >
                    Next →
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-charcoal/8 pt-4">
                  <button
                    type="button"
                    className={dashBtn}
                    disabled={savingDetail}
                    onClick={() => void saveEventDetails()}
                  >
                    {savingDetail ? "Saving..." : "Save event plan"}
                  </button>
                  <button
                    type="button"
                    className="border border-charcoal/15 px-4 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal"
                    disabled={savingDetail}
                    onClick={() => void deleteEvent(selectedEvent.id)}
                  >
                    Delete event
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-gold-primary/30 bg-gold-primary/8 p-5">
                <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
                  What to do next
                </p>
                <p className="mt-2 font-heading text-sm text-charcoal">
                  Pick a function node from the flow map, or tap one of its
                  shaped breakdown nodes to jump directly into{" "}
                  <span className="text-gold-dark">Food, Design, Logistics, Tasks,</span>{" "}
                  or another section. The editor stays closed until a node is selected.
                </p>
              </div>
            )}

            {selectedDay ? (
              <div className="mt-6 border-t border-charcoal/8 pt-5">
                <p className={dashLabel}>Current day</p>
                <h5 className="mt-2 font-display text-xl text-charcoal">
                  {selectedDay.name}
                </h5>
                <p className="mt-2 text-sm text-slate">
                  {formatDayDate(selectedDay.date)}
                </p>
              </div>
            ) : null}
          </div>
        </motion.aside>
      </div>
      </>
      ) : null}
    </motion.div>
  );
}

function LayerTwoGuidance({
  selectedEvent,
  selectedDay,
  venueOptionsCount,
  savedVendorCount,
  nextAction,
  onOpenSection,
}: {
  selectedEvent: WeddingEvent | null;
  selectedDay: WeddingDay | null;
  venueOptionsCount: number;
  savedVendorCount: number;
  nextAction: ReturnType<typeof nextBestPlannerAction>;
  onOpenSection: (section: EditorSectionKey) => void;
}) {
  const guidance = [
    {
      label: "Pick one block",
      value: selectedEvent
        ? selectedEvent.name
        : "Open a morning / afternoon / evening block",
      detail: selectedDay
        ? `${selectedDay.name} · ${formatDayDate(selectedDay.date)}`
        : "The editor works event by event so the screen stays lighter.",
    },
    {
      label: "Anchor the venue",
      value: `${venueOptionsCount} catalogue option${
        venueOptionsCount === 1 ? "" : "s"
      } loaded`,
      detail:
        "Choose a venue card first; only use custom text for unpublished spaces.",
    },
    {
      label: "Choose partners in-section",
      value:
        savedVendorCount > 0
          ? `${savedVendorCount} shortlisted vendor${
              savedVendorCount === 1 ? "" : "s"
            } prioritized`
          : "Curated vendors ready",
      detail:
        "Food, design, photo/film, entertainment, and logistics each start with partner cards.",
    },
    {
      label: nextAction.label,
      value: nextAction.value,
      detail: nextAction.detail,
      action: true,
    },
  ];

  return (
    <motion.section
      variants={fadeUp}
      className="mt-8 grid gap-3 md:grid-cols-4"
    >
      {guidance.map((item, index) => (
        <article
          key={item.label}
          className={cn(
            "border p-4",
            item.action
              ? "border-gold-primary bg-gold-primary/10"
              : "border-gold-primary/20 bg-gold-primary/5"
          )}
        >
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
            {String(index + 1).padStart(2, "0")} · {item.label}
          </p>
          <p className="mt-2 font-display text-lg text-charcoal">{item.value}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate">{item.detail}</p>
          {item.action ? (
            <button
              type="button"
              onClick={() => onOpenSection(nextAction.section)}
              className="mt-3 border border-gold-primary bg-gold-primary px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-midnight transition-colors hover:bg-gold-dark"
            >
              Open section
            </button>
          ) : null}
        </article>
      ))}
    </motion.section>
  );
}

function VenuePicker({
  venues,
  loading,
  value,
  onChange,
  compact = false,
}: {
  venues: VenueOption[];
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const selectedVenue = venues.find((venue) => venueMatchesValue(venue, value));
  const [showCustom, setShowCustom] = useState(false);
  const visibleVenues = compact ? venues.slice(0, 4) : venues.slice(0, 6);
  const customValueActive = Boolean(value && !selectedVenue);
  const customOpen = showCustom || customValueActive;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="border border-charcoal/10 bg-cream/30 p-4 text-sm text-slate">
          Loading venue catalogue...
        </div>
      ) : null}

      {!loading && visibleVenues.length === 0 ? (
        <div className="border border-dashed border-charcoal/15 bg-cream/30 p-4">
          <p className={dashLabel}>No venue catalogue yet</p>
          <p className="mt-2 text-xs leading-relaxed text-slate">
            Add a custom venue or area for now. Once venues are seeded for this
            destination, they will appear here as cards.
          </p>
        </div>
      ) : null}

      {visibleVenues.length > 0 ? (
        <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : "lg:grid-cols-2")}>
          {visibleVenues.map((venue) => {
            const active = venueMatchesValue(venue, value);
            const destinationLabel = venueDestinationLabel(venue);
            return (
              <button
                key={venue.id}
                type="button"
                onClick={() => {
                  onChange(venue.name);
                  setShowCustom(false);
                }}
                className={cn(
                  "group overflow-hidden border bg-ivory text-left transition-all hover:-translate-y-0.5 hover:border-gold-primary/45 hover:shadow-[0_18px_40px_rgba(26,26,46,0.08)]",
                  active
                    ? "border-gold-primary shadow-[0_18px_40px_rgba(201,169,110,0.14)]"
                    : "border-charcoal/10"
                )}
              >
                {venue.hero_image ? (
                  <span className="block aspect-[5/2] overflow-hidden bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={venue.hero_image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </span>
                ) : null}
                <span className="block p-3">
                  <span className="font-heading text-sm text-charcoal">
                    {venue.name}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate">
                    {destinationLabel || venue.address || "Destination venue"}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {venue.capacity ? (
                      <span className="border border-charcoal/10 px-2 py-1 font-heading text-[10px] text-slate">
                        Up to {venue.capacity}
                      </span>
                    ) : null}
                    {venue.price_range ? (
                      <span className="border border-gold-primary/25 bg-gold-primary/8 px-2 py-1 font-heading text-[10px] text-gold-dark">
                        {venue.price_range}
                      </span>
                    ) : null}
                  </span>
                  {venue.amenities?.length ? (
                    <span className="mt-2 block text-[11px] leading-relaxed text-slate">
                      {venue.amenities.slice(0, 3).join(" · ")}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (customValueActive) {
              onChange("");
              setShowCustom(false);
              return;
            }
            setShowCustom((current) => !current);
          }}
          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          {customValueActive
            ? "Clear custom venue"
            : customOpen
              ? "Hide custom venue"
              : "Use custom area"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate transition-colors hover:text-rose"
          >
            Clear venue
          </button>
        ) : null}
      </div>

      {customOpen ? (
        <input
          type="text"
          value={selectedVenue ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Custom venue, lawn, ballroom, beach, terrace..."
          className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
        />
      ) : selectedVenue ? (
        <p className="border border-gold-primary/20 bg-gold-primary/8 px-3 py-2 text-xs leading-relaxed text-gold-dark">
          Selected from venue catalogue: {selectedVenue.name}
        </p>
      ) : null}
    </div>
  );
}

function EmbeddedVendorPlanner({
  categoryKey,
  selectedEvent,
  selections,
  options,
  savedSlugs,
  loading,
  intro,
  onSelectVendor,
  onClearVendor,
  onSelectService,
  onRemoveSelection,
  onApplyService,
}: {
  categoryKey: PlannerVendorCategoryKey;
  selectedEvent: WeddingEvent | null;
  selections: VendorDraftSelection[];
  options: VendorPlannerOption[];
  savedSlugs: string[];
  loading: boolean;
  intro: string;
  onSelectVendor: (vendor: VendorPlannerOption) => void;
  onClearVendor: () => void;
  onSelectService: (serviceId: string) => void;
  onRemoveSelection: (selectionKey: string) => void;
  onApplyService: (
    vendor: VendorPlannerOption,
    service: VendorPlannerService,
    selectedItemIds: string[]
  ) => void;
}) {
  const category = PLANNER_VENDOR_CATEGORIES.find(
    (entry) => entry.key === categoryKey
  );
  if (!category) return null;

  const orderedOptions = orderVendorOptionsByShortlist(options, savedSlugs);
  const currentBookingSelections =
    selectedEvent?.vendorSelections.filter(
      (entry) => entry.vendor?.categorySlug === category.slug
    ) ?? [];
  const currentBookingByKey = new Map(
    currentBookingSelections.map((selection) => [
      eventVendorSelectionKey(selection),
      selection,
    ])
  );
  const activeSelection = selections.at(-1) ?? null;
  const selectedVendor =
    orderedOptions.find((option) => option.id === activeSelection?.vendorProfileId) ??
    null;
  const selectedService = selectedVendor?.services.find(
    (service) => service.id === activeSelection?.vendorServiceId
  );
  const selectedVendorIds = uniqueList(
    selections.map((selection) => selection.vendorProfileId)
  );
  const selectedServiceIds = uniqueList(
    selections.map((selection) => selection.vendorServiceId).filter(Boolean)
  );
  const selectedPackages = selections.map((selection) => {
    const key = vendorDraftSelectionKey(selection);
    const vendor =
      orderedOptions.find((option) => option.id === selection.vendorProfileId) ??
      null;
    const service =
      vendor?.services.find((entry) => entry.id === selection.vendorServiceId) ??
      null;
    const bookingSelection = currentBookingByKey.get(key) ?? null;
    return {
      key,
      vendorName:
        vendor?.business_name ??
        bookingSelection?.vendor?.businessName ??
        "Selected partner",
      serviceName:
        service?.name ??
        bookingSelection?.service?.name ??
        (selection.vendorServiceId ? "Selected package" : "Package pending"),
      priceLabel: service ? servicePriceLabel(service) : null,
      status: bookingSelection?.status ?? "DRAFT",
      locked: Boolean(
        bookingSelection && bookingSelection.status !== "INQUIRY"
      ),
    };
  });

  return (
    <div className="border border-gold-primary/20 bg-gold-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={dashLabel}>{category.label} partner</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate">
            {intro}
          </p>
        </div>
        {loading ? (
          <span className="border border-charcoal/10 bg-ivory/70 px-2 py-1 font-heading text-[11px] text-slate">
            Loading partners...
          </span>
        ) : currentBookingSelections.length > 0 ? (
          <span className="border border-gold-primary/35 bg-ivory/80 px-2 py-1 font-heading text-[11px] text-gold-dark">
            {currentBookingSelections.length} booking
            {currentBookingSelections.length === 1 ? "" : "s"} synced
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <VendorOptionCards
          categoryLabel={category.label}
          options={orderedOptions}
          savedSlugs={savedSlugs}
          selectedVendorIds={selectedVendorIds}
          onSelect={onSelectVendor}
          onClear={onClearVendor}
          clearDisabled={selectedPackages.some((selection) => selection.locked)}
        />

        {selectedPackages.length > 0 ? (
          <div className="border border-gold-primary/25 bg-ivory/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={dashLabel}>Selected for this event</p>
              <span className="font-heading text-[11px] text-gold-dark">
                {selectedPackages.length} package
                {selectedPackages.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {selectedPackages.map((packageSelection) => (
                <div
                  key={packageSelection.key}
                  className="flex flex-wrap items-center justify-between gap-3 border border-charcoal/8 bg-cream/25 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-sm text-charcoal">
                      {packageSelection.vendorName}
                    </p>
                    <p className="mt-1 text-xs text-slate">
                      {packageSelection.serviceName}
                      {packageSelection.priceLabel
                        ? ` · ${packageSelection.priceLabel}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border border-charcoal/10 bg-ivory/70 px-2 py-1 font-heading text-[10px] text-slate">
                      {formatBookingStatus(packageSelection.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveSelection(packageSelection.key)}
                      disabled={packageSelection.locked}
                      className="font-accent text-[10px] uppercase tracking-[0.16em] text-rose transition-colors hover:text-charcoal disabled:cursor-not-allowed disabled:text-slate/50"
                      title={
                        packageSelection.locked
                          ? "Confirmed bookings must be changed from bookings."
                          : "Remove this package from the draft."
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate">
              You can keep adding partners or packages here. Save the event plan
              when the shortlist for this block feels right.
            </p>
          </div>
        ) : null}

        {selectedVendor ? (
          <>
            <div className="border border-charcoal/10 bg-ivory/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading text-sm text-charcoal">
                    {selectedVendor.business_name}
                  </p>
                  <p className="mt-1 text-xs text-slate">
                    {selectedVendor.city ?? "Destination ready"}
                    {selectedVendor.rating
                      ? ` · ${selectedVendor.rating.toFixed(1)} rating`
                      : ""}
                  </p>
                </div>
                <span className="border border-gold-primary/40 bg-gold-primary/8 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                  {selectedVendor.services.length}{" "}
                  {selectedVendor.services.length === 1 ? "service" : "services"}
                </span>
              </div>
            </div>

            <ServiceOptionCards
              services={selectedVendor.services}
              activeServiceId={activeSelection?.vendorServiceId ?? ""}
              selectedServiceIds={selectedServiceIds}
              onSelect={onSelectService}
            />

            {selectedService ? (
              <div className="border border-charcoal/10 bg-ivory/75 p-3">
                <ServiceOfferingPreview
                  key={selectedService.id}
                  categoryKey={category.key}
                  vendorName={selectedVendor.business_name}
                  service={selectedService}
                  onUseSelection={(selectedItemIds) =>
                    onApplyService(selectedVendor, selectedService, selectedItemIds)
                  }
                />
              </div>
            ) : (
              <div className="border border-dashed border-charcoal/15 bg-ivory/60 p-3">
                <p className={dashLabel}>Pick a package</p>
                <p className="mt-1 text-xs leading-relaxed text-slate">
                  Choose one of {selectedVendor.business_name}&apos;s packages to
                  see scope, inclusions, deliverables, and catalogue rows that
                  can be imported into this event.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="border border-dashed border-charcoal/15 bg-ivory/60 p-4">
            <p className={dashLabel}>No partner selected yet</p>
            <p className="mt-2 text-xs leading-relaxed text-slate">
              {category.hint} Shortlisted partners appear first, so the couple
              can choose from real options instead of typing vendor names.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function VendorOptionCards({
  categoryLabel,
  options,
  savedSlugs,
  selectedVendorIds,
  onSelect,
  onClear,
  clearDisabled = false,
}: {
  categoryLabel: string;
  options: VendorPlannerOption[];
  savedSlugs: string[];
  selectedVendorIds: string[];
  onSelect: (vendor: VendorPlannerOption) => void;
  onClear: () => void;
  clearDisabled?: boolean;
}) {
  const savedSet = new Set(savedSlugs);
  const selectedSet = new Set(selectedVendorIds);

  if (options.length === 0) {
    return (
      <div className="border border-dashed border-charcoal/15 bg-cream/25 p-4">
        <p className={dashLabel}>No {categoryLabel.toLowerCase()} options yet</p>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          Open the vendor marketplace to shortlist candidates. They will appear
          here as selectable cards for this event.
        </p>
        <Link
          href="/client/vendors"
          className="font-accent mt-3 inline-flex border border-gold-primary/45 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gold-dark"
        >
          Open vendor marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => {
          const active = selectedSet.has(option.id);
          const saved = savedSet.has(option.slug);
          const firstService = option.services[0];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                "border bg-ivory p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold-primary/45 hover:shadow-[0_18px_40px_rgba(26,26,46,0.08)]",
                active
                  ? "border-gold-primary bg-gold-primary/8 shadow-[0_18px_40px_rgba(201,169,110,0.14)]"
                  : "border-charcoal/10"
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="font-heading text-sm text-charcoal">
                    {option.business_name}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate">
                    {option.city ?? "Destination ready"}
                    {option.rating ? ` · ${option.rating.toFixed(1)} rating` : ""}
                  </span>
                </span>
                {saved || active ? (
                  <span
                    className={cn(
                      "border px-2 py-1 font-accent text-[9px] uppercase tracking-[0.14em]",
                      active
                        ? "border-charcoal bg-charcoal text-ivory"
                        : "border-gold-primary/40 bg-gold-primary/10 text-gold-dark"
                    )}
                  >
                    {active ? "Selected" : "Shortlisted"}
                  </span>
                ) : null}
              </span>
              <span className="mt-3 block text-[11px] leading-relaxed text-slate">
                {option.short_bio ?? "Curated partner with event-ready services."}
              </span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                <span className="border border-charcoal/10 px-2 py-1 font-heading text-[10px] text-slate">
                  {option.services.length} package
                  {option.services.length === 1 ? "" : "s"}
                </span>
                {firstService ? (
                  <span className="border border-gold-primary/25 bg-gold-primary/8 px-2 py-1 font-heading text-[10px] text-gold-dark">
                    {servicePriceLabel(firstService)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {selectedVendorIds.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          disabled={clearDisabled}
          className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate transition-colors hover:text-rose disabled:cursor-not-allowed disabled:text-slate/40 disabled:hover:text-slate/40"
          title={
            clearDisabled
              ? "Confirmed bookings must be changed from bookings."
              : "Clear this category selection."
          }
        >
          Clear {categoryLabel.toLowerCase()} selection
        </button>
      ) : null}
    </div>
  );
}

function ServiceOptionCards({
  services,
  activeServiceId,
  selectedServiceIds,
  onSelect,
}: {
  services: VendorPlannerService[];
  activeServiceId: string;
  selectedServiceIds: string[];
  onSelect: (serviceId: string) => void;
}) {
  if (services.length === 0) {
    return (
      <div className="border border-dashed border-charcoal/15 bg-cream/25 p-3">
        <p className={dashLabel}>No packages published</p>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          This vendor can still be selected, but they need to publish package
          scope before catalogue rows can be imported.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className={dashLabel}>Choose service or package</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {services.map((service) => {
          const active = activeServiceId === service.id;
          const selected = selectedServiceIds.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service.id)}
              className={cn(
                "border bg-cream/25 p-3 text-left transition-colors hover:border-gold-primary/45",
                active
                  ? "border-gold-primary bg-gold-primary/8"
                  : "border-charcoal/10"
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-heading text-sm text-charcoal">
                  {service.name}
                </span>
                {selected ? (
                  <span className="border border-gold-primary/35 bg-gold-primary/10 px-2 py-1 font-accent text-[9px] uppercase tracking-[0.14em] text-gold-dark">
                    Added
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
                {servicePriceLabel(service)}
                {service.unit ? ` · ${service.unit}` : ""}
              </span>
              <span className="mt-2 block text-[11px] leading-relaxed text-slate">
                {service.service_scope ??
                  service.description ??
                  "Scope will be confirmed with the vendor."}
              </span>
              <span className="mt-2 block text-[10px] text-slate/80">
                {(service.items ?? []).length} catalogue row
                {(service.items ?? []).length === 1 ? "" : "s"} ·{" "}
                {(service.inclusions ?? []).length} inclusion
                {(service.inclusions ?? []).length === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ServiceOfferingPreview({
  categoryKey,
  vendorName,
  service,
  onUseSelection,
}: {
  categoryKey: PlannerVendorCategoryKey;
  vendorName: string;
  service: VendorPlannerService;
  onUseSelection: (selectedItemIds: string[]) => void;
}) {
  const copy = useMemo(() => categoryCopy(categoryKey), [categoryKey]);
  const allCatalogueItems = useMemo(
    () =>
      (service.items ?? [])
        .slice()
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)),
    [service.items]
  );
  const COLLAPSED_LIMIT = 8;
  const [showAllItems, setShowAllItems] = useState(false);
  const hasMoreItems = allCatalogueItems.length > COLLAPSED_LIMIT;
  const catalogueItems = useMemo(
    () =>
      showAllItems
        ? allCatalogueItems
        : allCatalogueItems.slice(0, COLLAPSED_LIMIT),
    [allCatalogueItems, showAllItems]
  );
  const groupedCatalogue = useMemo(() => {
    const buckets = new Map<string, VendorPlannerServiceItem[]>();
    for (const item of catalogueItems) {
      const key = item.item_type || "inclusion";
      const bucket = buckets.get(key);
      if (bucket) bucket.push(item);
      else buckets.set(key, [item]);
    }
    return Array.from(buckets.entries()).map(([itemType, list]) => ({
      itemType,
      heading:
        copy.groupHeadings[itemType] ?? serviceItemTypeLabel(itemType),
      items: list,
    }));
  }, [catalogueItems, copy.groupHeadings]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() =>
    allCatalogueItems.map((item) => item.id)
  );
  const [appliedSelectionCount, setAppliedSelectionCount] = useState<
    number | null
  >(null);

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((entry) => entry !== itemId)
        : [...current, itemId]
    );
  };

  const selectedCount = selectedItemIds.filter((id) =>
    allCatalogueItems.some((item) => item.id === id)
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            {copy.catalogueLabel}
          </p>
          <p className="mt-1 font-heading text-sm text-charcoal">
            {service.name}
          </p>
          <p className="mt-1 text-xs text-slate">
            {service.description ?? `${vendorName} package details.`}
          </p>
        </div>
        <p className="font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
          From {formatCurrency(service.base_price)}
          {service.unit ? ` · ${service.unit}` : ""}
        </p>
      </div>

      {service.service_scope ? (
        <div className="border border-charcoal/8 bg-cream/35 p-3">
          <p className={dashLabel}>Scope</p>
          <p className="mt-2 text-xs leading-relaxed text-charcoal">
            {service.service_scope}
          </p>
        </div>
      ) : null}

      <ServiceChipRow label="Best for" items={service.event_type_fit ?? []} />
      <ServiceChipRow label="Includes" items={service.inclusions ?? []} />
      <ServiceChipRow label="Deliverables" items={service.deliverables ?? []} />
      <ServiceChipRow label="Add-ons" items={service.add_ons ?? []} />

      {catalogueItems.length > 0 ? (
        <div className="border-t border-charcoal/8 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={dashLabel}>{copy.catalogueLabel}</p>
              <p className="mt-1 text-[11px] text-slate">
                {selectedCount} of {allCatalogueItems.length} selected
                {hasMoreItems && !showAllItems
                  ? ` · ${allCatalogueItems.length} total`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark"
              onClick={() =>
                setSelectedItemIds((current) =>
                  current.length === allCatalogueItems.length
                    ? []
                    : allCatalogueItems.map((item) => item.id)
                )
              }
            >
              {selectedItemIds.length === allCatalogueItems.length
                ? "Clear rows"
                : "Select all"}
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {groupedCatalogue.map((group) => (
              <div
                key={group.itemType}
                className="border border-charcoal/8 bg-cream/25 p-2"
              >
                <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                  {group.heading}
                </p>
                <ul className="mt-2 list-none space-y-2 pl-0">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer gap-3 border border-charcoal/8 bg-ivory/70 p-2 transition-colors hover:border-gold-primary/40">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="mt-1 h-3.5 w-3.5 shrink-0 border border-charcoal/30 accent-gold-primary"
                        />
                        {item.image_urls && item.image_urls.length > 0 ? (
                          <span className="h-10 w-10 shrink-0 overflow-hidden border border-charcoal/10 bg-cream/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_urls[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </span>
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="font-heading text-xs text-charcoal">
                            {item.name}
                          </span>
                          {item.description ? (
                            <span className="mt-1 block text-[11px] leading-relaxed text-slate">
                              {item.description}
                            </span>
                          ) : null}
                          {item.dietary_tags?.length ? (
                            <span className="mt-1 block text-[11px] text-sage">
                              {item.dietary_tags.join(", ")}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {hasMoreItems ? (
            <button
              type="button"
              onClick={() => setShowAllItems((current) => !current)}
              className="font-accent mt-3 inline-flex items-center gap-2 border border-charcoal/15 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
            >
              {showAllItems
                ? `Show fewer rows`
                : `Show all ${allCatalogueItems.length} rows`}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="border border-dashed border-charcoal/15 bg-cream/25 p-3">
          <p className={dashLabel}>{copy.catalogueLabel}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate">
            {vendorName} has not itemized this package yet. You can still use the
            scope, inclusions, and deliverables above in this event plan.
          </p>
        </div>
      )}

      <button
        type="button"
        className="font-accent w-full border border-gold-primary/45 bg-gold-primary/10 px-3 py-2.5 text-[10px] uppercase tracking-[0.18em] text-gold-dark transition-colors hover:bg-gold-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          onUseSelection(selectedItemIds);
          setAppliedSelectionCount(
            allCatalogueItems.length > 0 ? selectedCount : 1
          );
        }}
        disabled={allCatalogueItems.length > 0 && selectedCount === 0}
      >
        {importActionLabel(categoryKey, allCatalogueItems.length > 0)}
      </button>
      {appliedSelectionCount !== null ? (
        <div className="border border-sage/25 bg-sage/10 p-3">
          <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-sage">
            Added to this event
          </p>
          <p className="mt-1 text-xs leading-relaxed text-charcoal">
            {appliedSelectionCount} row
            {appliedSelectionCount === 1 ? "" : "s"} applied. Keep editing this
            section or choose another package without losing your place.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ServiceChipRow({ label, items }: { label: string; items: string[] }) {
  const visibleItems = items.filter(Boolean).slice(0, 5);
  if (visibleItems.length === 0) return null;

  return (
    <div>
      <p className={dashLabel}>{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <span
            key={`${label}-${item}`}
            className="border border-charcoal/10 bg-cream/35 px-2 py-1 font-heading text-[11px] text-charcoal"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function importActionLabel(
  categoryKey: PlannerVendorCategoryKey,
  hasCatalogueItems: boolean
) {
  if (!hasCatalogueItems) return "Use package summary";
  if (categoryKey === "catering") return "Add selected rows to menu";
  if (categoryKey === "decor") return "Add selected setups to design";
  if (categoryKey === "photography") return "Add selected coverage to notes";
  if (categoryKey === "logistics") return "Add selected logistics to plan";
  if (categoryKey === "hospitality") return "Add selected hospitality to plan";
  return "Add selected sets to notes";
}

function serviceItemTypeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const TIME_BLOCK_LABEL_BY_KEY = new Map<EventTimeBlockKey, string>(
  EVENT_TIME_BLOCKS.map((block) => [block.key, block.label])
);

function classifyEventBlock(event: WeddingEvent): EventTimeBlockKey | null {
  if (event.time_block) return event.time_block;

  const tag = (event.event_type ?? "").toLowerCase();
  for (const block of EVENT_TIME_BLOCKS) {
    if (tag === block.key || tag.includes(block.label.toLowerCase())) {
      return block.key;
    }
  }

  const start = event.start_time;
  if (!start || start.length < 4) return null;
  const hour = Number(start.slice(0, 2));
  if (!Number.isFinite(hour)) return null;
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function DefinitionLayer({
  weddingName,
  days,
  totalEvents,
}: {
  weddingName: string;
  days: WeddingDay[];
  totalEvents: number;
}) {
  return (
    <motion.section variants={fadeUp} className="mt-8 space-y-5">
      <div className={cn(dashCard, "border-dashed border-gold-primary/35 bg-gold-primary/5")}>
        <p className={cn(dashLabel, "text-gold-dark")}>What&apos;s defined so far</p>
        <h3 className="mt-2 font-display text-2xl text-charcoal">
          {weddingName || "Your event"}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">
          You have {days.length} {days.length === 1 ? "day" : "days"} and{" "}
          {totalEvents} time {totalEvents === 1 ? "block" : "blocks"} drafted.
          Refine each block under{" "}
          <span className="text-gold-dark">Requirements</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.length === 0 ? (
          <div className={cn(dashCard, "border-dashed border-charcoal/15")}>
            <p className={dashLabel}>No days yet</p>
            <p className="mt-2 text-sm text-slate">
              Switch to Requirements and use the Add day control to seed one.
            </p>
          </div>
        ) : null}

        {days.map((day) => (
          <article key={day.id} className={dashCard}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={dashLabel}>Day {day.sort_order + 1}</p>
                <p className="mt-1 font-display text-lg text-charcoal">{day.name}</p>
                <p className="mt-1 text-xs text-slate">{formatDayDate(day.date)}</p>
              </div>
              <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                {day.events.length} {day.events.length === 1 ? "block" : "blocks"}
              </span>
            </div>

            <ul className="mt-4 list-none space-y-2 pl-0">
              {EVENT_TIME_BLOCKS.map((block) => {
                const events = day.events.filter(
                  (event) => classifyEventBlock(event) === block.key
                );
                const label = TIME_BLOCK_LABEL_BY_KEY.get(block.key) ?? block.label;

                if (events.length === 0) {
                  return (
                    <li
                      key={block.key}
                      className="border border-dashed border-charcoal/12 bg-cream/30 px-3 py-2"
                    >
                      <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate/70">
                        {label} · skipped
                      </p>
                    </li>
                  );
                }

                return events.map((event) => (
                  <li
                    key={event.id}
                    className="border border-charcoal/8 bg-cream/40 px-3 py-2"
                  >
                    <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                      {label}
                    </p>
                    <p className="mt-1 font-heading text-sm text-charcoal">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate">
                      {formatEventWindow(event)}
                    </p>
                  </li>
                ));
              })}
            </ul>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

type CheckResult = {
  key: string;
  label: string;
  description: string;
  status: "ok" | "missing" | "partial";
  detail: string;
};

function computeFinalizationChecks(
  days: WeddingDay[],
  venueOptions: VenueOption[],
  weddingDate: string | null
): CheckResult[] {
  const allEvents = days.flatMap((day) => day.events);
  const totalEvents = allEvents.length;
  const allRequirements = allEvents.flatMap(
    (event) => event.requirements ?? []
  );
  const eventsMissingRequirements = allEvents.filter(
    (event) => (event.requirements ?? []).length === 0
  ).length;
  const unresolvedRequirements = allRequirements.filter(
    (requirement) =>
      requirement.status !== "CONFIRMED" && requirement.status !== "DONE"
  ).length;
  const hospitalityRequirements = allRequirements.filter(
    (requirement) => requirement.category === "hospitality"
  );
  const draftHospitalityRequirements = hospitalityRequirements.filter(
    (requirement) => requirement.status === "DRAFT"
  ).length;
  const missingVendors = allEvents.filter((event) =>
    Boolean(firstMissingVendorCategory(event))
  ).length;
  const missingFoodMenus = allEvents.filter((event) => {
    const needsFood = (event.requirements ?? []).some(
      (requirement) => requirement.category === "food"
    );
    return needsFood && event.menus.length === 0;
  }).length;
  const missingLogistics = allEvents.filter(
    (event) => !hasLogisticsDetails(event.logistics)
  ).length;
  const spendEstimates = allEvents.map((event) =>
    estimateEventSpend(event, venueOptions)
  );
  const missingBudget = spendEstimates.filter(
    (estimate) => estimate.max <= 0
  ).length;
  const pricingGaps = spendEstimates.reduce(
    (sum, estimate) => sum + estimate.missingCount,
    0
  );
  const totalSpendEstimate = combineSpendEstimates(spendEstimates);
  const missingGuestCount = allEvents.filter(
    (event) => !event.guest_count || event.guest_count <= 0
  ).length;
  const missingTasks = allEvents.filter((event) => event.tasks.length === 0).length;

  return EVENT_FINALIZATION_CHECKLIST.map((entry): CheckResult => {
    switch (entry.key) {
      case "definition":
        if (!weddingDate) {
          return {
            key: entry.key,
            label: entry.label,
            description: entry.description,
            status: "missing",
            detail: "No primary date is set yet.",
          };
        }
        if (totalEvents === 0) {
          return {
            key: entry.key,
            label: entry.label,
            description: entry.description,
            status: "missing",
            detail: "No time blocks have been added yet.",
          };
        }
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status: "ok",
          detail: `${days.length} day(s) · ${totalEvents} block(s) confirmed.`,
        };
      case "requirements":
        if (totalEvents === 0) {
          return {
            key: entry.key,
            label: entry.label,
            description: entry.description,
            status: "missing",
            detail: "No blocks to fill requirements against.",
          };
        }
        if (eventsMissingRequirements > 0) {
          return {
            key: entry.key,
            label: entry.label,
            description: entry.description,
            status: "missing",
            detail: `${eventsMissingRequirements} block(s) still need requirement cards.`,
          };
        }
        if (unresolvedRequirements > 0 || missingFoodMenus > 0) {
          return {
            key: entry.key,
            label: entry.label,
            description: entry.description,
            status: "partial",
            detail: `${unresolvedRequirements} need(s) unresolved · ${missingFoodMenus} food plan(s) missing.`,
          };
        }
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status: "ok",
          detail: `${allRequirements.length} requirement card(s) confirmed or done.`,
        };
      case "vendors":
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status: missingVendors === 0 && totalEvents > 0 ? "ok" : "partial",
          detail: `${missingVendors} of ${totalEvents} block(s) still have a partner or package gap.`,
        };
      case "budget":
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status: missingBudget === 0 && totalEvents > 0 ? "ok" : "partial",
          detail:
            missingBudget === 0 && totalEvents > 0
              ? `${spendEstimateLabel(totalSpendEstimate)} derived · ${spendEstimateCaption(totalSpendEstimate)}.`
              : `${missingBudget} block(s) need venue/package pricing · ${pricingGaps} service price gap(s).`,
        };
      case "guests-hotels":
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status:
            missingGuestCount === 0 &&
            draftHospitalityRequirements === 0 &&
            totalEvents > 0
              ? "ok"
              : "partial",
          detail: `${missingGuestCount} guest count gap(s) · ${draftHospitalityRequirements} hospitality draft(s).`,
        };
      case "run-of-show":
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status:
            missingTasks === 0 && missingLogistics === 0 && totalEvents > 0
              ? "ok"
              : "partial",
          detail: `${missingTasks} block(s) without tasks · ${missingLogistics} without logistics.`,
        };
      default: {
        const fallback = entry as unknown as {
          key: string;
          label: string;
          description: string;
        };
        return {
          key: fallback.key,
          label: fallback.label,
          description: fallback.description,
          status: "ok",
          detail: "",
        };
      }
    }
  });
}

function hasLogisticsDetails(logistics: EventLogistics | null) {
  if (!logistics) return false;

  return [
    logistics.guestArrivalTime,
    logistics.vendorLoadInTime,
    logistics.familyCallTime,
    logistics.transportNotes,
    logistics.roomingNotes,
    logistics.weatherPlan,
    logistics.ceremonyNotes,
  ].some((value) => Boolean(value?.trim()));
}

function FinalizationLayer({
  days,
  venueOptions,
  weddingDate,
  onResolveCheck,
}: {
  days: WeddingDay[];
  venueOptions: VenueOption[];
  weddingDate: string | null;
  onResolveCheck: (checkKey: string) => void;
}) {
  const checks = useMemo(
    () => computeFinalizationChecks(days, venueOptions, weddingDate),
    [days, venueOptions, weddingDate]
  );

  return (
    <motion.div variants={fadeUp}>
      <FinalizationBoard checks={checks} onResolve={onResolveCheck} />
    </motion.div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={dashLabel}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
