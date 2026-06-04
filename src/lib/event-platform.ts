export const CUSTOM_EVENT_TYPE_VALUE = "custom";

export const EVENT_PLATFORM_TYPES = [
  {
    value: "wedding",
    label: "Wedding",
    description: "Multi-day wedding weekends, ceremonies, receptions, and family events.",
  },
  {
    value: "engagement",
    label: "Engagement",
    description: "Ring ceremonies, roka functions, proposal dinners, and family introductions.",
  },
  {
    value: "corporate",
    label: "Corporate Event",
    description: "Offsites, conferences, award nights, leadership retreats, and launches.",
  },
  {
    value: "birthday",
    label: "Birthday",
    description: "Milestone birthdays, private parties, and curated celebration nights.",
  },
  {
    value: "anniversary",
    label: "Anniversary",
    description: "Intimate dinners, family celebrations, and larger hosted anniversaries.",
  },
  {
    value: "social",
    label: "Social Gathering",
    description: "Private hosted gatherings where hospitality and atmosphere matter.",
  },
  {
    value: "conference",
    label: "Conference",
    description: "Agenda-led events with guest movement, sessions, catering, and AV needs.",
  },
  {
    value: "product-launch",
    label: "Product Launch",
    description: "Brand moments with press, staging, guest experience, and production flow.",
  },
  {
    value: "retreat",
    label: "Retreat",
    description: "Wellness, leadership, creator, or team retreats across multiple days.",
  },
  {
    value: "concert",
    label: "Concert / Performance",
    description: "Entertainment-led evenings with stage, sound, lighting, and crowd flow.",
  },
  {
    value: "private-dinner",
    label: "Private Dinner",
    description: "Tasting menus, chef-led dinners, and intimate hosted experiences.",
  },
  {
    value: "festival",
    label: "Festival / Cultural Event",
    description: "Cultural programming, community events, fairs, and multi-zone experiences.",
  },
  {
    value: "hotel-hospitality",
    label: "Hotel / Hospitality Event",
    description: "Room blocks, guest hospitality, F&B programming, and on-property logistics.",
  },
  {
    value: CUSTOM_EVENT_TYPE_VALUE,
    label: "Custom Event",
    description: "A bespoke event format that needs its own structure.",
  },
] as const;

export type EventPlatformType = (typeof EVENT_PLATFORM_TYPES)[number]["value"];

export const EVENT_TIME_BLOCKS = [
  {
    key: "morning",
    label: "Morning",
    defaultStartTime: "09:00",
    defaultEndTime: "12:00",
  },
  {
    key: "afternoon",
    label: "Afternoon",
    defaultStartTime: "13:00",
    defaultEndTime: "17:00",
  },
  {
    key: "evening",
    label: "Evening",
    defaultStartTime: "18:30",
    defaultEndTime: "22:30",
  },
] as const;

export type EventTimeBlockKey = (typeof EVENT_TIME_BLOCKS)[number]["key"];

export const EVENT_REQUIREMENT_CATEGORIES = [
  {
    key: "food",
    label: "Food and beverage",
    description:
      "Meals, drinks, veg/non-veg split, live counters, pre-meal and post-meal stations.",
  },
  {
    key: "decor",
    label: "Decor and atmosphere",
    description: "Stage, floral, lighting, table styling, installations, and mood direction.",
  },
  {
    key: "photo-video",
    label: "Photo and video",
    description: "Coverage style, team size, deliverables, edits, reels, and key moments.",
  },
  {
    key: "entertainment",
    label: "Entertainment and production",
    description: "Performers, DJ, sound, stage, LED, technical rider, and show flow.",
  },
  {
    key: "hospitality",
    label: "Hospitality and hotels",
    description: "Room blocks, check-in flow, welcome amenities, and guest support.",
  },
  {
    key: "logistics",
    label: "Logistics and movement",
    description: "Transport, load-in, security, vendor movement, family call times, and weather plan.",
  },
  {
    key: "custom",
    label: "Custom requirement",
    description: "Anything specific to this event that does not fit a standard category.",
  },
] as const;

export type EventRequirementCategoryKey =
  (typeof EVENT_REQUIREMENT_CATEGORIES)[number]["key"];

export const EVENT_REQUIREMENT_STATUS_OPTIONS = [
  "DRAFT",
  "NEEDS_VENDOR",
  "QUOTE_NEEDED",
  "CONFIRMED",
  "DONE",
] as const;

