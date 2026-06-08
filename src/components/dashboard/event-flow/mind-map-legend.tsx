"use client";

/**
 * MindMapLegend — a compact key that teaches the celebration-board language:
 * what each node shape means (Center = Day, Branch = Function, Orbit = Steps)
 * and what the status colours signal. Purely presentational; reuses the shared
 * FLOW_STATUS_META palette so it never drifts from the real nodes.
 */

import { FLOW_STATUS_META, type FlowStatus } from "./flow-node";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const NODE_LEGEND = [
  {
    key: "center",
    term: "Center",
    maps: "Day",
    copy: "The anchor at the heart of each celebration day.",
  },
  {
    key: "branch",
    term: "Branch",
    maps: "Function",
    copy: "A function inside the day — reception, sangeet, dinner.",
  },
  {
    key: "orbit",
    term: "Orbit",
    maps: "Steps",
    copy: "The breakdown around a function — food, decor, photo, logistics.",
  },
] as const;

// Ready first, Planned last — most-resolved to least-resolved.
const STATUS_ORDER: FlowStatus[] = ["ready", "active", "gap", "planned"];

export function MindMapLegend({ className }: { className?: string }) {
  return (
    <div className={cn(dashCard, "space-y-5", className)}>
      <div>
        <p className={dashLabel}>Legend</p>
        <h3 className="mt-2 font-display text-lg text-charcoal">How to read the board</h3>
      </div>

      <ul className="list-none space-y-3 pl-0">
        {NODE_LEGEND.map((item) => (
          <li key={item.key} className="flex items-start gap-3">
            <NodeGlyph kind={item.key} />
            <div className="min-w-0">
              <p className="font-heading text-sm text-charcoal">
                <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                  {item.term}
                </span>
                <span className="mx-1.5 text-charcoal/30">=</span>
                {item.maps}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate">{item.copy}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-charcoal/8 pt-4">
        <p className={dashLabel}>Status colours</p>
        <ul className="mt-3 grid list-none grid-cols-2 gap-2 pl-0">
          {STATUS_ORDER.map((status) => {
            const tone = FLOW_STATUS_META[status];
            return (
              <li key={status} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
                <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                  {tone.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Tiny shape glyphs mirroring the three real node shapes. */
function NodeGlyph({ kind }: { kind: "center" | "branch" | "orbit" }) {
  if (kind === "center") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
        <span className="h-6 w-6 rounded-full border-2 border-gold-primary/50 bg-gold-primary/10" />
      </span>
    );
  }

  if (kind === "branch") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
        <span
          className="flex h-6 w-8 overflow-hidden border border-charcoal/20 bg-ivory"
          style={{ clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)" }}
        >
          <span className="w-1 bg-gold-primary/60" />
        </span>
      </span>
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center gap-1" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-full border border-charcoal/25 bg-ivory" />
      <span className="h-3 w-3 rounded-full border border-gold-primary/45 bg-gold-primary/10" />
      <span className="h-2.5 w-2.5 rounded-full border border-charcoal/25 bg-ivory" />
    </span>
  );
}
