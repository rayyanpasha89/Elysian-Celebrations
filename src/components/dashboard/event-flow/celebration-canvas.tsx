"use client";

/**
 * CelebrationCanvas — a radial, zoom-in mind-map for Layer 2.
 *
 * One canvas, four depths, each a focused view so it never crowds:
 *   Event   → days orbit a central "Event" hub
 *   Day     → the day becomes the hub, its functions orbit it
 *   Function→ the function becomes the hub, its steps orbit it (shaped tokens)
 *   Step    → handled by the parent (it opens the scoped editor via onOpenStep)
 *
 * Drilling in zooms the next level out of the centre; the hub / back button /
 * breadcrumb zoom back out. Reduced-motion aware.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Camera,
  Clock,
  FileText,
  Flower2,
  Gem,
  Gift,
  ListChecks,
  MapPin,
  Music,
  Palette,
  StickyNote,
  Store,
  Truck,
  UtensilsCrossed,
  Wand2,
} from "lucide-react";
import type { ComponentType } from "react";
import { FLOW_STATUS_META, type FlowStatus } from "./flow-node";
import { cn } from "@/lib/utils";

/** Meaningful icon per step so each token reads as what it actually edits. */
const STEP_ICON_BY_KEY: Record<string, ComponentType<{ className?: string }>> = {
  basics: FileText,
  food: UtensilsCrossed,
  design: Palette,
  decor: Flower2,
  media: Camera,
  "photo-video": Camera,
  entertainment: Music,
  logistics: Truck,
  hospitality: BedDouble,
  vendors: Store,
  special: Gift,
  tasks: ListChecks,
  notes: StickyNote,
  custom: Wand2,
};

function stepIconFor(id: string): ComponentType<{ className?: string }> {
  return STEP_ICON_BY_KEY[id] ?? Gem;
}

export type CanvasStep = {
  id: string;
  label: string;
  status?: FlowStatus;
  icon?: ComponentType<{ className?: string }>;
};
export type CanvasEvent = {
  id: string;
  title: string;
  timeLabel?: string;
  dateLabel?: string;
  venueLabel?: string;
  meta?: string;
  status: FlowStatus;
  readiness: number;
  steps: CanvasStep[];
};
export type CanvasDay = {
  id: string;
  title: string;
  dateLabel?: string;
  status: FlowStatus;
  readiness: number;
  events: CanvasEvent[];
};

type Level =
  | { kind: "event" }
  | { kind: "day"; dayId: string }
  | { kind: "function"; dayId: string; eventId: string };

const STEP_CLIP: Record<string, string> = {
  hexagon: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  octagon: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  shield: "polygon(50% 0%, 100% 22%, 100% 60%, 50% 100%, 0% 60%, 0% 22%)",
};
const STEP_SHAPE_BY_KEY: Record<string, keyof typeof STEP_CLIP | "circle" | "squircle"> = {
  basics: "circle",
  food: "hexagon",
  design: "diamond",
  decor: "diamond",
  vendors: "octagon",
  logistics: "squircle",
  tasks: "pentagon",
  notes: "shield",
  special: "octagon",
  "photo-video": "shield",
  media: "shield",
  entertainment: "pentagon",
  hospitality: "squircle",
};
const SHAPE_CYCLE = ["circle", "hexagon", "diamond", "octagon", "squircle", "pentagon", "shield"] as const;

function stepShape(id: string, index: number) {
  const shape = STEP_SHAPE_BY_KEY[id] ?? SHAPE_CYCLE[index % SHAPE_CYCLE.length];
  return {
    clip: shape in STEP_CLIP ? STEP_CLIP[shape] : undefined,
    radius: shape === "circle" ? "rounded-full" : shape === "squircle" ? "rounded-[42%]" : "",
  };
}

/** Evenly spaced points on a circle around the centre (50,50). */
function radialPositions(count: number, radius: number) {
  if (count === 0) return [];
  if (count === 1) return [{ x: 50, y: 14 }];
  return Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
    return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
  });
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