export const EVENT_REQUIREMENT_PRIORITY_OPTIONS = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
] as const;

export type EventRequirementStatus =
  (typeof EVENT_REQUIREMENT_STATUS_OPTIONS)[number];

export type EventRequirementPriority =
  (typeof EVENT_REQUIREMENT_PRIORITY_OPTIONS)[number];

export const EVENT_FINALIZATION_CHECKLIST = [
  {
    key: "definition",
    label: "Event structure is complete",
    description: "Every day and time block has a clear purpose, name, and timing.",
  },
  {
    key: "requirements",
    label: "Requirements are filled",
    description: "Food, decor, photo/video, entertainment, hospitality, and logistics are captured.",
  },
  {
    key: "vendors",
    label: "Vendors are assigned",
    description: "Every selected requirement has a vendor or a clear sourcing gap.",
  },
  {
    key: "budget",
    label: "Budget is reconciled",
    description: "Planned, quoted, paid, and due amounts are aligned by day and event.",
  },
  {
    key: "guests-hotels",
    label: "Guests and hotels are covered",
    description: "Guest count, rooming notes, and hospitality moments are not missing.",
  },
  {
    key: "run-of-show",
    label: "Run of show is production-ready",
    description: "Tasks, timings, load-in, family calls, and contingency notes are ready.",
  },
] as const;

export type SafeJson =
  | null
  | string
  | number
  | boolean
  | SafeJson[]
  | { [key: string]: SafeJson };

export type EventDefinitionTimeBlock = {
  slot: EventTimeBlockKey;
  label: string;
  enabled: boolean;
  title: string;
  eventType: string;
  startTime: string | null;
  endTime: string | null;
  requirementCategories: EventRequirementCategoryKey[];
  notes: string | null;
};

export type EventDefinitionDay = {
  name: string;
  date: string | null;
  sortOrder: number;
  timeBlocks: EventDefinitionTimeBlock[];
};

export type EventDefinitionPayload = {
  version: 2;
  eventType: EventPlatformType;
  eventTypeLabel: string;
  customEventType: string | null;
  dayCount: number;
  layers: {
    definition: string;
    requirements: string;
    finalization: string;
  };
  days: EventDefinitionDay[];
  finalizationChecklist: typeof EVENT_FINALIZATION_CHECKLIST;
};

export type EventDefinitionPlanDay = {
  name: string;
  date: string | null;
  sortOrder: number;
  notes?: string | null;
  events: {
    name: string;
    eventType: string;
    startTime: string | null;
    endTime: string | null;
    timeBlock: EventTimeBlockKey | null;
    notes: string | null;
    sortOrder: number;
  }[];
};

export type EventRequirementSeed = {
  category: EventRequirementCategoryKey;
  title: string;
  status: EventRequirementStatus;
  priority: EventRequirementPriority;
  payload: Record<string, SafeJson>;
  notes: string | null;
  sortOrder: number;
};

type BuildEventDefinitionPayloadInput = {
  eventName: string;
  eventType: unknown;
  customEventType: unknown;
  eventDate: string | null;
  dayCount: unknown;
  days: unknown;
};

const MAX_STRING_LENGTH = 1000;

function clampString(value: string, maxLength = MAX_STRING_LENGTH) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function toOptionalString(value: unknown, maxLength = MAX_STRING_LENGTH) {
  return typeof value === "string" && value.trim()
    ? clampString(value, maxLength)
    : null;
}

export function normalizeDayCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 3;
  return Math.min(14, Math.max(1, Math.round(value)));
}

function dateAtMiddayIso(rawDate: string | null | undefined, offsetDays: number) {
  if (!rawDate) return null;
  const base = new Date(rawDate);
  if (Number.isNaN(base.getTime())) return null;

  const shifted = new Date(base);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  shifted.setUTCHours(12, 0, 0, 0);
  return shifted.toISOString();
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCHours(12, 0, 0, 0);
  return parsed.toISOString();
}

function normaliseLookup(value: string) {
  return value.trim().toLowerCase().replace(/[\s_/]+/g, "-");
}

