"use client";

/**
 * FlowNode — the primary node in the premium event-map / flowchart language.
 *
 * Two distinct shapes via the `variant` prop:
 *   - "day"   : a lane-header anchor with a circular day medallion + ribbon body.
 *   - "event" : an event-ticket card with a status time-rail and a clipped corner.
 *
 * Small breakdown steps use a different component (StepOrbit) so the three
 * levels of the map read as visually distinct. Presentational + controlled:
 * pass `selected`/`status` in, get `onClick` out. No data or planner wiring.
 */

import type { ComponentType, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type FlowStatus = "planned" | "active" | "ready" | "gap";
export type FlowNodeVariant = "day" | "event";

/** Shared status palette used across every event-flow primitive. */
export const FLOW_STATUS_META: Record<
  FlowStatus,
  { label: string; dot: string; text: string; ring: string; rail: string; soft: string }
> = {
  planned: {
    label: "Planned",
    dot: "bg-slate/40",
    text: "text-slate",
    ring: "ring-charcoal/15",
    rail: "bg-charcoal/15",
    soft: "bg-charcoal/[0.04]",
  },
  active: {
    label: "In progress",
    dot: "bg-gold-primary",
    text: "text-gold-dark",
    ring: "ring-gold-primary/40",
    rail: "bg-gold-primary/60",
    soft: "bg-gold-primary/10",
  },
  ready: {
    label: "Ready",
    dot: "bg-sage",
    text: "text-sage",
    ring: "ring-sage/45",
    rail: "bg-sage/60",
    soft: "bg-sage/10",
  },
  gap: {
    label: "Needs attention",
    dot: "bg-rose",
    text: "text-rose",
    ring: "ring-rose/45",
    rail: "bg-rose/55",
    soft: "bg-rose/10",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

export type FlowNodeProps = {
  variant: FlowNodeVariant;
  title: string;
  /** Day date or event time window. */
  eyebrow?: string;
  /** Secondary line, e.g. "240 guests". */
  meta?: string;
  /** Day number or order token shown in the medallion / corner. */
  index?: number | string;
  status?: FlowStatus;
  icon?: ComponentType<{ className?: string }>;
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** Slot rendered beneath the node body — e.g. a StepOrbit or chips. */
  children?: ReactNode;
  className?: string;
};

export function FlowNode({
  variant,
  title,
  eyebrow,
  meta,
  index,
  status = "planned",
  icon: Icon,
  selected = false,
  onClick,
  ariaLabel,
  children,
  className,
}: FlowNodeProps) {
  const tone = FLOW_STATUS_META[status];
  const interactive = Boolean(onClick);
  const reduce = useReducedMotion();

  if (variant === "day") {
    const body = (
      <>
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-primary/40 bg-gold-primary/10 font-display text-lg text-gold-dark">
          {Icon ? <Icon className="h-5 w-5" /> : (index ?? "")}
        </span>
        <span className="min-w-0 flex-1 text-left">
          {eyebrow ? (
            <span className="block font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
              {eyebrow}
            </span>
          ) : null}
          <span className="block truncate font-display text-lg leading-tight text-charcoal">
            {title}
          </span>
          {meta ? <span className="mt-0.5 block text-xs text-slate">{meta}</span> : null}
        </span>
        <StatusBadge status={status} />
      </>
    );

    return (
      <div className={cn("relative", className)}>
        {interactive ? (
          <motion.button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            aria-label={ariaLabel ?? title}
            whileHover={reduce ? undefined : { scale: 1.01 }}
            whileTap={reduce ? undefined : { scale: 0.99 }}
            className={cn(
              "group flex w-full items-center gap-4 border-l-[3px] bg-ivory px-4 py-3.5 text-left transition-all duration-300",
              FOCUS_RING,
              selected
                ? "border-l-gold-primary border-y border-r border-y-gold-primary/40 border-r-gold-primary/40 shadow-[0_16px_44px_rgba(201,169,110,0.16)]"
                : "border-l-gold-primary/50 border-y border-r border-y-charcoal/8 border-r-charcoal/8 hover:border-l-gold-primary hover:shadow-[0_12px_36px_rgba(51,61,41,0.07)]"
            )}
          >
            {body}
          </motion.button>
        ) : (
          <div className="flex w-full items-center gap-4 border-l-[3px] border-l-gold-primary/60 border-y border-r border-y-charcoal/8 border-r-charcoal/8 bg-ivory px-4 py-3.5">
            {body}
          </div>
        )}
        {children}
      </div>
    );
  }

  // variant === "event" — ticket-style card with a status time-rail.
  const eventBody = (
    <>
      <span className={cn("w-1.5 shrink-0", tone.rail)} aria-hidden />
      <span className="min-w-0 flex-1 p-4">
        <span className="flex items-center justify-between gap-2">
          {eyebrow ? (
            <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
              {eyebrow}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1.5">
            {typeof index !== "undefined" ? (
              <span className="font-accent text-[9px] uppercase tracking-[0.14em] text-slate/70">
                {index}
              </span>
            ) : null}
            <span className={cn("h-2 w-2 rounded-full", tone.dot)} aria-hidden />
          </span>
        </span>
        <span className="mt-2 flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-gold-dark" /> : null}
          <span className="min-w-0 truncate font-display text-base leading-tight text-charcoal">
            {title}
          </span>
        </span>
        {meta ? <span className="mt-1 block text-xs text-slate">{meta}</span> : null}
      </span>
    </>
  );

  // Ticket-notch on the top-right corner; inline style keeps the clip robust.
  const clip = { clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)" } as const;

  return (
    <div className={cn("relative", className)}>
      {interactive ? (
        <motion.button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          aria-label={ariaLabel ?? title}
          style={clip}
          whileHover={reduce ? undefined : { y: -2 }}
          whileTap={reduce ? undefined : { scale: 0.985 }}
          className={cn(
            "group flex w-full overflow-hidden border bg-ivory text-left transition-all duration-300",
            FOCUS_RING,
            selected
              ? "border-gold-primary shadow-[0_18px_50px_rgba(201,169,110,0.18)]"
              : "border-charcoal/12 hover:border-gold-primary/45 hover:shadow-[0_14px_40px_rgba(51,61,41,0.08)]"
          )}
        >
          {eventBody}
        </motion.button>
      ) : (
        <div
          style={clip}
          className="flex w-full overflow-hidden border border-charcoal/12 bg-ivory"
        >
          {eventBody}
        </div>
      )}
      {children}
    </div>
  );
}

/** Small status chip used inside day nodes. Exported for reuse/consistency. */
export function StatusBadge({ status }: { status: FlowStatus }) {
  const tone = FLOW_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border border-charcoal/10 px-2.5 py-1 font-accent text-[9px] uppercase tracking-[0.14em]",
        tone.text,
        tone.soft
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden />
      {tone.label}
    </span>
  );
}
