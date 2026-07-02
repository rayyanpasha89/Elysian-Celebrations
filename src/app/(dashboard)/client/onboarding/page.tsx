"use client";

/**
 * Layer 1 — Definition.
 *
 * A 5-step guided flow that captures the new event-platform model:
 *   Step 1 — profile name
 *   Step 2 — event type (14 presets + Custom)
 *   Step 3 — number of days
 *   Step 4 — optional per-day dates
 *   Step 5 — per-day morning / afternoon / evening time blocks
 *            (venue + needs + timing + guests)
 *
 * Submits to the existing /api/wedding POST. The request includes the richer
 * `definitionPayload` (event type, custom name, full day/block plan); when
 * Codex's API slice wires this through, the backend persists every field
 * into the event-platform columns (`event_type`, `custom_event_type`,
 * `definition_payload`, `wedding_events.time_block`, `guest_count`) and seeds
 * Layer 2 requirements from the needs selected here.
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import {
  CUSTOM_EVENT_TYPE_VALUE,
  EVENT_PLATFORM_TYPES,
  EVENT_REQUIREMENT_CATEGORIES,
  EVENT_TIME_BLOCKS,
  buildEventDefinitionPayload,
  normalizeDayCount,
  type EventDefinitionDay,
  type EventDefinitionPayload,
  type EventDefinitionTimeBlock,
  type EventPlatformType,
  type EventRequirementCategoryKey,
  type EventTimeBlockKey,
} from "@/lib/event-platform";
import { cn } from "@/lib/utils";

// Needs a couple can pick per time block. "custom" is intentionally excluded —
// custom needs are added later inside the planner, not during definition.
const NEED_OPTIONS = EVENT_REQUIREMENT_CATEGORIES.filter(
  (c) => c.key !== "custom"
);
// Sensible defaults so a block is useful out of the box; couples toggle the rest.
const DEFAULT_NEEDS: EventRequirementCategoryKey[] = [
  "food",
  "decor",
  "photo-video",
];

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = [
  "Name",
  "Type",
  "Days",
  "Dates",
  "Time blocks",
] as const;

type LocalDay = {
  name: string;
  date: string | null;
  sortOrder: number;
  blocks: Record<
    EventTimeBlockKey,
    {
      enabled: boolean;
      title: string;
      startTime: string;
      endTime: string;
      venue: string;
      guestCount: number;
      needs: EventRequirementCategoryKey[];
    }
  >;
};

type VenueOption = {
  id: string;
  name: string;
  slug?: string | null;
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

const DEFAULT_GUESTS = 120;

const DEFAULT_BLOCK_KEYS = EVENT_TIME_BLOCKS.map((b) => b.key) as EventTimeBlockKey[];

function createEmptyDay(
  index: number,
  count: number,
  eventTypeLabel: string
): LocalDay {
  const dayName = count === 1 ? `${eventTypeLabel} Day` : `Day ${index + 1}`;
  return {
    name: dayName,
    date: null,
    sortOrder: index,
    blocks: EVENT_TIME_BLOCKS.reduce(
      (acc, block) => {
        acc[block.key] = {
          enabled: true,
          title:
            eventTypeLabel.toLowerCase() === "wedding"
              ? `${block.label} function`
              : `${block.label} ${dayName}`,
          startTime: block.defaultStartTime,
          endTime: block.defaultEndTime,
          venue: "",
          guestCount: DEFAULT_GUESTS,
          needs: [...DEFAULT_NEEDS],
        };
        return acc;
      },
      {} as LocalDay["blocks"]
    ),
  };
}

function rebuildDays(
  current: LocalDay[],
  targetCount: number,
  eventTypeLabel: string
): LocalDay[] {
  const next: LocalDay[] = [];
  for (let i = 0; i < targetCount; i++) {
    const existing = current[i];
    if (existing) {
      next.push({ ...existing, sortOrder: i });
    } else {
      next.push(createEmptyDay(i, targetCount, eventTypeLabel));
    }
  }
  return next;
}

function toEventDefinitionDay(day: LocalDay): EventDefinitionDay {
  return {
    name: day.name,
    date: day.date,
    sortOrder: day.sortOrder,
    timeBlocks: EVENT_TIME_BLOCKS.map(
      (block): EventDefinitionTimeBlock => {
        const local = day.blocks[block.key];
        return {
          slot: block.key,
          label: block.label,
          enabled: local.enabled,
          title: local.title,
          eventType: local.title,
          startTime: local.startTime || null,
          endTime: local.endTime || null,
          venue: local.venue || null,
          guestCount: local.guestCount || null,
          requirementCategories: local.needs,
          notes: null,
        };
      }
    ),
  };
}

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [profileName, setProfileName] = useState("");
  // Step 2
  const [eventType, setEventType] = useState<EventPlatformType>("wedding");
  const [customEventType, setCustomEventType] = useState("");
  // Step 3 — scale
  const [dayCount, setDayCount] = useState(3);
  const [venueOptions, setVenueOptions] = useState<VenueOption[]>([]);
  const [venueOptionsLoading, setVenueOptionsLoading] = useState(false);
  const eventTypeLabel = useMemo(() => {
    const match = EVENT_PLATFORM_TYPES.find((t) => t.value === eventType);
    if (!match) return "Event";
    return match.value === CUSTOM_EVENT_TYPE_VALUE && customEventType.trim()
      ? customEventType.trim()
      : match.label;
  }, [eventType, customEventType]);
  const [days, setDays] = useState<LocalDay[]>(() =>
    Array.from({ length: 3 }, (_, i) => createEmptyDay(i, 3, "Wedding"))
  );

  // Re-shape the days array when day count changes and refresh default copy
  // when event type shifts. Dates are intentionally not forced at Layer 1;
  // users can set each day independently now or later in Layer 2.
  useEffect(() => {
    setDays((current) =>
      rebuildDays(current, normalizeDayCount(dayCount), eventTypeLabel)
    );
  }, [dayCount, eventTypeLabel]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setVenueOptionsLoading(true);
      try {
        const res = await fetch("/api/venues?limit=8");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load venues");
        if (!cancelled) {
          setVenueOptions((json.venues ?? []) as VenueOption[]);
        }
      } catch {
        if (!cancelled) setVenueOptions([]);
      } finally {
        if (!cancelled) setVenueOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const definition = useMemo<EventDefinitionPayload>(
    () =>
      buildEventDefinitionPayload({
        eventName: profileName,
        eventType,
        customEventType: eventType === CUSTOM_EVENT_TYPE_VALUE ? customEventType : null,
        eventDate: null,
        dayCount,
        days: days.map(toEventDefinitionDay),
      }),
    [profileName, eventType, customEventType, dayCount, days]
  );

  const canAdvance = (): boolean => {
    if (step === 0) return profileName.trim().length >= 2;
    if (step === 1) {
      if (eventType === CUSTOM_EVENT_TYPE_VALUE) return customEventType.trim().length >= 2;
      return true;
    }
    if (step === 2) return dayCount >= 1 && dayCount <= 14;
    if (step === 3) return days.length > 0;
    return true;
  };

  const next = () => {
    if (!canAdvance()) {
      toast.error("Please complete this step before continuing.");
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  };

  const back = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

  // Form submission NEVER creates the event. An accidental submit (e.g. Enter
  // in a field) at most advances a step. Creation happens only through the
  // explicit Create button's onClick → createEvent(). This makes "auto-create"
  // structurally impossible.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (step < 4) next();
  };

  const createEvent = async () => {
    if (saving) return;
    if (step < 4) {
      next();
      return;
    }

    const enabledCount = days.reduce(
      (sum, day) => sum + Object.values(day.blocks).filter((b) => b.enabled).length,
      0
    );
    if (enabledCount === 0) {
      toast.error("Enable at least one time block before finishing.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/wedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleName: profileName.trim(),
          weddingDate: days.find((day) => day.date)?.date ?? null,
          dayCount,
          eventType,
          customEventType:
            eventType === CUSTOM_EVENT_TYPE_VALUE ? customEventType.trim() : null,
          definitionPayload: definition,
        }),
      });
      const json = await res.json();
      if (res.status === 409) {
        toast.error("An event plan already exists. Delete it first to start over.");
        router.replace("/client/wedding");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      toast.success("Event created — now define what each block needs.");
      router.replace("/client/wedding");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-2xl"
    >
      <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
        <p className={dashLabel}>Layer 1 · Definition</p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Define your event
        </h1>
        <p className="font-heading mt-2 text-sm text-slate">
          Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>
        <div className="mt-6 flex gap-1">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 bg-charcoal/10",
                i <= step && "bg-gold-primary"
              )}
            />
          ))}
        </div>
      </motion.header>

      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          // Enter inside any field must never submit/advance — on every step,
          // including the final one. The event is created ONLY by an explicit
          // click on "Create event & open planner". Textareas keep newlines.
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName !== "TEXTAREA"
          ) {
            e.preventDefault();
          }
        }}
        className="mt-10 space-y-8"
      >
        <motion.div variants={fadeUp} className={cn(dashCard, "space-y-6")}>
          {step === 0 ? (
            <NameStep value={profileName} onChange={setProfileName} />
          ) : null}

          {step === 1 ? (
            <TypeStep
              value={eventType}
              custom={customEventType}
              onChange={(value) => {
                setEventType(value);
                if (value !== CUSTOM_EVENT_TYPE_VALUE) setCustomEventType("");
              }}
              onCustomChange={setCustomEventType}
            />
          ) : null}

          {step === 2 ? (
            <DaysStep
              dayCount={dayCount}
              onDayCountChange={(value) => setDayCount(normalizeDayCount(value))}
              eventTypeLabel={eventTypeLabel}
            />
          ) : null}

          {step === 3 ? (
            <DatesStep
              days={days}
              onDayPatch={(index, patch) => {
                setDays((current) =>
                  current.map((day, i) => (i === index ? { ...day, ...patch } : day))
                );
              }}
            />
          ) : null}

          {step === 4 ? (
            <>
              <ReviewSummary
                eventName={profileName}
                eventTypeLabel={eventTypeLabel}
                days={days}
              />
              <BlocksStep
                days={days}
                venues={venueOptions}
                venuesLoading={venueOptionsLoading}
                onBlockPatch={(dayIndex, blockKey, patch) => {
                  setDays((current) =>
                    current.map((day, i) =>
                      i === dayIndex
                        ? {
                            ...day,
                            blocks: {
                              ...day.blocks,
                              [blockKey]: { ...day.blocks[blockKey], ...patch },
                            },
                          }
                        : day
                    )
                  );
                }}
              />
            </>
          ) : null}
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className={cn(
              "font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark",
              step === 0 && "cursor-not-allowed opacity-40"
            )}
          >
            ← Back
          </button>
          {step < 4 ? (
            <button type="button" onClick={next} className={dashBtn}>
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void createEvent()}
              disabled={saving}
              className={dashBtn}
            >
              {saving ? "Saving…" : "Create event & open planner"}
            </button>
          )}
        </motion.div>
      </form>
    </motion.div>
  );
}

function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="profileName" className={dashLabel}>
        Event or profile name
      </label>
      <input
        id="profileName"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
        placeholder="Priya & Arjun · Spring Wedding"
        autoFocus
      />
      <p className="mt-3 text-xs leading-relaxed text-slate">
        This is what guests, vendors, and your team will see at the top of every
        page. You can rename it later from the planner.
      </p>
    </div>
  );
}

function TypeStep({
  value,
  custom,
  onChange,
  onCustomChange,
}: {
  value: EventPlatformType;
  custom: string;
  onChange: (v: EventPlatformType) => void;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div>
      <p className={dashLabel}>What kind of event is this?</p>
      <p className="mt-2 text-xs leading-relaxed text-slate">
        Pick the closest match. The shape of your planner adapts — a wedding
        gets multi-day rituals, a launch gets a press flow, a dinner stays
        intimate.
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {EVENT_PLATFORM_TYPES.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "border px-4 py-3 text-left transition-colors",
                active
                  ? "border-gold-primary bg-gold-primary/10 text-charcoal"
                  : "border-charcoal/10 bg-ivory/70 text-slate hover:border-gold-primary/45 hover:text-charcoal"
              )}
            >
              <span className="font-display text-sm text-charcoal">{option.label}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-slate">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      {value === CUSTOM_EVENT_TYPE_VALUE ? (
        <div className="mt-4">
          <label htmlFor="customType" className={dashLabel}>
            Name your custom event type
          </label>
          <input
            id="customType"
            value={custom}
            onChange={(e) => onCustomChange(e.target.value)}
            className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Annual board offsite"
          />
        </div>
      ) : null}
    </div>
  );
}

function DaysStep({
  dayCount,
  eventTypeLabel,
  onDayCountChange,
}: {
  dayCount: number;
  eventTypeLabel: string;
  onDayCountChange: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="dayCount" className={dashLabel}>
          How many days does this {eventTypeLabel.toLowerCase()} run?
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const active = dayCount === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onDayCountChange(n)}
                className={cn(
                  "h-12 w-12 border font-display text-base transition-colors",
                  active
                    ? "border-gold-primary bg-gold-primary/10 text-charcoal"
                    : "border-charcoal/15 bg-ivory/70 text-slate hover:border-gold-primary/45 hover:text-charcoal"
                )}
              >
                {n}
              </button>
            );
          })}
          <input
            type="number"
            min={1}
            max={14}
            value={dayCount}
            onChange={(e) => onDayCountChange(Number(e.target.value) || 1)}
            className="h-12 w-20 border border-charcoal/15 bg-ivory px-3 text-center font-display text-base outline-none focus:border-gold-primary"
            aria-label="Custom day count"
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate">
          Pick a quick preset or type your own (up to 14). Continue to set each
          day&apos;s optional date and morning / afternoon / evening blocks before
          anything is created.
        </p>
      </div>

      <div className="border border-gold-primary/25 bg-gold-primary/5 p-4">
        <p className={cn(dashLabel, "text-gold-dark")}>
          Dates and guests come next
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          No final/main date is required here. You can set each day&apos;s date
          independently on the next screen, then enter guest counts per actual
          time block so food and seating estimates use the right number.
          Don&apos;t worry about a budget now —{" "}
          <span className="text-charcoal">
            Elysian prepares an estimated spend for you
          </span>{" "}
          once the event has enough detail.
        </p>
      </div>
    </div>
  );
}

function formatDayDateLabel(value: string | null): string {
  if (!value) return "Date not set";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Date not set";
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Step 4 (Dates) — optional one date per day. Dedicated step keeps dates
// visible without forcing a single "final day" model.
function DatesStep({
  days,
  onDayPatch,
}: {
  days: LocalDay[];
  onDayPatch: (index: number, patch: Partial<LocalDay>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className={dashLabel}>Set each day&apos;s date</p>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          Add dates if you know them, or leave them flexible and fill them in
          from Layer 2. Give each day a name you recognise.
        </p>
      </div>

      <div className="space-y-3">
        {days.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className="grid gap-3 border border-charcoal/10 bg-cream/30 p-4 sm:grid-cols-[minmax(0,1fr)_14rem]"
          >
            <div className="min-w-0">
              <label htmlFor={`event-date-day-name-${dayIndex}`} className={dashLabel}>
                Day {dayIndex + 1} name
              </label>
              <input
                id={`event-date-day-name-${dayIndex}`}
                value={day.name}
                onChange={(e) => onDayPatch(dayIndex, { name: e.target.value })}
                className="mt-2 w-full border-0 border-b border-charcoal/15 bg-transparent py-2 font-display text-lg text-charcoal outline-none focus:border-gold-primary"
                placeholder={`Day ${dayIndex + 1}`}
              />
            </div>
            <div>
              <label htmlFor={`event-date-day-${dayIndex}`} className={dashLabel}>
                Date
              </label>
              <input
                id={`event-date-day-${dayIndex}`}
                type="date"
                value={day.date ?? ""}
                onChange={(e) =>
                  onDayPatch(dayIndex, { date: e.target.value || null })
                }
                className="mt-2 w-full border border-charcoal/12 bg-ivory px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function venueDestinationLabel(venue: VenueOption) {
  const destination = Array.isArray(venue.destination)
    ? venue.destination[0]
    : venue.destination;
  return [destination?.name, destination?.country].filter(Boolean).join(", ");
}

function venueMatchesValue(venue: VenueOption, value: string) {
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  return (
    venue.name.trim().toLowerCase() === needle ||
    venue.slug?.trim().toLowerCase() === needle
  );
}

function BlockVenuePicker({
  id,
  venues,
  loading,
  value,
  onChange,
}: {
  id: string;
  venues: VenueOption[];
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedVenue = venues.find((venue) => venueMatchesValue(venue, value));
  const customValueActive = Boolean(value.trim() && !selectedVenue);
  const [showCustom, setShowCustom] = useState(customValueActive);
  const customOpen = showCustom || customValueActive;
  const destinationLabel = selectedVenue ? venueDestinationLabel(selectedVenue) : "";

  return (
    <div className="mt-3 space-y-2">
      <label htmlFor={id} className="block text-[11px] text-slate">
        Venue / area for this block
      </label>
      <select
        id={id}
        value={selectedVenue ? selectedVenue.name : customOpen ? "__custom__" : ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === "__custom__") {
            setShowCustom(true);
            if (selectedVenue) onChange("");
            return;
          }
          setShowCustom(false);
          onChange(nextValue);
        }}
        className="w-full border border-charcoal/12 bg-ivory px-2.5 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
      >
        <option value="">Decide later</option>
        {venues.map((venue) => (
          <option key={venue.id} value={venue.name}>
            {venue.name}
          </option>
        ))}
        <option value="__custom__">Custom venue / area</option>
      </select>

      {loading ? (
        <p className="text-[10px] leading-relaxed text-slate/70">
          Loading venue catalogue...
        </p>
      ) : null}

      {customOpen ? (
        <input
          type="text"
          value={selectedVenue ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Custom venue, lawn, ballroom, beach, terrace..."
          className="w-full border border-charcoal/15 bg-transparent px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
        />
      ) : selectedVenue ? (
        <p className="border border-gold-primary/20 bg-gold-primary/8 px-2.5 py-2 text-[10px] leading-relaxed text-gold-dark">
          {destinationLabel || selectedVenue.address || "Venue catalogue"}
          {selectedVenue.capacity ? ` · up to ${selectedVenue.capacity}` : ""}
          {selectedVenue.price_range ? ` · ${selectedVenue.price_range}` : ""}
        </p>
      ) : !loading && venues.length === 0 ? (
        <p className="text-[10px] leading-relaxed text-slate/70">
          Catalogue not seeded yet. Use custom venue if you know the area.
        </p>
      ) : null}
    </div>
  );
}

// Compact "what you're about to create" recap shown on the final step.
function ReviewSummary({
  eventName,
  eventTypeLabel,
  days,
}: {
  eventName: string;
  eventTypeLabel: string;
  days: LocalDay[];
}) {
  const enabledBlocks = days.reduce(
    (sum, day) => sum + Object.values(day.blocks).filter((b) => b.enabled).length,
    0
  );
  const peakGuests = days.reduce((max, day) => {
    const dayGuests = Object.values(day.blocks)
      .filter((b) => b.enabled)
      .reduce((s, b) => Math.max(s, b.guestCount), 0);
    return Math.max(max, dayGuests);
  }, 0);
  const dated = days.filter((d) => d.date).map((d) => d.date as string).sort();
  const venueCount = new Set(
    days.flatMap((day) =>
      Object.values(day.blocks)
        .filter((block) => block.enabled && block.venue.trim())
        .map((block) => block.venue.trim().toLowerCase())
    )
  ).size;
  const range =
    dated.length > 0
      ? dated.length === 1
        ? formatDayDateLabel(dated[0])
        : `${formatDayDateLabel(dated[0])} → ${formatDayDateLabel(dated[dated.length - 1])}`
      : "Dates pending";

  const items: Array<{ label: string; value: string }> = [
    { label: "Event", value: eventName.trim() || "Untitled event" },
    { label: "Type", value: eventTypeLabel },
    { label: "Venues", value: venueCount ? `${venueCount} anchored` : "Per block" },
    { label: "Days", value: `${days.length}` },
    { label: "Time blocks", value: `${enabledBlocks}` },
    { label: "Peak guests", value: peakGuests.toLocaleString("en-IN") },
    { label: "Estimated spend", value: "After planning" },
  ];

  return (
    <div className="border border-gold-primary/30 bg-gold-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn(dashLabel, "text-gold-dark")}>About to create</p>
        <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
          {range}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="font-accent text-[9px] uppercase tracking-[0.18em] text-slate">
              {item.label}
            </dt>
            <dd className="mt-1 truncate font-heading text-sm text-charcoal">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-slate">
        Nothing is saved until you press{" "}
        <span className="text-charcoal">Create event &amp; open planner</span>.
        Toggle and rename the blocks below first.
      </p>
    </div>
  );
}

function BlocksStep({
  days,
  venues,
  venuesLoading,
  onBlockPatch,
}: {
  days: LocalDay[];
  venues: VenueOption[];
  venuesLoading: boolean;
  onBlockPatch: (
    dayIndex: number,
    blockKey: EventTimeBlockKey,
    patch: Partial<LocalDay["blocks"][EventTimeBlockKey]>
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className={dashLabel}>Choose time blocks, venues, and needs</p>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          Morning, afternoon, and evening are on by default. Turn off any block
          you do not need, then rename the rest and anchor each function to its
          own venue or area. This is where multi-day, multi-venue events stay clear.
        </p>
      </div>

      <div className="space-y-4">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="border border-charcoal/10 bg-cream/30 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg text-charcoal">{day.name}</p>
              <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                {formatDayDateLabel(day.date)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {DEFAULT_BLOCK_KEYS.map((blockKey) => {
                const preset = EVENT_TIME_BLOCKS.find((b) => b.key === blockKey)!;
                const block = day.blocks[blockKey];
                return (
                  <div
                    key={blockKey}
                    className={cn(
                      "border p-3 transition-colors",
                      block.enabled
                        ? "border-gold-primary/45 bg-gold-primary/8"
                        : "border-charcoal/10 bg-ivory/70"
                    )}
                  >
                    <label className="flex items-center justify-between gap-2">
                      <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                        {preset.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={block.enabled}
                        onChange={(e) =>
                          onBlockPatch(dayIndex, blockKey, {
                            enabled: e.target.checked,
                          })
                        }
                        className="h-4 w-4 border border-charcoal/30 accent-gold-primary"
                      />
                    </label>
                    {block.enabled ? (
                      <>
                        <input
                          value={block.title}
                          onChange={(e) =>
                            onBlockPatch(dayIndex, blockKey, { title: e.target.value })
                          }
                          className="mt-3 w-full border-0 border-b border-charcoal/15 bg-transparent py-1.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                          placeholder={preset.label}
                        />
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <label className="block">
                            <span className="block text-slate">Starts</span>
                            <input
                              type="time"
                              value={block.startTime}
                              onChange={(e) =>
                                onBlockPatch(dayIndex, blockKey, {
                                  startTime: e.target.value,
                                })
                              }
                              className="mt-1 w-full border border-charcoal/12 bg-ivory px-2 py-1 outline-none focus:border-gold-primary"
                            />
                          </label>
                          <label className="block">
                            <span className="block text-slate">Ends</span>
                            <input
                              type="time"
                              value={block.endTime}
                              onChange={(e) =>
                                onBlockPatch(dayIndex, blockKey, {
                                  endTime: e.target.value,
                                })
                              }
                              className="mt-1 w-full border border-charcoal/12 bg-ivory px-2 py-1 outline-none focus:border-gold-primary"
                            />
                          </label>
                        </div>
                        <label className="mt-3 block text-[11px]">
                          <span className="block text-slate">Guests for this block</span>
                          <input
                            type="number"
                            min={1}
                            max={100000}
                            value={block.guestCount}
                            onChange={(e) =>
                              onBlockPatch(dayIndex, blockKey, {
                                guestCount: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="mt-1 w-full border border-charcoal/12 bg-ivory px-2 py-1 font-heading text-sm outline-none focus:border-gold-primary"
                          />
                        </label>
                        <BlockVenuePicker
                          id={`venue-${dayIndex}-${blockKey}`}
                          venues={venues}
                          loading={venuesLoading}
                          value={block.venue}
                          onChange={(value) =>
                            onBlockPatch(dayIndex, blockKey, { venue: value })
                          }
                        />
                        <div className="mt-3">
                          <span className="block text-[11px] text-slate">
                            What this block needs
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {NEED_OPTIONS.map((need) => {
                              const active = block.needs.includes(need.key);
                              return (
                                <button
                                  key={need.key}
                                  type="button"
                                  onClick={() =>
                                    onBlockPatch(dayIndex, blockKey, {
                                      needs: active
                                        ? block.needs.filter((n) => n !== need.key)
                                        : [...block.needs, need.key],
                                    })
                                  }
                                  className={cn(
                                    "border px-2 py-1 font-accent text-[10px] uppercase tracking-[0.12em] transition-colors",
                                    active
                                      ? "border-gold-primary bg-gold-primary/15 text-charcoal"
                                      : "border-charcoal/15 bg-ivory text-slate hover:border-gold-primary/40"
                                  )}
                                >
                                  {need.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-1.5 text-[10px] leading-relaxed text-slate/70">
                            Only what you pick here shows up in the planner. Add more
                            later anytime.
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-[11px] leading-relaxed text-slate/80">
                        {preset.label} skipped on this day.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