export function resolveEventPlatformType(
  eventType: unknown,
  customEventType: unknown
): {
  eventType: EventPlatformType;
  eventTypeLabel: string;
  customEventType: string | null;
} {
  const rawType = toOptionalString(eventType, 80);
  const rawCustomType = toOptionalString(customEventType, 120);

  if (rawType) {
    const lookup = normaliseLookup(rawType);
    const match = EVENT_PLATFORM_TYPES.find(
      (option) =>
        option.value === lookup ||
        normaliseLookup(option.label) === lookup ||
        option.value === rawType
    );

    if (match && match.value !== CUSTOM_EVENT_TYPE_VALUE) {
      return {
        eventType: match.value,
        eventTypeLabel: match.label,
        customEventType: null,
      };
    }

    if (rawCustomType) {
      return {
        eventType: CUSTOM_EVENT_TYPE_VALUE,
        eventTypeLabel: "Custom Event",
        customEventType: rawCustomType,
      };
    }

    if (!match && rawType) {
      return {
        eventType: CUSTOM_EVENT_TYPE_VALUE,
        eventTypeLabel: "Custom Event",
        customEventType: rawType,
      };
    }
  }

  const wedding = EVENT_PLATFORM_TYPES[0];
  return {
    eventType: wedding.value,
    eventTypeLabel: wedding.label,
    customEventType: null,
  };
}

export function normalizeTimeBlockKey(value: unknown): EventTimeBlockKey | null {
  if (typeof value !== "string") return null;
  const lookup = normaliseLookup(value);
  return (
    EVENT_TIME_BLOCKS.find(
      (block) => block.key === lookup || normaliseLookup(block.label) === lookup
    )?.key ?? null
  );
}

function normalizeRequirementCategories(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(EVENT_REQUIREMENT_CATEGORIES.map((category) => category.key));
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? normaliseLookup(entry) : null))
        .filter(
          (entry): entry is EventRequirementCategoryKey =>
            !!entry && allowed.has(entry as EventRequirementCategoryKey)
        )
    )
  ).slice(0, EVENT_REQUIREMENT_CATEGORIES.length);
}

function readDayTimeBlock(day: Record<string, unknown>, slot: EventTimeBlockKey) {
  const blocks = day.timeBlocks ?? day.blocks ?? null;
  if (Array.isArray(blocks)) {
    return blocks.find((block) => {
      if (!block || typeof block !== "object") return false;
      const candidate = block as Record<string, unknown>;
      return normalizeTimeBlockKey(candidate.slot ?? candidate.key ?? candidate.timeBlock) === slot;
    });
  }

  const direct = day[slot];
  return direct && typeof direct === "object" ? direct : null;
}

function buildDefaultDayName(index: number, count: number, eventTypeLabel: string) {
  if (count === 1) return `${eventTypeLabel} Day`;
  return `Day ${index + 1}`;
}

function buildDefaultBlockTitle(
  dayName: string,
  blockLabel: string,
  eventTypeLabel: string
) {
  if (eventTypeLabel === "Wedding") {
    return `${blockLabel} function`;
  }

  return `${blockLabel} ${dayName}`;
}

function defaultRequirementCategoriesForBlock(
  block: EventDefinitionTimeBlock
): EventRequirementCategoryKey[] {
  if (block.requirementCategories.length > 0) {
    return block.requirementCategories;
  }

  return [
    "food",
    "decor",
    "photo-video",
    "entertainment",
    "hospitality",
    "logistics",
  ];
}

export function mealPeriodForTimeBlock(
  timeBlock: EventTimeBlockKey | null | undefined,
  startTime: string | null | undefined
) {
  if (timeBlock === "morning") return "Breakfast";
  if (timeBlock === "afternoon") return "Lunch";
  if (timeBlock === "evening") return "Dinner";
  if (!startTime) return "Meal";
  if (startTime < "12:00") return "Breakfast";
  if (startTime < "17:00") return "Lunch";
  return "Dinner";
}

