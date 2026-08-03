"use client";

/**
 * FinalizationBoard — Layer 3 readiness, made interactive.
 *
 * Decoupled from the planner page: it takes a plain list of checks plus an
 * `onResolve(key)` callback (which already deep-links to the right layer +
 * editor section in client/wedding/page.tsx) and renders:
 *   - a live progress ring + ready/partial/missing tallies
 *   - a single "Open next gap" CTA that jumps to the first unresolved check
 *   - gap cards sorted worst-first, each one click-through to its fix
 *   - an all-clear state at 100%
 *
 * Drop-in: replace the body of <FinalizationLayer/> with
 *   <FinalizationBoard checks={checks} onResolve={onResolveCheck} />
 */

import { ArrowRight, CheckCircle2, CircleDashed, CircleSlash } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/ui-kit";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type FinalizationCheckStatus = "ok" | "partial" | "missing";

export type FinalizationGapTarget = {
  eventId: string;
  eventName: string;
  dayName: string;
  detail?: string;
};

export type FinalizationCheck = {
  key: string;
  label: string;
  description: string;
  status: FinalizationCheckStatus;
  detail: string;
  targets?: FinalizationGapTarget[];
};

const STATUS_META: Record<
  FinalizationCheckStatus,
  { label: string; card: string; pill: string; icon: typeof CheckCircle2; order: number }
> = {
  missing: {
    label: "Open gap",
    card: "border-rose/25 bg-rose/5",
    pill: "border-rose/40 text-rose",
    icon: CircleSlash,
    order: 0,
  },
  partial: {
    label: "In progress",
    card: "border-gold-primary/25 bg-gold-primary/5",
    pill: "border-gold-primary/45 text-gold-dark",
    icon: CircleDashed,
    order: 1,
  },
  ok: {
    label: "Ready",
    card: "border-sage/25 bg-sage/5",
    pill: "border-sage/45 text-sage",
    icon: CheckCircle2,
    order: 2,
  },
};

function actionLabel(check: FinalizationCheck) {
  if (check.status === "ok") return "Review";
  switch (check.key) {
    case "definition":
      return "Review structure";
    case "requirements":
      return "Fill requirements";
    case "vendors":
      return "Pick vendors";
    case "budget":
      return "Set estimates";
    case "guests-hotels":
      return "Plan hospitality";
    case "run-of-show":
      return "Open tasks";
    default:
      return "Resolve";
  }
}

export function FinalizationBoard({
  checks,
  onResolve,
  className,
}: {
  checks: FinalizationCheck[];
  onResolve: (checkKey: string, eventId?: string) => void;
  className?: string;
}) {
  const total = checks.length || 1;
  const counts = {
    ok: checks.filter((c) => c.status === "ok").length,
    partial: checks.filter((c) => c.status === "partial").length,
    missing: checks.filter((c) => c.status === "missing").length,
  };
  const readyPercent = Math.round((counts.ok / total) * 100);
  const allClear = counts.ok === checks.length && checks.length > 0;

  // Worst-first so the most urgent gaps lead the board.
  const ordered = [...checks].sort(
    (a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order
  );
  const nextGap = ordered.find((check) => check.status !== "ok");
  const nextGapTarget = nextGap?.targets?.[0];

  return (
    <section className={cn("mt-8 space-y-5", className)}>
      <div
        className={cn(
          dashCard,
          allClear ? "border-sage/30 bg-sage/8" : "border-gold-primary/25 bg-gold-primary/5"
        )}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <ProgressRing percent={readyPercent} />
            <div>
              <p className={dashLabel}>Layer 3 · Finalization</p>
              <h3 className="mt-2 font-display text-2xl text-charcoal">
                {allClear ? "Every gap is closed." : "Finish the gaps before go-live."}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tally tone="ok" value={counts.ok} label="Ready" />
                <Tally tone="partial" value={counts.partial} label="In progress" />
                <Tally tone="missing" value={counts.missing} label="Open" />
              </div>
            </div>
          </div>

          {allClear ? (
            <div className="flex items-center gap-2 border border-sage/40 bg-sage/10 px-4 py-3 text-sage">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-accent text-[11px] uppercase tracking-[0.18em]">
                Ready to execute
              </span>
            </div>
          ) : nextGap ? (
            <button
              type="button"
              onClick={() => onResolve(nextGap.key, nextGapTarget?.eventId)}
              className="group inline-flex items-center gap-2 border border-gold-primary bg-gold-primary px-5 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-midnight transition-colors hover:bg-gold-dark"
            >
              Open next gap
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : null}
        </div>
        {nextGap ? (
          <p className="mt-4 border-t border-charcoal/10 pt-3 text-xs leading-relaxed text-slate">
            Up next · <span className="text-charcoal">{nextGap.label}</span> — {nextGap.detail}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ordered.map((check) => {
          const meta = STATUS_META[check.status];
          const Icon = meta.icon;
          return (
            <article key={check.key} className={cn(dashCard, meta.card, "flex flex-col")}>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 border px-2.5 py-1 font-accent text-[9px] uppercase tracking-[0.16em]",
                    meta.pill
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>
              <h4 className="mt-3 font-display text-lg text-charcoal">{check.label}</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate">{check.description}</p>
              <p className="mt-4 border-t border-charcoal/10 pt-3 text-xs text-charcoal">
                {check.detail}
              </p>
              {check.targets?.length ? (
                <div className="mt-3 space-y-2" aria-label={`${check.label} gaps`}>
                  {check.targets.slice(0, 4).map((target) => (
                    <button
                      key={`${check.key}-${target.eventId}`}
                      type="button"
                      onClick={() => onResolve(check.key, target.eventId)}
                      className="flex w-full items-center justify-between gap-3 border border-charcoal/10 bg-ivory/70 px-3 py-2 text-left transition-colors hover:border-gold-primary/55 focus-visible:border-gold-primary focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-heading text-sm text-charcoal">
                          {target.eventName}
                        </span>
                        <span className="mt-0.5 block font-accent text-[9px] uppercase tracking-[0.14em] text-slate">
                          {target.dayName}
                          {target.detail ? ` · ${target.detail}` : ""}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold-dark" />
                    </button>
                  ))}
                  {check.targets.length > 4 ? (
                    <p className="font-accent text-[9px] uppercase tracking-[0.14em] text-slate">
                      + {check.targets.length - 4} more gap(s)
                    </p>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onResolve(check.key, check.targets?.[0]?.eventId)}
                className={cn(
                  "mt-4 inline-flex w-fit items-center gap-2 border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
                  check.status === "ok"
                    ? "border-charcoal/15 text-slate hover:border-charcoal/30 hover:text-charcoal"
                    : "border-gold-primary/50 text-gold-dark hover:border-gold-primary hover:bg-gold-primary/10"
                )}
              >
                {actionLabel(check)}
                {check.status !== "ok" ? <ArrowRight className="h-3.5 w-3.5" /> : null}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Tally({
  tone,
  value,
  label,
}: {
  tone: FinalizationCheckStatus;
  value: number;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 font-accent text-[10px] uppercase tracking-[0.14em]",
        STATUS_META[tone].pill
      )}
    >
      <span className="font-display text-sm leading-none text-charcoal">{value}</span>
      {label}
    </span>
  );
}
