"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import {
  DECOR_STYLE_OPTIONS,
  EVENT_TASK_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  FOOD_STYLE_OPTIONS,
  MEAL_PERIOD_OPTIONS,
  MENU_COURSE_OPTIONS,
  PLANNER_VENDOR_CATEGORIES,
  type PlannerVendorCategoryKey,
} from "@/lib/wedding-plan";
import { categoryCopy } from "@/lib/vendor-offering";
import {
  EVENT_FINALIZATION_CHECKLIST,
  EVENT_PLATFORM_TYPES,
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
  vendorSelections: Record<PlannerVendorCategoryKey, VendorDraftSelection | null>;
};

type EditorSectionKey =
  | "basics"
  | "requirements"
  | "food"
  | "design"
  | "vendors"
  | "logistics"
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
    helper: "Name, day, time, venue, guests, and budget.",
  },
  // The standalone "Needs" tab was removed to cut redundancy — food, decor,
  // vendors, and logistics each have their own dedicated section below, so a
  // separate generic needs-checklist repeated the same categories. The
  // underlying requirement drafts are still loaded and saved; they're just no
  // longer surfaced as a duplicate tab.
  {
    key: "food",
    label: "Food",
    helper: "Menus, counters, dietary notes, and service style.",
  },
  {
    key: "design",
    label: "Design",
    helper: "Decor direction, atmosphere, and styling cues.",
  },
  {
    key: "vendors",
    label: "Vendors",
    helper: "Pick real vendors and packages for this event.",
  },
  {
    key: "logistics",
    label: "Logistics",
    helper: "Guest movement, load-in, rooms, and backup plans.",
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

const BLOCK_PURPOSE_OPTIONS: string[] = Array.from(
  new Set([
    ...EVENT_TYPE_OPTIONS,
    ...EVENT_PLATFORM_TYPES.map((eventType) => eventType.label),
  ])
);

function blockPurposeOptionsWithCurrent(value: string) {
  return value && !BLOCK_PURPOSE_OPTIONS.includes(value)
    ? [value, ...BLOCK_PURPOSE_OPTIONS]
    : BLOCK_PURPOSE_OPTIONS;
}

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
  return EVENT_REQUIREMENT_CATEGORIES.map((category) =>
    createRequirementDraft(category.key)
  );
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
  VendorDraftSelection | null
> {
  return {
    catering: null,
    decor: null,
    photography: null,
    entertainment: null,
  };
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

    vendorSelections[plannerCategory.key] = {
      vendorProfileId: selection.vendor.id,
      vendorSlug: selection.vendor.slug,
      vendorServiceId: selection.service?.id ?? "",
    };
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

function summarizeDayPlan(day: WeddingDay) {
  const eventCount = day.events.length;
  const estimatedSpend = day.events.reduce(
    (sum, event) => sum + (event.estimated_budget ?? 0),
    0
  );
  const vendorPicks = day.events.reduce(
    (sum, event) => sum + event.vendorSelections.length,
    0
  );
  return { eventCount, estimatedSpend, vendorPicks };
}

function formatBookingStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
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

function importTargetSection(categoryKey: PlannerVendorCategoryKey): EditorSectionKey {
  if (categoryKey === "catering") return "food";
  if (categoryKey === "decor") return "design";
  return "notes";
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
  >({
    catering: [],
    decor: [],
    photography: [],
    entertainment: [],
  });

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
    if (!stillExists) {
      setSelectedEventId(allEvents[0]?.id ?? null);
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
    setEditorSection("basics");
  }, [selectedEventId]);

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
          setVendorOptions({
            catering: entries.find((entry) => entry[0] === "catering")?.[1] ?? [],
            decor: entries.find((entry) => entry[0] === "decor")?.[1] ?? [],
            photography:
              entries.find((entry) => entry[0] === "photography")?.[1] ?? [],
            entertainment:
              entries.find((entry) => entry[0] === "entertainment")?.[1] ?? [],
          });
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
      days.reduce(
        (sum, day) =>
          sum +
          day.events.reduce(
            (eventSum, event) => eventSum + (event.estimated_budget ?? 0),
            0
          ),
        0
      ),
    [days]
  );

  // Needs the client picked for this block during the layered definition. We
  // read them from the event's saved requirement rows (the source of truth),
  // not the editable draft — the draft falls back to "all categories" when a
  // block has no rows, which would defeat the filtering.
  const activeRequirementCategories = useMemo(() => {
    const set = new Set<EventRequirementCategoryKey>();
    for (const requirement of selectedEvent?.requirements ?? []) {
      set.add(requirement.category);
    }
    return set;
  }, [selectedEvent]);

  // Hide the dedicated sections for needs the client didn't ask for. Cross-cutting
  // sections (basics, vendors, tasks, notes) always show. If the event carries no
  // requirement rows at all — legacy plans, or a block created with zero needs —
  // we show everything so nothing is silently unreachable.
  const visibleEditorSections = useMemo(() => {
    if (activeRequirementCategories.size === 0) return EDITOR_SECTIONS;
    return EDITOR_SECTIONS.filter((section) => {
      if (section.key === "food") return activeRequirementCategories.has("food");
      if (section.key === "design")
        return activeRequirementCategories.has("decor");
      if (section.key === "logistics")
        return activeRequirementCategories.has("logistics");
      return true;
    });
  }, [activeRequirementCategories]);

  const activeEditorSection =
    visibleEditorSections.find((section) => section.key === editorSection) ??
    visibleEditorSections[0];

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
        event.vendorSelections
          .filter((selection) => selection.vendor?.categorySlug === category.slug)
          .at(-1) ?? null,
      ])
    ) as Record<PlannerVendorCategoryKey, EventVendorSelection | null>;

    for (const category of PLANNER_VENDOR_CATEGORIES) {
      const currentSelection = currentSelectionsByCategory[category.key];
      const nextSelection = draft.vendorSelections[category.key];

      const selectionChanged =
        (currentSelection?.vendor?.id ?? "") !==
          (nextSelection?.vendorProfileId ?? "") ||
        (currentSelection?.service?.id ?? "") !==
          (nextSelection?.vendorServiceId ?? "");

      if (!selectionChanged) continue;

      if (currentSelection && currentSelection.status !== "INQUIRY") {
        throw new Error(
          `${category.label} is already ${formatBookingStatus(
            currentSelection.status
          )}. Update that booking from the bookings area instead.`
        );
      }

      if (currentSelection?.id) {
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

      if (nextSelection?.vendorProfileId) {
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
          estimatedBudget: detailDraft.estimatedBudget
            ? Number(detailDraft.estimatedBudget)
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
          decorNotes: appendPlanningBlock(current.decorNotes, title, lines),
          tasks: nextTasks,
        };
      }

      return {
        ...current,
        notes: appendPlanningBlock(current.notes, title, lines),
        tasks: nextTasks,
      };
    });

    setEditorSection(importTargetSection(categoryKey));
    toast.success(
      categoryKey === "catering"
        ? "Vendor catalogue added to the food plan"
        : "Vendor offering added to the event plan"
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

  const toggleMenuItemTag = (
    menuClientId: string,
    itemClientId: string,
    tag: string
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) =>
              menu.clientId === menuClientId
                ? {
                    ...menu,
                    items: menu.items.map((item) => {
                      if (item.clientId !== itemClientId) return item;
                      const active = item.dietaryTags.includes(tag);
                      return {
                        ...item,
                        dietaryTags: active
                          ? item.dietaryTags.filter((entry) => entry !== tag)
                          : [...item.dietaryTags, tag],
                      };
                    }),
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

  const updateRequirement = (
    requirementClientId: string,
    updates: Partial<Omit<EventRequirementDraft, "clientId">>
  ) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            requirements: current.requirements.map((requirement) =>
              requirement.clientId === requirementClientId
                ? { ...requirement, ...updates }
                : requirement
            ),
          }
        : current
    );
  };

  const addRequirement = () => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            requirements: [
              ...current.requirements,
              {
                ...createRequirementDraft("custom"),
                title: "Custom requirement",
                notes: "",
              },
            ],
          }
        : current
    );
  };

  const removeRequirement = (requirementClientId: string) => {
    setDetailDraft((current) =>
      current
        ? {
            ...current,
            requirements:
              current.requirements.length > 1
                ? current.requirements.filter(
                    (requirement) => requirement.clientId !== requirementClientId
                  )
                : current.requirements,
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
          <p className="mt-3 font-display text-3xl text-charcoal">{totalEvents}</p>
          <p className="mt-2 text-sm text-slate">
            Build the weekend flow from welcome to after-party.
          </p>
        </div>
        <div className={dashCard}>
          <p className={dashLabel}>Estimated event spend</p>
          <p className="mt-3 font-display text-3xl text-charcoal">
            {formatCurrency(estimatedSpend)}
          </p>
          <p className="mt-2 text-sm text-slate">
            {totalSelections} vendor selections already mapped into the plan.
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
                  ? "Step 2 · Fill in what each block needs — food, decor, vendors."
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
          weddingDate={wedding.date}
          onJumpToRequirements={() => setLayer("requirements")}
        />
      ) : null}

      {layer === "requirements" ? (
      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <motion.div
            variants={fadeUp}
            className="flex flex-col gap-4 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className={dashLabel}>Celebration board</p>
              <h3 className="mt-2 font-display text-2xl text-charcoal">
                Days, events, and flow
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
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
              className="mt-6 border border-charcoal/10 bg-ivory p-5"
            >
              <p className={dashLabel}>New celebration day</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            <div className="mt-8 space-y-6">
              {days
                .slice()
                .sort((left, right) => left.sort_order - right.sort_order)
                .map((day, dayIndex) => {
                  const daySummary = summarizeDayPlan(day);
                  return (
                  <motion.section
                    key={day.id}
                    variants={fadeUp}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDropOnDay(day.id)}
                    className={cn(
                      "border bg-ivory p-5 transition-colors",
                      draggedEventId ? "border-gold-primary/35" : "border-charcoal/10"
                    )}
                  >
                    <div className="flex flex-col gap-4 border-b border-charcoal/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
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
                              <p className={dashLabel}>Day {dayIndex + 1}</p>
                              <p className="font-heading text-xs text-slate">
                                {formatDayDate(day.date)}
                              </p>
                            </div>
                            <h4 className="mt-2 font-display text-2xl text-charcoal">
                              {day.name}
                            </h4>
                            <p className="mt-2 font-heading text-xs text-slate">
                              {daySummary.eventCount}{" "}
                              {daySummary.eventCount === 1 ? "event" : "events"}
                              {" · "}
                              {formatCurrency(daySummary.estimatedSpend)} estimated
                              {" · "}
                              {daySummary.vendorPicks} vendor{" "}
                              {daySummary.vendorPicks === 1 ? "pick" : "picks"}
                            </p>
                            {day.notes ? (
                              <p className="mt-3 max-w-2xl border-l-2 border-gold-primary/40 pl-4 text-sm leading-relaxed text-charcoal">
                                {day.notes}
                              </p>
                            ) : null}
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
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
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            value={eventDraft.name}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            placeholder="Event name"
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          />
                          <select
                            value={eventDraft.eventType}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                eventType: event.target.value,
                              }))
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          >
                            {blockPurposeOptionsWithCurrent(eventDraft.eventType).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
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
                          <input
                            type="text"
                            value={eventDraft.venue}
                            onChange={(event) =>
                              setEventDraft((current) => ({
                                ...current,
                                venue: event.target.value,
                              }))
                            }
                            placeholder="Venue or area"
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary md:col-span-2"
                          />
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
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {day.events
                          .slice()
                          .sort((left, right) => left.sort_order - right.sort_order)
                          .map((event, eventIndex) => (
                            <article
                              key={event.id}
                              draggable
                              onDragStart={() => setDraggedEventId(event.id)}
                              onDragEnd={() => setDraggedEventId(null)}
                              className={cn(
                                "border bg-ivory p-4 transition-all",
                                selectedEventId === event.id
                                  ? "border-gold-primary/45 shadow-[0_18px_40px_rgba(201,169,110,0.12)]"
                                  : "border-charcoal/10"
                              )}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className={dashLabel}>
                                    {event.event_type ?? "Custom event"}
                                  </p>
                                  <h5 className="mt-2 font-display text-xl text-charcoal">
                                    {event.name}
                                  </h5>
                                </div>
                                <button
                                  type="button"
                                  className={dashBtn}
                                  onClick={() => setSelectedEventId(event.id)}
                                >
                                  Open
                                </button>
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
                          ))}
                      </div>
                    )}
                  </motion.section>
                  );
                })}
            </div>
          )}
        </div>

        <motion.aside variants={fadeUp} className="self-start">
          <div className="sticky top-6 border border-charcoal/10 bg-ivory p-5">
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

                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Menus</p>
                    <p className="mt-1 font-display text-lg text-charcoal">
                      {detailDraft.menus.length}
                    </p>
                  </div>
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Vendors</p>
                    <p className="mt-1 font-display text-lg text-charcoal">
                      {Object.values(detailDraft.vendorSelections).filter(Boolean).length}
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
                  <Field label="Event name">
                    <input
                      type="text"
                      value={detailDraft.name}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                  <Field label="Event type">
                    <select
                      value={detailDraft.eventType}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, eventType: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    >
                      {blockPurposeOptionsWithCurrent(detailDraft.eventType).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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
                    <input
                      type="text"
                      value={detailDraft.venue}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, venue: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                  <Field label="Guest count">
                    <input
                      type="number"
                      min={1}
                      value={detailDraft.guestCount}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, guestCount: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                  <Field label="Estimated spend (INR)">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={detailDraft.estimatedBudget}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? {
                                ...current,
                                estimatedBudget: event.target.value,
                              }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    />
                  </Field>
                </div>

                ) : null}

                {editorSection === "requirements" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={dashLabel}>Block requirements</p>
                      <p className="mt-1 text-sm text-slate">
                        Decide what this time block actually needs before picking vendors.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
                      onClick={addRequirement}
                    >
                      Add custom need
                    </button>
                  </div>

                  <div className="space-y-3">
                    {detailDraft.requirements.map((requirement) => {
                      const category = requirementCategoryCopy(requirement.category);
                      return (
                        <div
                          key={requirement.clientId}
                          className="border border-charcoal/10 bg-cream/25 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                                {category.label}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-slate">
                                {category.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate transition-colors hover:text-rose"
                              onClick={() => removeRequirement(requirement.clientId)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <Field label="Need title">
                              <input
                                type="text"
                                value={requirement.title}
                                onChange={(event) =>
                                  updateRequirement(requirement.clientId, {
                                    title: event.target.value,
                                  })
                                }
                                className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              />
                            </Field>
                            <Field label="Category">
                              <select
                                value={requirement.category}
                                onChange={(event) =>
                                  updateRequirement(requirement.clientId, {
                                    category: event.target.value as EventRequirementCategoryKey,
                                  })
                                }
                                className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              >
                                {EVENT_REQUIREMENT_CATEGORIES.map((option) => (
                                  <option key={option.key} value={option.key}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Status">
                              <select
                                value={requirement.status}
                                onChange={(event) =>
                                  updateRequirement(requirement.clientId, {
                                    status: event.target.value,
                                  })
                                }
                                className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              >
                                {EVENT_REQUIREMENT_STATUS_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Priority">
                              <select
                                value={requirement.priority}
                                onChange={(event) =>
                                  updateRequirement(requirement.clientId, {
                                    priority: event.target.value,
                                  })
                                }
                                className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              >
                                {EVENT_REQUIREMENT_PRIORITY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>

                          <Field label="Structured starting points" className="mt-4">
                            <RequirementPayloadPreview payload={requirement.payload} />
                          </Field>

                          <Field label="Requirement notes" className="mt-4">
                            <textarea
                              value={requirement.notes}
                              onChange={(event) =>
                                updateRequirement(requirement.clientId, {
                                  notes: event.target.value,
                                })
                              }
                              className="min-h-[86px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              placeholder="Specific choices, constraints, questions for vendors, references..."
                            />
                          </Field>
                        </div>
                      );
                    })}
                  </div>
                </div>
                ) : null}

                {editorSection === "food" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div>
                    <p className={dashLabel}>Food and menu</p>
                    <p className="mt-1 text-sm text-slate">
                      Shape how hospitality should feel for this function.
                    </p>
                  </div>

                  <Field label="Service format">
                    <select
                      value={detailDraft.foodStyle}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, foodStyle: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    >
                      <option value="">Choose a food format</option>
                      {FOOD_STYLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div>
                    <p className={dashLabel}>Food preferences</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FOOD_PREFERENCE_OPTIONS.map((option) => {
                        const active = detailDraft.foodPreferences.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setDetailDraft((current) => {
                                if (!current) return current;
                                return {
                                  ...current,
                                  foodPreferences: active
                                    ? current.foodPreferences.filter(
                                        (entry) => entry !== option
                                      )
                                    : [...current.foodPreferences, option],
                                };
                              })
                            }
                            className={cn(
                              "border px-3 py-2 font-heading text-xs transition-colors",
                              active
                                ? "border-gold-primary bg-gold-primary/10 text-charcoal"
                                : "border-charcoal/15 text-slate"
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Field label="Menu notes">
                    <textarea
                      value={detailDraft.menuNotes}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, menuNotes: event.target.value }
                            : current
                        )
                      }
                      className="min-h-[96px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      placeholder="Cuisine mix, guest diet needs, signature counters, late-night snacks..."
                    />
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
                            <input
                              type="text"
                              value={menu.serviceStyle}
                              onChange={(event) =>
                                updateMenuDraft(menu.clientId, {
                                  serviceStyle: event.target.value,
                                })
                              }
                              className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              placeholder="Buffet, plated, live counters, family style..."
                            />
                          </Field>
                        </div>

                        <Field label="Menu brief">
                          <textarea
                            value={menu.notes}
                            onChange={(event) =>
                              updateMenuDraft(menu.clientId, {
                                notes: event.target.value,
                              })
                            }
                            className="min-h-[80px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                            placeholder="Menu story, cuisines, service pacing, chef notes..."
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
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(event) =>
                                    updateMenuItem(menu.clientId, item.clientId, {
                                      name: event.target.value,
                                    })
                                  }
                                  className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                                  placeholder="Dish, counter, drink, or station"
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

                              <div className="flex flex-wrap gap-2">
                                {FOOD_PREFERENCE_OPTIONS.slice(0, 5).map((tag) => {
                                  const active = item.dietaryTags.includes(tag);
                                  return (
                                    <button
                                      key={`${item.clientId}-${tag}`}
                                      type="button"
                                      onClick={() =>
                                        toggleMenuItemTag(
                                          menu.clientId,
                                          item.clientId,
                                          tag
                                        )
                                      }
                                      className={cn(
                                        "border px-2 py-1 font-heading text-[11px] transition-colors",
                                        active
                                          ? "border-gold-primary bg-gold-primary/10 text-charcoal"
                                          : "border-charcoal/15 text-slate"
                                      )}
                                    >
                                      {tag}
                                    </button>
                                  );
                                })}
                              </div>

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
                      Translate the mood into something vendors can execute.
                    </p>
                  </div>

                  <Field label="Decor direction">
                    <select
                      value={detailDraft.decorStyle}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, decorStyle: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    >
                      <option value="">Choose a decor style</option>
                      {DECOR_STYLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Decor notes">
                    <textarea
                      value={detailDraft.decorNotes}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, decorNotes: event.target.value }
                            : current
                        )
                      }
                      className="min-h-[96px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      placeholder="Stage mood, florals, palettes, guest tables, aisle, lighting..."
                    />
                  </Field>

                  <Field label="Dress code or styling cues">
                    <input
                      type="text"
                      value={detailDraft.attireNotes}
                      onChange={(event) =>
                        setDetailDraft((current) =>
                          current
                            ? { ...current, attireNotes: event.target.value }
                            : current
                        )
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      placeholder="Pastels, festive jewel tones, black tie, beach chic..."
                    />
                  </Field>
                </div>

                ) : null}

                {editorSection === "vendors" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={dashLabel}>Vendor planning</p>
                      <p className="mt-1 text-sm text-slate">
                        Match real vendors and services to this event.
                      </p>
                    </div>
                    {vendorOptionsLoading ? (
                      <p className="text-xs text-slate">Loading vendors...</p>
                    ) : null}
                  </div>

                  {PLANNER_VENDOR_CATEGORIES.map((category) => {
                    const selection = detailDraft.vendorSelections[category.key];
                    const options = vendorOptions[category.key] ?? [];
                    const currentBookingSelection =
                      selectedEvent?.vendorSelections
                        .filter(
                          (entry) => entry.vendor?.categorySlug === category.slug
                        )
                        .at(-1) ?? null;
                    const selectedVendor =
                      options.find(
                        (option) => option.id === selection?.vendorProfileId
                      ) ?? null;

                    return (
                      <div key={category.key} className="border border-charcoal/10 p-4">
                        <p className="font-display text-lg text-charcoal">
                          {category.label}
                        </p>
                        <p className="mt-1 text-sm text-slate">{category.hint}</p>

                        <div className="mt-3 space-y-3">
                          <select
                            value={selection?.vendorProfileId ?? ""}
                            onChange={(event) =>
                              setDetailDraft((current) => {
                                if (!current) return current;
                                const vendor = options.find(
                                  (option) => option.id === event.target.value
                                );
                                return {
                                  ...current,
                                  vendorSelections: {
                                    ...current.vendorSelections,
                                    [category.key]: vendor
                                      ? {
                                          vendorProfileId: vendor.id,
                                          vendorSlug: vendor.slug,
                                          vendorServiceId: "",
                                        }
                                      : null,
                                  },
                                };
                              })
                            }
                            className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          >
                            <option value="">Choose a vendor</option>
                            {options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.business_name}
                              </option>
                            ))}
                          </select>

                          {selectedVendor ? (
                            <>
                              <div className="border border-charcoal/10 bg-cream/35 p-3">
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
                                  <span className="font-accent border border-gold-primary/40 bg-gold-primary/8 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                                    {selectedVendor.services.length}{" "}
                                    {selectedVendor.services.length === 1
                                      ? "service"
                                      : "services"}
                                  </span>
                                </div>
                                {currentBookingSelection ? (
                                  <p className="mt-2 text-xs text-slate">
                                    Current booking status:{" "}
                                    {formatBookingStatus(currentBookingSelection.status)}
                                  </p>
                                ) : null}
                              </div>

                              <select
                                value={selection?.vendorServiceId ?? ""}
                                onChange={(event) =>
                                  setDetailDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          vendorSelections: {
                                            ...current.vendorSelections,
                                            [category.key]:
                                              current.vendorSelections[category.key]
                                                ? {
                                                    ...current.vendorSelections[
                                                      category.key
                                                    ]!,
                                                    vendorServiceId:
                                                      event.target.value,
                                                  }
                                                : null,
                                          },
                                        }
                                      : current
                                  )
                                }
                                className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                              >
                                <option value="">Choose a service or package</option>
                                {selectedVendor.services.map((service) => (
                                  <option key={service.id} value={service.id}>
                                    {service.name}
                                  </option>
                                ))}
                              </select>

                              {selection?.vendorServiceId ? (
                                <div className="border border-charcoal/10 p-3">
                                  {selectedVendor.services
                                    .filter(
                                      (service) =>
                                        service.id === selection.vendorServiceId
                                    )
                                    .map((service) => (
                                      <ServiceOfferingPreview
                                        key={service.id}
                                        categoryKey={category.key}
                                        vendorName={selectedVendor.business_name}
                                        service={service}
                                        onUseSelection={(selectedItemIds) =>
                                          applyVendorServiceToPlan({
                                            categoryKey: category.key,
                                            vendor: selectedVendor,
                                            service,
                                            selectedItemIds,
                                          })
                                        }
                                      />
                                    ))}
                                </div>
                              ) : (
                                <div className="border border-dashed border-charcoal/15 bg-cream/25 p-3">
                                  <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                                    Pick a service
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-slate">
                                    Choose a package above to see {selectedVendor.business_name}&apos;s scope,
                                    inclusions, deliverables, and itemized rows
                                    you can pull into this event.
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="border border-dashed border-charcoal/15 bg-cream/25 p-4">
                              <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                                No vendor picked yet
                              </p>
                              <p className="mt-2 text-xs leading-relaxed text-slate">
                                {category.hint} Once selected, their real
                                catalogue rows can be imported into this event
                                plan.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                ) : null}

                {editorSection === "logistics" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div>
                    <p className={dashLabel}>Logistics</p>
                    <p className="mt-1 text-sm text-slate">
                      Keep guest movement, vendor access, and family timing tied
                      to this event.
                    </p>
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
                    <textarea
                      value={detailDraft.logistics.transportNotes}
                      onChange={(event) =>
                        updateLogisticsDraft({
                          transportNotes: event.target.value,
                        })
                      }
                      className="min-h-[76px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      placeholder="Pickups, shuttle loops, valet, driver holding area..."
                    />
                  </Field>

                  <Field label="Rooms and family movement">
                    <textarea
                      value={detailDraft.logistics.roomingNotes}
                      onChange={(event) =>
                        updateLogisticsDraft({
                          roomingNotes: event.target.value,
                        })
                      }
                      className="min-h-[76px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      placeholder="Getting-ready rooms, family holding rooms, elder access..."
                    />
                  </Field>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Weather backup">
                      <textarea
                        value={detailDraft.logistics.weatherPlan}
                        onChange={(event) =>
                          updateLogisticsDraft({
                            weatherPlan: event.target.value,
                          })
                        }
                        className="min-h-[88px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                        placeholder="Indoor move, tenting, heat/rain plan..."
                      />
                    </Field>
                    <Field label="Ceremony or sequence notes">
                      <textarea
                        value={detailDraft.logistics.ceremonyNotes}
                        onChange={(event) =>
                          updateLogisticsDraft({
                            ceremonyNotes: event.target.value,
                          })
                        }
                        className="min-h-[88px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                        placeholder="Procession order, cue points, family moments..."
                      />
                    </Field>
                  </div>
                </div>

                ) : null}

                {editorSection === "tasks" ? (
                <div className="space-y-4 border-t border-charcoal/8 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={dashLabel}>Event tasks</p>
                      <p className="mt-1 text-sm text-slate">
                        Track the action items that belong specifically to this function.
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

                  <div className="space-y-3">
                    {detailDraft.tasks.map((task) => (
                      <div
                        key={task.clientId}
                        className="space-y-3 border border-charcoal/10 bg-cream/30 p-3"
                      >
                        <input
                          type="text"
                          value={task.title}
                          onChange={(event) =>
                            updateTask(task.clientId, {
                              title: event.target.value,
                            })
                          }
                          className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          placeholder="Task title"
                        />
                        <div className="grid gap-3 md:grid-cols-3">
                          <input
                            type="text"
                            value={task.owner}
                            onChange={(event) =>
                              updateTask(task.clientId, {
                                owner: event.target.value,
                              })
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                            placeholder="Owner"
                          />
                          <select
                            value={task.status}
                            onChange={(event) =>
                              updateTask(task.clientId, {
                                status: event.target.value,
                              })
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          >
                            {EVENT_TASK_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(event) =>
                              updateTask(task.clientId, {
                                dueDate: event.target.value,
                              })
                            }
                            className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          />
                        </div>
                        <button
                          type="button"
                          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                          onClick={() => removeTask(task.clientId)}
                          disabled={detailDraft.tasks.length === 1}
                        >
                          Remove task
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                ) : null}

                {editorSection === "notes" ? (
                  <div>
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
                  Pick an event from the day cards above to open the seven-step
                  editor — start with <span className="text-gold-dark">Basics</span>{" "}
                  for guest count and venue, then move down to vendors and tasks.
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
      ) : null}
    </motion.div>
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
        onClick={() => onUseSelection(selectedItemIds)}
        disabled={allCatalogueItems.length > 0 && selectedCount === 0}
      >
        {importActionLabel(categoryKey, allCatalogueItems.length > 0)}
      </button>
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
  return "Add selected sets to notes";
}

function serviceItemTypeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requirementCategoryCopy(categoryKey: EventRequirementCategoryKey) {
  return (
    EVENT_REQUIREMENT_CATEGORIES.find((category) => category.key === categoryKey) ??
    EVENT_REQUIREMENT_CATEGORIES.at(-1)!
  );
}

function payloadValueToLabel(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "To be decided";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return "To be decided";
}

function payloadKeyToLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RequirementPayloadPreview({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const entries = Object.entries(payload)
    .filter(([key]) => key !== "enabled")
    .slice(0, 8);

  if (entries.length === 0) {
    return (
      <p className="border border-dashed border-charcoal/15 bg-ivory/50 px-3 py-2 text-xs leading-relaxed text-slate">
        No structured fields yet. Use notes for now, and this requirement can
        still be matched to vendors and quotes.
      </p>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="border border-charcoal/8 bg-ivory/60 p-3">
          <p className="font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
            {payloadKeyToLabel(key)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-charcoal">
            {payloadValueToLabel(value)}
          </p>
        </div>
      ))}
    </div>
  );
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
  const missingVendors = allEvents.filter(
    (event) =>
      event.vendorSelections.length === 0 &&
      !(event.requirements ?? []).some(
        (requirement) =>
          Boolean(requirement.vendorProfileId) ||
          Boolean(requirement.vendorServiceId)
      )
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
  const missingBudget = allEvents.filter(
    (event) => !event.estimated_budget || event.estimated_budget <= 0
  ).length;
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
          detail: `${missingVendors} of ${totalEvents} block(s) still need a vendor or service link.`,
        };
      case "budget":
        return {
          key: entry.key,
          label: entry.label,
          description: entry.description,
          status: missingBudget === 0 && totalEvents > 0 ? "ok" : "partial",
          detail: `${missingBudget} block(s) without an estimated spend.`,
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
  weddingDate,
  onJumpToRequirements,
}: {
  days: WeddingDay[];
  weddingDate: string | null;
  onJumpToRequirements: () => void;
}) {
  const checks = useMemo(
    () => computeFinalizationChecks(days, weddingDate),
    [days, weddingDate]
  );
  const okCount = checks.filter((check) => check.status === "ok").length;
  const readyPercent = Math.round((okCount / checks.length) * 100);

  return (
    <motion.section variants={fadeUp} className="mt-8 space-y-5">
      <div className={cn(dashCard, "border-gold-primary/25 bg-gold-primary/5")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={dashLabel}>Layer 3 · Finalization</p>
            <h3 className="mt-2 font-display text-2xl text-charcoal">
              Finish the gaps before execution.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">
              This is the readiness pass for vendors, menus, budgets, guests,
              hotels, logistics, and the final run of show.
            </p>
          </div>
          <div className="border border-charcoal/10 bg-ivory/70 px-4 py-3 text-right">
            <p className="font-display text-3xl text-charcoal">{readyPercent}%</p>
            <p className={dashLabel}>Ready</p>
          </div>
        </div>
        <button
          type="button"
          className={cn(dashBtn, "mt-5")}
          onClick={onJumpToRequirements}
        >
          Fill requirements
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <article
            key={check.key}
            className={cn(
              dashCard,
              check.status === "ok"
                ? "border-sage/25 bg-sage/5"
                : check.status === "missing"
                  ? "border-rose/25 bg-rose/5"
                  : "border-gold-primary/25 bg-gold-primary/5"
            )}
          >
            <p className={dashLabel}>{check.status}</p>
            <h4 className="mt-2 font-display text-lg text-charcoal">
              {check.label}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate">
              {check.description}
            </p>
            <p className="mt-4 border-t border-charcoal/10 pt-3 text-xs text-charcoal">
              {check.detail}
            </p>
          </article>
        ))}
      </div>
    </motion.section>
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
