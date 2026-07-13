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

/** One readiness contract shared by planner estimates and client pricing. */
export function eventReadinessPercent(event: EventReadinessRow) {
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
  const checks = [
    Boolean(event.name.trim()),
    Boolean(event.date && event.start_time && event.end_time),
    Boolean(event.venue?.trim()),
    Boolean(event.guest_count && event.guest_count > 0),
    requirements.length > 0,
    hasVendor,
    hasEstimate,
    !needsFood || relationList(event.menus).length > 0,
    !needsLogistics || hasLogisticsReadiness(event.logistics),
    relationList(event.tasks).length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
