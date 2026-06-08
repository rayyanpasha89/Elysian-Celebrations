"use client";

/**
 * FlowEmptyState — the "no map yet" state for the event-flow surface.
 *
 * Renders a faux, dashed mini event-map (day → events → steps) as an
 * illustration so the empty state still teaches the visual language, then a
 * title / description / optional CTA. Purely presentational.
 */

import type { ComponentType } from "react";
import { dashBtn } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type FlowEmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
};

export function FlowEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  className,
}: FlowEmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-dashed border-charcoal/15 bg-cream/40 px-6 py-10 text-center md:px-10 md:py-14",
        className
      )}
    >
      {/* Faux event map — decorative. */}
      <div
        aria-hidden
        className="mx-auto mb-8 flex w-full max-w-xs flex-col items-center opacity-70"
      >
        <div className="flex h-9 w-44 items-center gap-2 border-l-[3px] border-l-gold-primary/50 border-y border-r border-y-charcoal/10 border-r-charcoal/10 bg-ivory/80 px-3">
          <span className="h-4 w-4 rounded-full border border-gold-primary/40 bg-gold-primary/10" />
          <span className="h-1.5 w-16 rounded-full bg-charcoal/15" />
        </div>
        <span className="h-5 w-px bg-gradient-to-b from-gold-primary/50 to-transparent" />
        <div className="flex items-start gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="h-12 w-20 border border-dashed border-charcoal/20 bg-ivory/70"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)" }}
              />
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full border border-charcoal/15 bg-ivory" />
                <span className="h-3 w-3 rounded-full border border-charcoal/15 bg-ivory" />
                <span className="h-3 w-3 rounded-full border border-charcoal/15 bg-ivory" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-gold-primary/30 bg-gold-primary/10 text-gold-dark">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}

      <h3 className="font-display text-xl text-charcoal">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">{description}</p>
      ) : null}

      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={cn(dashBtn, "mt-6")}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
