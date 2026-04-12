"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import {
  DECOR_STYLE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  FOOD_STYLE_OPTIONS,
  PLANNER_VENDOR_CATEGORIES,
  type PlannerVendorCategoryKey,
} from "@/lib/wedding-plan";
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
    basePrice: number | null;
    maxPrice: number | null;
    unit: string | null;
  } | null;
};

type WeddingEvent = {
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
  food_style: string | null;
  food_preferences: string[] | null;
  menu_notes: string | null;
  decor_style: string | null;
  decor_notes: string | null;
  attire_notes: string | null;
  notes: string | null;
  sort_order: number;
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
    base_price: number;
    max_price?: number | null;
    unit?: string | null;
  }[];
};

type VendorDraftSelection = {
  vendorProfileId: string;
  vendorSlug: string;
  vendorServiceId: string;
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
  vendorSelections: Record<PlannerVendorCategoryKey, VendorDraftSelection | null>;
};

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
    vendorSelections,
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

export default function ClientWeddingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeddingPayload | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showDayForm, setShowDayForm] = useState(false);
  const [dayDraft, setDayDraft] = useState({ name: "", date: "", notes: "" });
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayDraft, setEditingDayDraft] = useState({
    name: "",
    date: "",
    notes: "",
  });
  const [eventFormDayId, setEventFormDayId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState({
    name: "",
    eventType: "Custom",
    date: "",
    startTime: "",
    venue: "",
  });
  const [detailDraft, setDetailDraft] = useState<EventDetailDraft | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
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
      throw new Error(json.error ?? "Failed to load wedding plan");
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
              : "Could not load wedding details"
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
          date: eventDraft.date || null,
          startTime: eventDraft.startTime || null,
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
      setEventDraft({
        name: "",
        eventType: "Custom",
        date: "",
        startTime: "",
        venue: "",
      });
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
    setSavingDetail(true);

    try {
      const response = await fetch(`/api/wedding/events/${eventId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete event");
      }

      await refreshWedding();
      setSelectedEventId(null);
      toast.success("Event removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    } finally {
      setSavingDetail(false);
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
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
          <p className={dashLabel}>Wedding</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal md:text-4xl">
            No wedding yet
          </h2>
          <p className="font-heading mt-2 text-sm text-slate">
            Complete onboarding to shape your celebration, day by day.
          </p>
        </motion.header>
        <div className="mt-12">
          <ListEmptyState hint="Go to onboarding from the dashboard to create your wedding." />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
        <p className={dashLabel}>Wedding operating plan</p>
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
            <button
              type="button"
              className={dashBtn}
              onClick={() => setShowDayForm((current) => !current)}
            >
              {showDayForm ? "Close day form" : "Add day"}
            </button>
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
                          className="border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal"
                          onClick={() => {
                            setEventFormDayId(
                              current => (current === day.id ? null : day.id)
                            );
                            setEventDraft({
                              name: "",
                              eventType: "Custom",
                              date: day.date ? day.date.slice(0, 10) : "",
                              startTime: "",
                              venue: "",
                            });
                          }}
                        >
                          Add event
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
                            {EVENT_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
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
                </div>

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
                      {EVENT_TYPE_OPTIONS.map((option) => (
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
                </div>

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
                                <p className="font-heading text-sm text-charcoal">
                                  {selectedVendor.business_name}
                                </p>
                                <p className="mt-1 text-xs text-slate">
                                  {selectedVendor.city ?? "Destination ready"}
                                  {selectedVendor.rating
                                    ? ` · ${selectedVendor.rating.toFixed(1)} rating`
                                    : ""}
                                </p>
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
                                <div className="space-y-2 border border-charcoal/10 p-3">
                                  {selectedVendor.services
                                    .filter(
                                      (service) =>
                                        service.id === selection.vendorServiceId
                                    )
                                    .map((service) => (
                                      <div key={service.id}>
                                        <p className="font-heading text-sm text-charcoal">
                                          {service.name}
                                        </p>
                                        <p className="mt-1 text-xs text-slate">
                                          {service.description ?? "Service details will appear here."}
                                        </p>
                                        <p className="mt-2 text-xs text-gold-dark">
                                          From {formatCurrency(service.base_price)}
                                          {service.unit ? ` · ${service.unit}` : ""}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-sm text-slate">
                              No vendor selected yet.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                    className="min-h-[96px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    placeholder="Run-of-show reminders, family logistics, weather backups..."
                  />
                </Field>

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
              <div className="mt-4 border border-dashed border-charcoal/15 bg-cream/30 p-5">
                <p className="font-heading text-sm text-slate">
                  Select an event to edit its timing, menu, decor, guest count,
                  spend, and vendor plan.
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
