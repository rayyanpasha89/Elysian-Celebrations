export type ReadinessRelation<T> = T | T[] | null | undefined;

export type EventReadinessRow = {
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
  sort_order: number | null;
  requirements?: ReadinessRelation<{
    category: string | null;
    vendor_profile_id: string | null;
    vendor_service_id: string | null;
  }>;
  menus?: ReadinessRelation<{ id: string }>;
  logistics?: ReadinessRelation<{
    guest_arrival_time: string | null;
    vendor_load_in_time: string | null;
    family_call_time: string | null;
    transport_notes: string | null;
    rooming_notes: string | null;
    weather_plan: string | null;
    ceremony_notes: string | null;
  }>;
  tasks?: ReadinessRelation<{ id: string }>;
  bookings?: ReadinessRelation<{
    status: string | null;
    total_amount: number | null;
    service: ReadinessRelation<{ base_price: number | null }>;
  }>;
};

export const EVENT_READINESS_CHECK_KEYS = [
  "name",
  "schedule",
  "venue",
  "guests",
  "requirements",
  "vendors",
  "pricing",
  "food",
  "logistics",
  "tasks",
] as const;

export type EventReadinessCheckKey =
  (typeof EVENT_READINESS_CHECK_KEYS)[number];

export type EventReadinessGap = {
  key: EventReadinessCheckKey;
  label: string;
  detail: string;
};

export type EventReadinessResult = {
  percent: number;
  ready: boolean;
  completedChecks: number;
  totalChecks: number;
  gaps: EventReadinessGap[];
};

export const EVENT_READINESS_SELECT = `id, wedding_day_id, name, event_type, date, start_time, end_time, venue, guest_count, estimated_budget, sort_order,
  requirements:wedding_event_requirements(category, vendor_profile_id, vendor_service_id),
  menus:wedding_event_menus(id),
  logistics:wedding_event_logistics(guest_arrival_time, vendor_load_in_time, family_call_time, transport_notes, rooming_notes, weather_plan, ceremony_notes),
  tasks:wedding_event_tasks(id),
  bookings(id, status, total_amount, service:vendor_services(base_price))`;

function relationList<T>(relation: ReadinessRelation<T>): T[] {
  if (Array.isArray(relation)) return relation;
  return relation ? [relation] : [];
}

function firstRelation<T>(relation: ReadinessRelation<T>): T | null {
  return relationList(relation)[0] ?? null;
}

function hasLogisticsReadiness(logistics: EventReadinessRow["logistics"]) {
  const row = firstRelation(logistics);
  return row
    ? Object.values(row).some(
        (value) => typeof value === "string" && value.trim().length > 0
      )
    : false;
}

const READINESS_CHECK_COPY: Record<
  EventReadinessCheckKey,
  { label: string; detail: string }
> = {
  name: {
    label: "Function name",
    detail: "Add a name for this function.",
  },
  schedule: {
    label: "Date and time",
    detail: "Add the date, start time, and end time.",
  },
  venue: {
    label: "Venue",
    detail: "Select a venue or event area.",
  },
  guests: {
    label: "Guest count",
    detail: "Add the expected guest count.",
  },
  requirements: {
    label: "Requirements",
    detail: "Choose at least one requirement for this function.",
  },
  vendors: {
    label: "Vendor selection",
    detail: "Select at least one vendor or service package.",
  },
  pricing: {
    label: "Pricing input",
    detail: "Add a saved estimate or a vendor service with pricing.",
  },
  food: {
    label: "Food plan",
    detail: "Add a menu because food is required for this function.",
  },
  logistics: {
    label: "Logistics plan",
    detail:
      "Add at least one logistics detail because logistics is required for this function.",
  },
  tasks: {
    label: "Run of show",
    detail: "Add at least one task for this function.",
  },
};

/**
 * The canonical readiness contract for planner rings and every client price
 * visibility gate. Keep all conditional checks here so API and UI surfaces
 * receive the same percentage and the same explanation for every open gap.
 */
export function evaluateEventReadiness(
  event: EventReadinessRow
): EventReadinessResult {
  const requirements = relationList(event.requirements);
  const activeBookings = relationList(event.bookings).filter(
    (booking) => booking.status !== "CANCELLED"
  );
  const hasVendor =
    activeBookings.length > 0 ||
    requirements.some(
      (requirement) =>
        Boolean(requirement.vendor_profile_id) ||
        Boolean(requirement.vendor_service_id)
    );
  const hasEstimate =
    (event.estimated_budget ?? 0) > 0 ||
    activeBookings.some((booking) => {
      const service = firstRelation(booking.service);
      return (booking.total_amount ?? service?.base_price ?? 0) > 0;
    });
  const needsFood = requirements.some(
    (requirement) => requirement.category === "food"
  );
  const needsLogistics = requirements.some(
    (requirement) => requirement.category === "logistics"
  );
  const checks: Record<EventReadinessCheckKey, boolean> = {
    name: Boolean(event.name.trim()),
    schedule: Boolean(event.date && event.start_time && event.end_time),
    venue: Boolean(event.venue?.trim()),
    guests: Boolean(event.guest_count && event.guest_count > 0),
    requirements: requirements.length > 0,
    vendors: hasVendor,
    pricing: hasEstimate,
    food: !needsFood || relationList(event.menus).length > 0,
    logistics: !needsLogistics || hasLogisticsReadiness(event.logistics),
    tasks: relationList(event.tasks).length > 0,
  };
  const completedChecks = EVENT_READINESS_CHECK_KEYS.filter(
    (key) => checks[key]
  ).length;
  const gaps = EVENT_READINESS_CHECK_KEYS.filter((key) => !checks[key]).map(
    (key) => ({ key, ...READINESS_CHECK_COPY[key] })
  );

  return {
    percent: Math.round(
      (completedChecks / EVENT_READINESS_CHECK_KEYS.length) * 100
    ),
    ready: gaps.length === 0,
    completedChecks,
    totalChecks: EVENT_READINESS_CHECK_KEYS.length,
    gaps,
  };
}

export function eventReadinessPercent(event: EventReadinessRow) {
  return evaluateEventReadiness(event).percent;
}
