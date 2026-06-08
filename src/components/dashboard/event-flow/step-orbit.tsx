"use client";

/**
 * StepOrbit — the smallest level of the event map: the breakdown steps that
 * sit under an event node (e.g. food, decor, photo, logistics).
 *
 * Distinct circular "token" shape so it never reads like the rectangular day /
 * event nodes. Wrapping cluster = mobile-friendly. Controlled selection.
 */

import type { ComponentType } from "react";
import { FLOW_STATUS_META, type FlowStatus } from "./flow-node";
import { cn } from "@/lib/utils";

export type FlowStep = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  status?: FlowStatus;
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

export type StepOrbitProps = {
  steps: FlowStep[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Token size. */
  size?: "sm" | "md";
  /** Shown when there are no steps yet. */
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
      {steps.map((step) => {
        const tone = FLOW_STATUS_META[step.status ?? "planned"];
        const Icon = step.icon;
        const active = selectedId != null && selectedId === step.id;

        const token = (
          <>
            <span
              className={cn(
                "flex items-center justify-center rounded-full border-2 ring-2 ring-offset-2 ring-offset-ivory transition-all duration-200",
                tokenSize,
                tone.ring,
                active
                  ? "border-gold-primary bg-gold-primary/12"
                  : "border-charcoal/15 bg-ivory group-hover:border-gold-primary/45"
              )}
            >
              {Icon ? (
                <Icon className={cn("text-charcoal", size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
              ) : (
                <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} aria-hidden />
              )}
            </span>
            <span className="max-w-[5rem] text-center font-accent text-[9px] uppercase leading-tight tracking-[0.1em] text-slate">
              {step.label}
            </span>
          </>
        );

        return (
          <li key={step.id} className="flex">
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelect?.(step.id)}
                aria-pressed={active}
                aria-label={`${step.label} — ${tone.label}`}
                title={`${step.label} · ${tone.label}`}
                className={cn(
                  "group flex w-[4.5rem] flex-col items-center gap-1.5 rounded-md p-1",
                  FOCUS_RING
                )}
              >
                {token}
              </button>
            ) : (
              <span
                className="flex w-[4.5rem] flex-col items-center gap-1.5 p-1"
                title={`${step.label} · ${tone.label}`}
              >
                {token}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