function requirementPayloadForCategory({
  category,
  eventName,
  timeBlock,
  startTime,
}: {
  category: EventRequirementCategoryKey;
  eventName: string;
  timeBlock: EventTimeBlockKey | null;
  startTime: string | null;
}): Record<string, SafeJson> {
  const mealPeriod = mealPeriodForTimeBlock(timeBlock, startTime);

  if (category === "food") {
    return {
      enabled: true,
      mealPeriod,
      dietaryMode: "mixed",
      vegRequired: true,
      nonVegRequired: true,
      drinks: [],
      preMealStations: [],
      mainCourse: [],
      postMealStations: [],
      liveStations: [],
      customStations: [],
      vendorNotes: "",
    };
  }

  if (category === "decor") {
    return {
      enabled: true,
      mood: "",
      areas: [],
      floral: "",
      lighting: "",
      installations: [],
      referenceNotes: "",
    };
  }

  if (category === "photo-video") {
    return {
      enabled: true,
      coverageStyle: "",
      moments: [eventName],
      deliverables: [],
      teamNotes: "",
    };
  }

  if (category === "entertainment") {
    return {
      enabled: timeBlock === "evening" || Boolean(startTime && startTime >= "17:00"),
      performanceType: "",
      sets: [],
      technicalNeeds: [],
      runOfShowNotes: "",
    };
  }

  if (category === "hospitality") {
    return {
      enabled: true,
      roomBlocks: [],
      hotelBookingNotes: "",
      welcomeAmenities: [],
      guestSupport: [],
    };
  }

  if (category === "logistics") {
    return {
      enabled: true,
      transport: "",
      loadIn: "",
      familyCall: "",
      weatherPlan: "",
      securityNotes: "",
    };
  }

  return {
    enabled: true,
    notes: "",
  };
}

export function buildDefaultRequirementsForEvent({
  eventName,
  timeBlock,
  startTime,
  categories,
}: {
  eventName: string;
  timeBlock: EventTimeBlockKey | null;
  startTime: string | null;
  categories?: EventRequirementCategoryKey[];
}): EventRequirementSeed[] {
  const block: EventDefinitionTimeBlock = {
    slot: timeBlock ?? "evening",
    label:
      EVENT_TIME_BLOCKS.find((entry) => entry.key === timeBlock)?.label ??
      "Event",
    enabled: true,
    title: eventName,
    eventType: eventName,
    startTime,
    endTime: null,
    requirementCategories: categories ?? [],
    notes: null,
  };

  return defaultRequirementCategoriesForBlock(block).map((category, index) => {
    const categoryCopy =
      EVENT_REQUIREMENT_CATEGORIES.find((entry) => entry.key === category) ??
      EVENT_REQUIREMENT_CATEGORIES.at(-1)!;

    return {
      category,
      title: categoryCopy.label,
      status: "DRAFT",
      priority: category === "food" || category === "logistics" ? "HIGH" : "NORMAL",
      payload: requirementPayloadForCategory({
        category,
        eventName,
        timeBlock,
        startTime,
      }),
      notes: categoryCopy.description,
      sortOrder: index,
    };
  });
}

function normalizeDefinitionTimeBlock(
  rawBlock: unknown,
  slot: (typeof EVENT_TIME_BLOCKS)[number],
  dayName: string,
  eventTypeLabel: string
): EventDefinitionTimeBlock {
  const hasExplicitBlock = Boolean(rawBlock && typeof rawBlock === "object");
  const block =
    rawBlock && typeof rawBlock === "object"
      ? (rawBlock as Record<string, unknown>)
      : {};
  const title =
    toOptionalString(block.title ?? block.name ?? block.label, 120) ??
    buildDefaultBlockTitle(dayName, slot.label, eventTypeLabel);
  const eventType =
    toOptionalString(block.eventType ?? block.type, 80) ?? title;
  const enabled =
    typeof block.enabled === "boolean"
      ? block.enabled
      : hasExplicitBlock
        ? Boolean(toOptionalString(block.title ?? block.name ?? block.label, 120))
        : true;

  return {
    slot: slot.key,
    label: slot.label,
    enabled,
    title,
    eventType,
    startTime: toOptionalString(block.startTime, 20) ?? slot.defaultStartTime,
    endTime: toOptionalString(block.endTime, 20) ?? slot.defaultEndTime,
    requirementCategories: normalizeRequirementCategories(
      block.requirementCategories ?? block.requirements
    ),
    notes: toOptionalString(block.notes, 600),
  };
}

