"use client";

/**
 * FlowConnector — the edge that links nodes in the event map.
 *
 * Pure presentational: a gradient line with an optional animated "flow" pulse
 * and a direction arrow. Consumers control length via `className` (e.g. `h-10`
 * for vertical, `w-12` for horizontal). Decorative by default (aria-hidden);
 * pass a `label` to expose it to assistive tech.
 */

import { cn } from "@/lib/utils";

export type FlowConnectorOrientation = "vertical" | "horizontal";
export type FlowConnectorTone = "gold" | "neutral" | "sage" | "rose";

const TONE: Record<FlowConnectorTone, { line: string; dot: string; arrow: string }> = {
  gold: { line: "from-gold-primary/70", dot: "bg-gold-primary", arrow: "border-gold-primary/70" },
  neutral: { line: "from-charcoal/30", dot: "bg-charcoal/40", arrow: "border-charcoal/30" },
  sage: { line: "from-sage/70", dot: "bg-sage", arrow: "border-sage/70" },
  rose: { line: "from-rose/60", dot: "bg-rose", arrow: "border-rose/60" },
};

export type FlowConnectorProps = {
  orientation?: FlowConnectorOrientation;
  tone?: FlowConnectorTone;
  /** Show a pulsing dot travelling the line (respects reduced motion). */
  animated?: boolean;
  /** Hide the direction arrowhead. */
  hideArrow?: boolean;
  label?: string;
  className?: string;
};

export function FlowConnector({
  orientation = "vertical",
  tone = "gold",
  animated = false,
  hideArrow = false,
  label,
  className,
}: FlowConnectorProps) {
  const palette = TONE[tone];
  const decorative = !label;

  if (orientation === "horizontal") {
    return (
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={decorative}
        className={cn("relative inline-flex h-4 w-10 items-center", className)}
      >
        <span className={cn("h-px w-full bg-gradient-to-r to-transparent", palette.line)} />
        {animated ? (
          <span
            className={cn(
              "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full motion-reduce:hidden animate-pulse",
              palette.dot
            )}
          />
        ) : null}
        {!hideArrow ? (
          <span
            className={cn(
              "absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 border-r border-t",
              palette.arrow
            )}
          />
        ) : null}
      </span>
    );
  }

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={decorative}
      className={cn("relative flex h-10 w-4 flex-col items-center justify-center", className)}
    >
      <span className={cn("w-px flex-1 bg-gradient-to-b to-transparent", palette.line)} />
      {animated ? (
        <span
          className={cn(
            "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full motion-reduce:hidden animate-pulse",
            palette.dot
          )}
        />
      ) : null}
      {!hideArrow ? (
        <span
          className={cn(
            "absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r",
            palette.arrow
          )}
        />
      ) : null}
    </span>
  );
}