export function CelebrationCanvas({
  eventTitle,
  days,
  onOpenStep,
  onActiveDayChange,
  className,
}: {
  eventTitle: string;
  days: CanvasDay[];
  onOpenStep: (eventId: string, stepId: string, origin: { x: number; y: number }) => void;
  onActiveDayChange?: (dayId: string) => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [level, setLevel] = useState<Level>({ kind: "event" });
  const canvasRef = useRef<HTMLDivElement>(null);
  const shouldFocusHubRef = useRef(false);

  const navigate = useCallback(
    (nextLevel: Level) => {
      if (nextLevel.kind !== "event") {
        onActiveDayChange?.(nextLevel.dayId);
      }
      shouldFocusHubRef.current = true;
      setLevel(nextLevel);
    },
    [onActiveDayChange]
  );

  const activeDay =
    level.kind === "event" ? null : days.find((d) => d.id === level.dayId) ?? null;
  const activeEvent =
    level.kind === "function"
      ? activeDay?.events.find((e) => e.id === level.eventId) ?? null
      : null;

  // Guard: if data changed and the drilled-into node vanished, pop back up.
  const safeLevel: Level =
    level.kind === "function" && (!activeDay || !activeEvent)
      ? activeDay
        ? { kind: "day", dayId: activeDay.id }
        : { kind: "event" }
      : level.kind === "day" && !activeDay
        ? { kind: "event" }
        : level;

  const breadcrumb: { label: string; level: Level }[] = [
    { label: eventTitle || "Event", level: { kind: "event" } },
  ];
  if (activeDay) {
    breadcrumb.push({
      label: activeDay.title,
      level: { kind: "day", dayId: activeDay.id },
    });
  }
  if (activeDay && activeEvent) {
    breadcrumb.push({
      label: activeEvent.title,
      level: {
        kind: "function",
        dayId: activeDay.id,
        eventId: activeEvent.id,
      },
    });
  }

  const enter = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.42 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.5 },
      };
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 240, damping: 28 };

  const goBack = () => {
    if (safeLevel.kind === "function") {
      navigate({ kind: "day", dayId: safeLevel.dayId });
    } else if (safeLevel.kind === "day") {
      navigate({ kind: "event" });
    }
  };

  const levelKey =
    safeLevel.kind === "event"
      ? "event"
      : safeLevel.kind === "day"
        ? `day:${safeLevel.dayId}`
        : `fn:${safeLevel.eventId}`;

  useEffect(() => {
    if (!shouldFocusHubRef.current) return;
    shouldFocusHubRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      canvasRef.current
        ?.querySelector<HTMLElement>("[data-map-hub]")
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [levelKey]);

  const levelAnnouncement =
    safeLevel.kind === "event"
      ? `${eventTitle || "Event"}, day map`
      : safeLevel.kind === "day"
        ? `${activeDay?.title ?? "Day"}, function map`
        : `${activeEvent?.title ?? "Function"}, planning steps`;

  return (
    <div ref={canvasRef} className={cn("relative", className)}>
      <p className="sr-only" aria-live="polite">
        {levelAnnouncement}
      </p>
      {/* Breadcrumb + back */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {safeLevel.kind !== "event" ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Zoom out"
              className={cn(
                "mr-1 inline-flex h-8 w-8 items-center justify-center border border-charcoal/15 text-slate transition-colors hover:border-gold-primary hover:text-gold-dark",
                FOCUS_RING
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          {breadcrumb.map((crumb, index) => {
            const last = index === breadcrumb.length - 1;
            return (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 ? <span className="text-charcoal/30">/</span> : null}
                <button
                  type="button"
                  onClick={() => navigate(crumb.level)}
                  disabled={last}
                  className={cn(
                    "max-w-[12rem] truncate font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
                    last ? "text-charcoal" : "text-slate hover:text-gold-dark"
                  )}
                >
                  {crumb.label}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Function-level detail strip: date · time · venue near the breadcrumb */}
      {safeLevel.kind === "function" && activeEvent ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border border-charcoal/10 bg-ivory/70 px-3.5 py-2.5">
          <span className="font-display text-sm leading-tight text-charcoal">
            {activeEvent.title}
          </span>
          {activeEvent.dateLabel ? (
            <span className="inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
              <CalendarDays className="h-3.5 w-3.5 text-gold-dark" />
              {activeEvent.dateLabel}
            </span>
          ) : null}
          {activeEvent.timeLabel ? (
            <span className="inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
              <Clock className="h-3.5 w-3.5 text-gold-dark" />
              {activeEvent.timeLabel}
            </span>
          ) : null}
          {activeEvent.venueLabel ? (
            <span className="inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
              <MapPin className="h-3.5 w-3.5 text-gold-dark" />
              {activeEvent.venueLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Canvas stage */}
      <div className="relative min-h-[460px] w-full overflow-hidden border border-charcoal/10 bg-[radial-gradient(circle_at_center,rgba(201,169,110,0.12),transparent_45%),linear-gradient(140deg,rgba(255,255,255,0.7),rgba(245,240,231,0.55))] sm:min-h-[540px] xl:min-h-[640px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={levelKey}
            initial={enter.initial}
            animate={enter.animate}
            exit={enter.exit}
            transition={spring}
            className="absolute inset-0"
          >
            {safeLevel.kind === "event" ? (
              <RadialLevel
                hub={{
                  title: eventTitle || "Your event",
                  subtitle: `${days.length} ${days.length === 1 ? "day" : "days"}`,
                  status: aggregateStatus(days.map((d) => d.status)),
                }}
                emptyHint={days.length === 0 ? "Add a day to begin the map." : undefined}
                nodes={days.map((day) => ({
                  id: day.id,
                  title:
                    day.dateLabel && day.dateLabel !== "Date TBD"
                      ? day.dateLabel
                      : day.title,
                  eyebrow:
                    day.dateLabel && day.dateLabel !== "Date TBD"
                      ? `${day.title} · ${day.events.length} ${
                          day.events.length === 1 ? "function" : "functions"
                        }`
                      : undefined,
                  subtitle:
                    day.dateLabel && day.dateLabel !== "Date TBD"
                      ? `${day.readiness}% ready`
                      : `${day.events.length} ${
                          day.events.length === 1 ? "function" : "functions"
                        }`,
                  details:
                    day.dateLabel && day.dateLabel !== "Date TBD"
                      ? []
                      : [`${day.readiness}% ready`],
                  status: day.status,
                  onClick: () => navigate({ kind: "day", dayId: day.id }),
                }))}
              />
            ) : null}

            {safeLevel.kind === "day" && activeDay ? (
              <RadialLevel
                hub={{
                  title:
                    activeDay.dateLabel && activeDay.dateLabel !== "Date TBD"
                      ? activeDay.dateLabel
                      : activeDay.title,
                  subtitle:
                    activeDay.dateLabel && activeDay.dateLabel !== "Date TBD"
                      ? `${activeDay.title} · ${activeDay.readiness}% ready`
                      : `${activeDay.readiness}% ready`,
                  status: activeDay.status,
                  onClick: () => navigate({ kind: "event" }),
                }}
                emptyHint={
                  activeDay.events.length === 0 ? "Add a function to this day." : undefined
                }
                nodes={activeDay.events.map((event) => ({
                  id: event.id,
                  title: event.title,
                  eyebrow: [event.dateLabel, event.timeLabel].filter(Boolean).join(" · "),
                  subtitle: event.venueLabel ?? "Venue TBD",
                  details: [
                    event.meta ?? "Guests TBD",
                    `${event.readiness}% ready`,
                  ],
                  status: event.status,
                  onClick: () =>
                    navigate({
                      kind: "function",
                      dayId: activeDay.id,
                      eventId: event.id,
                    }),
                }))}
              />
            ) : null}

            {safeLevel.kind === "function" && activeEvent ? (
              <StepLevel
                event={activeEvent}
                onBack={() =>
                  navigate({ kind: "day", dayId: safeLevel.dayId })
                }
                onOpenStep={(stepId, origin) => onOpenStep(activeEvent.id, stepId, origin)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center font-accent text-[10px] uppercase tracking-[0.16em] text-slate/60">
        {safeLevel.kind === "event"
          ? "Tap a day to zoom in"
          : safeLevel.kind === "day"
            ? "Tap a function to zoom in · tap the centre to go back"
            : "Tap a step to edit it · tap the centre to go back"}
      </p>
    </div>
  );
}

type RadialNode = {
  id: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  details?: string[];
  status: FlowStatus;
  onClick: () => void;
};

function RadialLevel({
  hub,
  nodes,
  emptyHint,
}: {
  hub: { title: string; subtitle?: string; status: FlowStatus; onClick?: () => void };
  nodes: RadialNode[];
  emptyHint?: string;
}) {
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(nodes.length / pageSize));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, pageCount - 1);
  const visibleNodes = nodes.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize
  );
  const positions = radialPositions(
    visibleNodes.length,
    visibleNodes.length > 4 ? 40 : 36
  );
  const hubTone = FLOW_STATUS_META[hub.status];

  return (
    <div className="absolute inset-0 p-4">
      {/* connectors */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {positions.map((pos, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={pos.x}
            y2={pos.y}
            className={cn(
              "stroke-[0.4]",
              strokeForStatus(visibleNodes[i]?.status)
            )}
            strokeDasharray="1.4 1.1"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* hub */}
      <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <button
          data-map-hub
          type="button"
          onClick={hub.onClick}
          disabled={!hub.onClick}
          aria-label={hub.onClick ? "Zoom out" : hub.title}
          className={cn(
            "flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 bg-ivory p-2 text-center shadow-[0_18px_50px_rgba(51,61,41,0.12)] transition-transform sm:h-32 sm:w-32",
            hub.onClick ? "hover:scale-[1.03]" : "",
            "border-gold-primary/60",
            FOCUS_RING
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", hubTone.dot)} />
          <span className="mt-1 line-clamp-2 font-display text-sm leading-tight text-charcoal">
            {hub.title}
          </span>
          {hub.subtitle ? (
            <span className="mt-1 font-accent text-[8px] uppercase tracking-[0.12em] text-slate">
              {hub.subtitle}
            </span>
          ) : null}
        </button>
      </div>

      {/* child nodes */}
      {visibleNodes.map((node, i) => {
        const pos = positions[i];
        const tone = FLOW_STATUS_META[node.status];
        return (
          <div
            key={node.id}
            className="absolute z-10 w-[32%] max-w-[11.75rem] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <motion.button
              type="button"
              onClick={node.onClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              aria-label={`${node.title}, ${tone.label}${
                node.subtitle ? `, ${node.subtitle}` : ""
              }${node.details?.length ? `, ${node.details.join(", ")}` : ""}`}
              className={cn(
                "flex w-full flex-col items-center gap-1.5 border bg-ivory px-3 py-3 text-center shadow-[0_10px_28px_rgba(51,61,41,0.08)] transition-colors",
                "border-charcoal/12 hover:border-gold-primary/50",
                FOCUS_RING
              )}
            >
              {node.eyebrow ? (
                <span className="max-w-full truncate font-accent text-[8px] uppercase tracking-[0.12em] text-gold-dark">
                  {node.eyebrow}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
                <span className="line-clamp-2 font-heading text-xs font-medium leading-tight text-charcoal">
                  {node.title}
                </span>
              </span>
              {node.subtitle ? (
                <span className="truncate font-accent text-[8px] uppercase tracking-[0.12em] text-slate">
                  {node.subtitle}
                </span>
              ) : null}
              {node.details?.length ? (
                <span className="mt-0.5 flex max-w-full flex-wrap justify-center gap-1">
                  {node.details.slice(0, 3).map((detail) => (
                    <span
                      key={detail}
                      className="max-w-full truncate border border-charcoal/10 bg-cream/45 px-1.5 py-0.5 font-heading text-[9px] leading-tight text-slate"
                    >
                      {detail}
                    </span>
                  ))}
                </span>
              ) : null}
            </motion.button>
          </div>
        );
      })}

      {pageCount > 1 ? (
        <div className="absolute right-3 top-3 z-30 flex items-center border border-charcoal/10 bg-ivory/90 shadow-[0_8px_24px_rgba(51,61,41,0.08)] backdrop-blur">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            aria-label="Show previous map nodes"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center border-r border-charcoal/10 font-heading text-sm text-charcoal disabled:cursor-not-allowed disabled:opacity-30",
              FOCUS_RING
            )}
          >
            ←
          </button>
          <span className="px-2.5 font-accent text-[9px] uppercase tracking-[0.12em] text-slate">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage(Math.min(pageCount - 1, safePage + 1))
            }
            disabled={safePage === pageCount - 1}
            aria-label="Show next map nodes"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center border-l border-charcoal/10 font-heading text-sm text-charcoal disabled:cursor-not-allowed disabled:opacity-30",
              FOCUS_RING
            )}
          >
            →
          </button>
        </div>
      ) : null}

      {emptyHint ? (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center font-accent text-[10px] uppercase tracking-[0.14em] text-slate/70">
          {emptyHint}
        </p>
      ) : null}
    </div>
  );
}

function StepLevel({
  event,
  onBack,
  onOpenStep,
}: {
  event: CanvasEvent;
  onBack: () => void;
  onOpenStep: (stepId: string, origin: { x: number; y: number }) => void;
}) {
  const positions = radialPositions(event.steps.length, event.steps.length > 4 ? 40 : 34);
  const hubTone = FLOW_STATUS_META[event.status];

  return (
    <div className="absolute inset-0 p-4">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {positions.map((pos, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={pos.x}
            y2={pos.y}
            className={cn("stroke-[0.4]", strokeForStatus(event.steps[i]?.status))}
            strokeDasharray="1.4 1.1"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <button
        data-map-hub
        type="button"
        onClick={onBack}
        aria-label={`Back to function map from ${event.title}`}
        className={cn(
          "absolute left-1/2 top-1/2 z-20 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-gold-primary/60 bg-ivory p-2 text-center shadow-[0_18px_50px_rgba(51,61,41,0.12)] transition-transform hover:scale-[1.03] sm:h-32 sm:w-32",
          FOCUS_RING
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", hubTone.dot)} />
        <span className="mt-1 line-clamp-2 font-display text-sm leading-tight text-charcoal">
          {event.title}
        </span>
        <span className="mt-1 font-accent text-[8px] uppercase tracking-[0.12em] text-slate">
          {event.readiness}% ready
        </span>
      </button>

      {event.steps.map((step, i) => {
        const pos = positions[i];
        const tone = FLOW_STATUS_META[step.status ?? "planned"];
        const shape = stepShape(step.id, i);
        const Icon = step.icon ?? stepIconFor(step.id);
        return (
          <div
            key={step.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onOpenStep(step.id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              aria-label={`Edit ${step.label}, ${tone.label}`}
              className={cn("group flex w-16 flex-col items-center gap-1.5", FOCUS_RING)}
            >
              <span className="relative h-12 w-12">
                <span
                  aria-hidden
                  style={shape.clip ? { clipPath: shape.clip } : undefined}
                  className={cn("absolute inset-0", shape.radius, tone.dot)}
                />
                <span
                  aria-hidden
                  style={shape.clip ? { clipPath: shape.clip } : undefined}
                  className={cn("absolute inset-[2px] bg-ivory", shape.radius)}
                />
                <span className="absolute inset-0 grid place-items-center">
                  {Icon ? (
                    <Icon className="h-[18px] w-[18px] text-charcoal" />
                  ) : (
                    <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
                  )}
                </span>
              </span>
              <span className="max-w-[5rem] text-center font-accent text-[9px] uppercase leading-tight tracking-[0.1em] text-slate">
                {step.label}
              </span>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}

function strokeForStatus(status?: FlowStatus) {
  if (status === "ready") return "stroke-sage/45";
  if (status === "gap") return "stroke-rose/40";
  if (status === "active") return "stroke-gold-primary/45";
  return "stroke-charcoal/18";
}

function aggregateStatus(statuses: FlowStatus[]): FlowStatus {
  if (statuses.length === 0) return "planned";
  if (statuses.every((s) => s === "ready")) return "ready";
  if (statuses.some((s) => s === "gap")) return "gap";
  if (statuses.some((s) => s === "active" || s === "ready")) return "active";
  return "planned";
}