function normalizeDefinitionDays(
  value: unknown,
  dayCount: number,
  eventDate: string | null,
  eventTypeLabel: string
) {
  if (!Array.isArray(value) || value.length === 0) {
    return Array.from({ length: dayCount }, (_, index): EventDefinitionDay => {
      const dayName = buildDefaultDayName(index, dayCount, eventTypeLabel);
      return {
        name: dayName,
        date: dateAtMiddayIso(eventDate, index - (dayCount - 1)),
        sortOrder: index,
        timeBlocks: EVENT_TIME_BLOCKS.map((slot) =>
          normalizeDefinitionTimeBlock(null, slot, dayName, eventTypeLabel)
        ),
      };
    });
  }

  const normalizedCount = Math.min(14, value.length);
  return value.slice(0, normalizedCount).map((entry, index): EventDefinitionDay => {
    const day = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const dayName =
      toOptionalString(day.name ?? day.title, 120) ??
      buildDefaultDayName(index, normalizedCount, eventTypeLabel);

    return {
      name: dayName,
      date: normalizeDate(day.date) ?? dateAtMiddayIso(eventDate, index - (normalizedCount - 1)),
      sortOrder: index,
      timeBlocks: EVENT_TIME_BLOCKS.map((slot) =>
        normalizeDefinitionTimeBlock(
          readDayTimeBlock(day, slot.key),
          slot,
          dayName,
          eventTypeLabel
        )
      ),
    };
  });
}

export function buildEventDefinitionPayload(
  input: BuildEventDefinitionPayloadInput
): EventDefinitionPayload {
  const dayCount = normalizeDayCount(input.dayCount);
  const eventType = resolveEventPlatformType(input.eventType, input.customEventType);

  return {
    version: 2,
    eventType: eventType.eventType,
    eventTypeLabel: eventType.eventTypeLabel,
    customEventType: eventType.customEventType,
    dayCount,
    layers: {
      definition:
        "Define the event type, day count, and morning/afternoon/evening structure.",
      requirements:
        "Customize each time block with food, decor, photo/video, vendors, logistics, hotels, and custom needs.",
      finalization:
        "Resolve missing vendors, budgets, guest/hotel gaps, tasks, timings, and run-of-show readiness.",
    },
    days: normalizeDefinitionDays(
      input.days,
      dayCount,
      input.eventDate,
      eventType.customEventType ?? eventType.eventTypeLabel
    ),
    finalizationChecklist: EVENT_FINALIZATION_CHECKLIST,
  };
}

export function hasExplicitEventDefinition(value: Record<string, unknown>) {
  const eventDefinition = value.eventDefinition ?? value.definitionPayload;
  if (Array.isArray(value.definitionDays)) return true;
  if (eventDefinition && typeof eventDefinition === "object") {
    return Array.isArray((eventDefinition as Record<string, unknown>).days);
  }
  return false;
}

export function extractEventDefinitionDays(value: Record<string, unknown>) {
  if (Array.isArray(value.definitionDays)) return value.definitionDays;
  const eventDefinition = value.eventDefinition ?? value.definitionPayload;
  if (eventDefinition && typeof eventDefinition === "object") {
    const days = (eventDefinition as Record<string, unknown>).days;
    if (Array.isArray(days)) return days;
  }
  return null;
}

export function buildCelebrationPlanFromEventDefinition(
  definition: EventDefinitionPayload
): EventDefinitionPlanDay[] {
  return definition.days.map((day) => ({
    name: day.name,
    date: day.date,
    sortOrder: day.sortOrder,
    notes: null,
    events: day.timeBlocks
      .filter((block) => block.enabled)
      .map((block, index) => ({
        name: block.title,
        eventType: block.eventType,
        startTime: block.startTime,
        endTime: block.endTime,
        timeBlock: block.slot,
        notes: block.notes,
        sortOrder: index,
      })),
  }));
}

function sanitizeJsonValue(value: unknown, depth = 0): SafeJson | undefined {
  if (value == null) return null;
  if (typeof value === "string") return clampString(value);
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "boolean") return value;
  if (depth >= 6) return undefined;

  if (Array.isArray(value)) {
    return value
      .slice(0, 80)
      .map((entry) => sanitizeJsonValue(entry, depth + 1))
      .filter((entry): entry is SafeJson => entry !== undefined);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 60);
    const sanitized: Record<string, SafeJson> = {};

    for (const [key, entryValue] of entries) {
      const cleanKey = clampString(key, 80);
      const cleanValue = sanitizeJsonValue(entryValue, depth + 1);
      if (cleanKey && cleanValue !== undefined) {
        sanitized[cleanKey] = cleanValue;
      }
    }

    return sanitized;
  }

  return undefined;
}

export function normalizeEventRequirementPayload(value: unknown) {
  const sanitized = sanitizeJsonValue(value);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized
    : {};
}
