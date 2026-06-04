"use client";

/**
 * Layer 1 — Definition.
 *
 * A 4-step guided flow that captures the new event-platform model:
 *   Step 1 — profile name
 *   Step 2 — event type (14 presets + Custom)
 *   Step 3 — number of days
 *   Step 4 — per-day morning / afternoon / evening time blocks (toggle + rename)
 *
 * Submits to the existing /api/wedding POST. The request includes the richer
 * `definitionPayload` (event type, custom name, full day/block plan); when
 * Codex's API slice wires this through, the backend persists every field
 * into the new columns (`event_type`, `custom_event_type`, `definition_payload`,
 * `wedding_events.time_block`). Until then the API only consumes name + day
 * count and ignores the rest — the planner editor will still pick the model
 * up via Layer 2.
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
  EVENT_TIME_BLOCKS,
  buildEventDefinitionPayload,
  normalizeDayCount,
  type EventDefinitionDay,
  type EventDefinitionPayload,
  type EventDefinitionTimeBlock,
  type EventPlatformType,
  type EventTimeBlockKey,
} from "@/lib/event-platform";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

const STEP_LABELS = ["Name", "Type", "Days", "Time blocks"] as const;

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
    }
  >;
};

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
        };
        return acc;
      },
      {} as LocalDay["blocks"]
    ),
  };
}

function dateForDayFromPrimaryDate(
  primaryDate: string,
  index: number,
  count: number
) {
  const [year, month, day] = primaryDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + index - (count - 1));
  return date.toISOString().slice(0, 10);
}

function applyPrimaryDateToDays(days: LocalDay[], primaryDate: string) {
  if (!primaryDate) return days;

  return days.map((day, index) => ({
    ...day,
    date: dateForDayFromPrimaryDate(primaryDate, index, days.length),
  }));
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
          requirementCategories: [],
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
  // Step 3
  const [dayCount, setDayCount] = useState(3);
  const [eventDate, setEventDate] = useState("");
  // Step 4
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

  // Re-shape the days array when day count changes, refresh default copy when
  // event type shifts, and derive a visible date for every day from the main date.
  useEffect(() => {
    setDays((current) =>
      applyPrimaryDateToDays(
        rebuildDays(current, normalizeDayCount(dayCount), eventTypeLabel),
        eventDate
      )
    );
  }, [dayCount, eventTypeLabel, eventDate]);

  const definition = useMemo<EventDefinitionPayload>(
    () =>
      buildEventDefinitionPayload({
        eventName: profileName,
        eventType,
        customEventType: eventType === CUSTOM_EVENT_TYPE_VALUE ? customEventType : null,
        eventDate: eventDate || null,
        dayCount,
        days: days.map(toEventDefinitionDay),
      }),
    [profileName, eventType, customEventType, eventDate, dayCount, days]
  );

  const canAdvance = (): boolean => {
    if (step === 0) return profileName.trim().length >= 2;
    if (step === 1) {
      if (eventType === CUSTOM_EVENT_TYPE_VALUE) return customEventType.trim().length >= 2;
      return true;
    }
    if (step === 2) return dayCount >= 1 && dayCount <= 14 && Boolean(eventDate);
    return true;
  };

  const next = () => {
    if (!canAdvance()) {
      toast.error("Please complete this step before continuing.");
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };

  const back = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (step < 3) {
      next();
      return;
    }

    const enabledCount = days.reduce(
      (sum, day) => sum + Object.values(day.blocks).filter((b) => b.enabled).length,
      0
    );
    if (days.some((day) => !day.date)) {
      toast.error("Choose a date for every event day before finishing.");
      return;
    }
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
          weddingDate: eventDate || null,
          dayCount,
          // Defaults so the existing API contract stays satisfied. The
          // backend ignores anything else for now; once Codex's API slice
          // lands, `definitionPayload` will be persisted in full.
          guestCount: 100,
          budgetTotal: 500000,
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

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
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
              eventDate={eventDate}
              onDayCountChange={(value) => setDayCount(normalizeDayCount(value))}
              onEventDateChange={setEventDate}
              eventTypeLabel={eventTypeLabel}
            />
          ) : null}

          {step === 3 ? (
            <BlocksStep
              days={days}
              onDayPatch={(index, patch) => {
                setDays((current) =>
                  current.map((day, i) => (i === index ? { ...day, ...patch } : day))
                );
              }}
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
          {step < 3 ? (
            <button type="button" onClick={next} className={dashBtn}>
              Continue →
            </button>
          ) : (
            <button type="submit" disabled={saving} className={dashBtn}>
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
  eventDate,
  eventTypeLabel,
  onDayCountChange,
  onEventDateChange,
}: {
  dayCount: number;
  eventDate: string;
  eventTypeLabel: string;
  onDayCountChange: (v: number) => void;
  onEventDateChange: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="eventDate" className={dashLabel}>
          Main / final date
        </label>
        <input
          id="eventDate"
          type="date"
          value={eventDate}
          onChange={(e) => onEventDateChange(e.target.value)}
          className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
        />
        <p className="mt-2 text-xs text-slate">
          For multi-day events, this is the final or main day. The next step
          assigns dates to every day, and you can still adjust each one.
        </p>
      </div>
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
          day&apos;s date and morning / afternoon / evening blocks before anything is created.
        </p>
      </div>
    </div>
  );
}

function BlocksStep({
  days,
  onDayPatch,
  onBlockPatch,
}: {
  days: LocalDay[];
  onDayPatch: (index: number, patch: Partial<LocalDay>) => void;
  onBlockPatch: (
    dayIndex: number,
    blockKey: EventTimeBlockKey,
    patch: Partial<LocalDay["blocks"][EventTimeBlockKey]>
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className={dashLabel}>Shape each day</p>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          Morning, afternoon, and evening are created by default. Turn off any
          block you do not need, then rename the rest — &quot;Morning&quot; can become
          &quot;Haldi brunch&quot;, &quot;Evening&quot; can become &quot;Reception&quot;.
        </p>
      </div>

      <div className="space-y-4">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="border border-charcoal/10 bg-cream/30 p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="min-w-0">
                <label htmlFor={`event-day-name-${dayIndex}`} className={dashLabel}>
                  Day {dayIndex + 1} name
                </label>
                <input
                  id={`event-day-name-${dayIndex}`}
                  value={day.name}
                  onChange={(e) => onDayPatch(dayIndex, { name: e.target.value })}
                  className="mt-2 w-full border-0 border-b border-charcoal/15 bg-transparent py-2 font-display text-lg text-charcoal outline-none focus:border-gold-primary"
                  placeholder={`Day ${dayIndex + 1}`}
                />
              </div>
              <div>
                <label htmlFor={`event-day-date-${dayIndex}`} className={dashLabel}>
                  Date
                </label>
                <input
                  id={`event-day-date-${dayIndex}`}
                  type="date"
                  value={day.date ?? ""}
                  onChange={(e) =>
                    onDayPatch(dayIndex, { date: e.target.value || null })
                  }
                  className="mt-2 w-full border border-charcoal/12 bg-ivory px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
