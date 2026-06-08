"use client";

/**
 * StepOrbit — the smallest level of the event map: the breakdown steps that
 * sit under an event node (food, decor, photo, logistics…).
 *
 * Each step gets its OWN distinct shape (circle / hexagon / diamond / squircle /
 * pentagon / octagon / shield), keyed off the step id so the same kind of step
 * always reads the same, and tokens spring/stagger in when the orbit opens.
 * The shaped outline is coloured by status; selection fills it gold. Controlled,
 * accessible, reduced-motion aware, mobile-friendly wrapping.
 */

import type { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FLOW_STATUS_META, type FlowStatus } from "./flow-node";
import { cn } from "@/lib/utils";

export type FlowStepShape =
  | "circle"
  | "squircle"
  | "hexagon"
  | "diamond"
  | "pentagon"
  | "octagon"
  | "shield";

export type FlowStep = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  status?: FlowStatus;
  /** Override the auto-derived shape. */
  shape?: FlowStepShape;
};

// clip-path polygons per shape; circle/squircle use border-radius instead.
const CLIP: Partial<Record<FlowStepShape, string>> = {
  hexagon: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  octagon: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  shield: "polygon(50% 0%, 100% 22%, 100% 60%, 50% 100%, 0% 60%, 0% 22%)",
};
const RADIUS: Partial<Record<FlowStepShape, string>> = {
  circle: "rounded-full",
  squircle: "rounded-[42%]",
};

// Stable shape per known step id; everything else cycles through the set.
const SHAPE_BY_KEY: Record<string, FlowStepShape> = {
  basics: "circle",
  food: "hexagon",
  design: "diamond",
  decor: "diamond",
  vendors: "octagon",
  logistics: "squircle",
  tasks: "pentagon",
  notes: "shield",
  "photo-video": "shield",
  entertainment: "pentagon",
  hospitality: "squircle",
  custom: "circle",
};
const SHAPE_CYCLE: FlowStepShape[] = [
  "circle",
  "hexagon",
  "diamond",
  "octagon",
  "squircle",
  "pentagon",
  "shield",
];

function shapeFor(step: FlowStep, index: number): FlowStepShape {
  return step.shape ?? SHAPE_BY_KEY[step.id] ?? SHAPE_CYCLE[index % SHAPE_CYCLE.length];
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ivory rounded-md";

export type StepOrbitProps = {
  steps: FlowStep[];
  selectedId?: string | null;
  /** Second arg is the tapped token's screen-centre, for origin-zoom transitions. */
  onSelect?: (id: string, origin?: { x: number; y: number }) => void;
  size?: "sm" | "md";
  emptyLabel?: string;
  className?: string;
};

export function StepOrbit({
  steps,
  selectedId,
  onSelect,
  size = "md",
  emptyLabel,
  className,
}: StepOrbitProps) {
  const reduce = useReducedMotion();

  if (steps.length === 0) {
    return emptyLabel ? (
      <p className={cn("font-accent text-[10px] uppercase tracking-[0.16em] text-slate/70", className)}>
        {emptyLabel}
      </p>
    ) : null;
  }

  const tokenSize = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const interactive = Boolean(onSelect);

  return (
    <ul className={cn("flex list-none flex-wrap gap-x-3 gap-y-4 pl-0", className)} role="list">
      {steps.map((step, index) => {
        const tone = FLOW_STATUS_META[step.status ?? "planned"];
        const Icon = step.icon;
        const active = selectedId != null && selectedId === step.id;
        const shape = shapeFor(step, index);
        const clipPath = CLIP[shape];
        const radius = RADIUS[shape] ?? "";

        const token = (
          <span className={cn("relative", tokenSize)}>
            {/* Shaped outline (status colour) + inset fill = a clean shaped border. */}
            <span
              aria-hidden
              style={clipPath ? { clipPath } : undefined}
              className={cn("absolute inset-0 transition-colors", radius, active ? "bg-gold-primary" : tone.dot)}
            />
            <span
              aria-hidden
              style={clipPath ? { clipPath } : undefined}
              className={cn(
                "absolute inset-[2px] transition-colors",
                radius,
                active ? "bg-gold-primary/15" : "bg-ivory"
              )}
            />
            <span className="absolute inset-0 grid place-items-center">
              {Icon ? (
                <Icon className={cn("text-charcoal", size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]")} />
              ) : (
                <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
              )}
            </span>
          </span>
        );

        const label = (
          <span className="max-w-[5rem] text-center font-accent text-[9px] uppercase leading-tight tracking-[0.1em] text-slate">
            {step.label}
          </span>
        );

        const entrance = reduce
          ? {}
          : {
              initial: { opacity: 0, scale: 0.5, y: 6 },
              animate: { opacity: 1, scale: 1, y: 0 },
              transition: { delay: index * 0.04, type: "spring" as const, stiffness: 380, damping: 22 },
            };

        return (
          <motion.li key={step.id} className="flex" {...entrance}>
            {interactive ? (
              <motion.button
                type="button"
                onClick={(event) => {
                  const r = event.currentTarget.getBoundingClientRect();
                  onSelect?.(step.id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                }}
                aria-pressed={active}
                aria-label={`${step.label} — ${tone.label}`}
                title={`${step.label} · ${tone.label}`}
                whileHover={reduce ? undefined : { scale: 1.08 }}
                whileTap={reduce ? undefined : { scale: 0.94 }}
                className={cn("group flex w-[4.5rem] flex-col items-center gap-1.5 p-1", FOCUS_RING)}
              >
                {token}
                {label}
              </motion.button>
            ) : (
              <span
                className="flex w-[4.5rem] flex-col items-center gap-1.5 p-1"
                title={`${step.label} · ${tone.label}`}
              >
                {token}
                {label}
              </span>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
