"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lock,
  Sparkles,
} from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn, formatCurrency } from "@/lib/utils";

const GST_RATE = 0.18;
const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

// ─── API shapes ─────────────────────────────────────────────────────────────

type EventPlanEvent = {
  id: string;
  name: string;
  startTime: string | null;
  estimatedSpend: number;
};
type EventPlanDay = {
  id: string;
  name: string;
  date: string | null;
  estimatedSpend: number;
  events: EventPlanEvent[];
};
type EventPlanSpend = { weddingName: string; days: EventPlanDay[]; eventCount: number };
type PlanLineItem = {
  eventId: string;
  vendorName: string;
  serviceName: string | null;
  categoryName: string;
  estimatedCost: number;
  stage: "selected" | "booked" | "confirmed";
};
type ConfirmedEvent = {
  eventId: string;
  finalTotal: number;
  locked: boolean;
};

// ─── Derived model ──────────────────────────────────────────────────────────

type FnState = "locked" | "awaiting" | "estimate";
type FnRow = {
  eventId: string;
  name: string;
  startTime: string | null;
  picks: PlanLineItem[];
  estimate: number;
  finalTotal: number | null;
  state: FnState;
  display: number;
};
type DaySection = {
  id: string;
  name: string;
  date: string | null;
  functions: FnRow[];
  dayTotal: number;
};

const STAGE_CHIP: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "border-sage/35 bg-sage/10 text-sage" },
  booked: { label: "Booked", cls: "border-gold-primary/35 bg-gold-primary/10 text-gold-dark" },
  selected: { label: "Selected", cls: "border-charcoal/15 bg-charcoal/5 text-slate" },
};

function lakh(n: number) {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  return `₹${(n / 100000).toFixed(1)}L`;
}

export default function CostEstimationPage() {
  const [spend, setSpend] = useState<EventPlanSpend | null>(null);
  const [picks, setPicks] = useState<PlanLineItem[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [filter, setFilter] = useState<"all" | "confirmed" | "estimate">("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/budget");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        if (cancelled) return;
        if (json.needsOnboarding) {
          setNeedsOnboarding(true);
          return;
        }
        setSpend((json.eventPlanSpend as EventPlanSpend | null) ?? null);
        setPicks((json.planLineItems as PlanLineItem[] | null) ?? []);
        setConfirmed((json.confirmedEvents as ConfirmedEvent[] | null) ?? []);
      } catch (error) {
        if (!cancelled)
          toast.error(error instanceof Error ? error.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => {
    const picksByEvent = new Map<string, PlanLineItem[]>();
    for (const p of picks) {
      const list = picksByEvent.get(p.eventId) ?? [];
      list.push(p);
      picksByEvent.set(p.eventId, list);
    }
    const confByEvent = new Map(confirmed.map((c) => [c.eventId, c]));

    const days: DaySection[] = (spend?.days ?? [])
      .filter((d) => d.events.length > 0)
      .map((day) => {
        const functions: FnRow[] = day.events.map((ev) => {
          const evPicks = picksByEvent.get(ev.id) ?? [];
          const estimate = evPicks.length
            ? evPicks.reduce((s, p) => s + p.estimatedCost, 0)
            : ev.estimatedSpend;
          const conf = confByEvent.get(ev.id);
          const locked = Boolean(conf && conf.locked);
          const state: FnState = locked ? "locked" : conf ? "awaiting" : "estimate";
          const finalTotal = conf ? conf.finalTotal : null;
          const display = locked ? finalTotal ?? 0 : estimate;
          return {
            eventId: ev.id,
            name: ev.name,
            startTime: ev.startTime,
            picks: evPicks,
            estimate,
            finalTotal,
            state,
            display,
          };
        });
        return {
          id: day.id,
          name: day.name,
          date: day.date,
          functions,
          dayTotal: functions.reduce((s, f) => s + f.display, 0),
        };
      });

    const allFns = days.flatMap((d) => d.functions);
    const projected = allFns.reduce((s, f) => s + f.display, 0);
    const confirmedTotal = allFns
      .filter((f) => f.state === "locked")
      .reduce((s, f) => s + (f.finalTotal ?? 0), 0);
    const lockedCount = allFns.filter((f) => f.state === "locked").length;
    const awaitingCount = allFns.filter((f) => f.state === "awaiting").length;

    return {
      days,
      allFns,
      projected,
      confirmedTotal,
      estimateTotal: projected - confirmedTotal,
      lockedCount,
      awaitingCount,
      fnCount: allFns.length,
      gst: Math.round(confirmedTotal * GST_RATE),
      confirmedPct: allFns.length ? Math.round((lockedCount / allFns.length) * 100) : 0,
    };
  }, [spend, picks, confirmed]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading your cost estimate...</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="border border-charcoal/10 bg-ivory p-8">
        <p className={dashLabel}>Cost estimation</p>
        <h1 className="mt-2 font-display text-3xl text-charcoal">Start with your event setup</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
          Your estimate is built from your celebration plan and vendor picks.
          Complete onboarding and it will be ready when you return.
        </p>
        <Link
          href="/client/onboarding"
          className="mt-6 inline-flex items-center border border-gold-primary px-6 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-all hover:bg-gold-primary hover:text-midnight"
        >
          Complete onboarding
        </Link>
      </div>
    );
  }

  if (model.fnCount === 0) {
    return (
      <div className="border border-dashed border-charcoal/15 bg-ivory p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-gold-primary/50" />
        <h1 className="mt-3 font-display text-2xl text-charcoal">No functions to estimate yet</h1>
        <p className="mt-2 text-sm text-slate">
          Add functions and pick vendors in your event plan — your estimate fills in here.
        </p>
        <Link
          href="/client/wedding"
          className="mt-5 inline-flex items-center gap-2 border border-gold-primary px-5 py-3 font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark transition-colors hover:bg-gold-primary hover:text-midnight"
        >
          Open event plan <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const visibleDays = model.days
    .map((d) => ({
      ...d,
      functions: d.functions.filter((f) =>
        filter === "all"
          ? true
          : filter === "confirmed"
            ? f.state === "locked"
            : f.state !== "locked"
      ),
    }))
    .filter((d) => d.functions.length > 0);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-5"
    >
      {/* Hero */}
      <motion.section
        variants={fade}
        className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
              Cost estimation
            </p>
            <div className="mt-2 font-display text-5xl leading-none text-ivory md:text-6xl">
              <AnimatedCounter target={model.projected} formatter={(v) => formatCurrency(v)} />
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ivory/70">
              Your projected total. We negotiate and lock the final price on every
              function — until then you see a live estimate from your picks.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <SplitStat icon={Lock} label="Confirmed by Elysian" value={lakh(model.confirmedTotal)} sub={`${model.lockedCount} locked`} gold />
              <SplitStat icon={Clock} label="Still estimated" value={lakh(model.estimateTotal)} sub={`${model.fnCount - model.lockedCount} pending`} />
              {model.gst > 0 ? (
                <SplitStat label="+ GST (18%)" value={lakh(model.gst)} sub="on confirmed" />
              ) : null}
            </div>
          </div>
          <ConfirmRing pct={model.confirmedPct} locked={model.lockedCount} total={model.fnCount} />
        </div>
      </motion.section>

      {/* How it works + breakdown bar */}
      <motion.section variants={fade} className="border border-charcoal/10 bg-ivory p-5">
        <div className="flex items-center justify-between">
          <p className={dashLabel}>Where it goes</p>
          <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
            {model.fnCount} functions
          </span>
        </div>
        <BreakdownBar functions={model.allFns} total={model.projected} />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          <Legend cls="bg-gold-primary" label="Confirmed (locked)" />
          <Legend cls="bg-gold-primary/40" label="Awaiting reveal" />
          <Legend cls="bg-charcoal/25" label="Estimate" />
        </div>
        {model.awaitingCount > 0 ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate">
            <Sparkles className="h-3.5 w-3.5 text-gold-dark" />
            {model.awaitingCount} {model.awaitingCount === 1 ? "function has" : "functions have"} a
            confirmed Elysian price — finish them to 100% to reveal it.
          </p>
        ) : null}
      </motion.section>

      {/* Filter */}
      <motion.div variants={fade} className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "All functions" },
            { key: "confirmed", label: `Confirmed (${model.lockedCount})` },
            { key: "estimate", label: `Estimates (${model.fnCount - model.lockedCount})` },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
              filter === f.key
                ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                : "border-charcoal/12 text-slate hover:border-gold-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Day sections */}
      {visibleDays.map((day) => (
        <motion.section key={day.id} variants={fade} className="border border-charcoal/10 bg-ivory">
          <div className="flex items-center justify-between border-b border-charcoal/8 p-4">
            <div>
              <p className="font-display text-lg text-charcoal">{day.name}</p>
              {day.date ? (
                <p className="text-xs text-slate">
                  {new Date(day.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-display text-xl text-charcoal">{formatCurrency(day.dayTotal)}</p>
              <p className="font-accent text-[9px] uppercase tracking-[0.14em] text-slate">
                {day.functions.length} {day.functions.length === 1 ? "function" : "functions"}
              </p>
            </div>
          </div>
          <div className="divide-y divide-charcoal/8">
            {day.functions.map((fn) => (
              <FunctionRow
                key={fn.eventId}
                fn={fn}
                open={open === fn.eventId}
                onToggle={() => setOpen(open === fn.eventId ? null : fn.eventId)}
              />
            ))}
          </div>
        </motion.section>
      ))}
    </motion.div>
  );
}

const fade = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Function row ───────────────────────────────────────────────────────────

function FunctionRow({ fn, open, onToggle }: { fn: FnRow; open: boolean; onToggle: () => void }) {
  const meta = STATE_META[fn.state];
  return (
    <div className={cn("transition-colors", open && "bg-cream/20")}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className={cn("h-9 w-1 shrink-0 rounded-full", meta.bar)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-heading text-sm text-charcoal">{fn.name}</p>
            <span className={cn("border px-1.5 py-0.5 font-accent text-[9px] uppercase tracking-[0.12em]", meta.chip)}>
              {meta.label}
            </span>
            {fn.startTime ? <span className="text-xs text-slate">{fn.startTime}</span> : null}
          </div>
          <p className="mt-0.5 text-xs text-slate">
            {fn.picks.length} {fn.picks.length === 1 ? "vendor" : "vendors"}
            {fn.state === "awaiting" ? " · price ready when you finish this function" : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {fn.state === "awaiting" ? (
            <span className="inline-flex items-center gap-1 font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
              <Lock className="h-3 w-3" /> Sealed
            </span>
          ) : (
            <p className={cn("font-display text-lg", fn.state === "locked" ? "text-gold-dark" : "text-charcoal")}>
              {formatCurrency(fn.display)}
            </p>
          )}
          {fn.state === "locked" ? (
            <p className="text-[10px] text-slate">+{formatCurrency(Math.round(fn.display * GST_RATE))} GST</p>
          ) : fn.state === "estimate" ? (
            <p className="font-accent text-[9px] uppercase tracking-[0.12em] text-slate">estimate</p>
          ) : null}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-4 pb-4">
              {fn.state === "locked" ? (
                <div className="flex items-center gap-2 border border-sage/30 bg-sage/8 px-3 py-2 text-xs text-charcoal">
                  <CheckCircle2 className="h-4 w-4 text-sage" />
                  Final price confirmed & locked by Elysian — {formatCurrency(fn.display)} + {formatCurrency(Math.round(fn.display * GST_RATE))} GST.
                </div>
              ) : fn.state === "awaiting" ? (
                <div className="flex items-center gap-2 border border-gold-primary/30 bg-gold-primary/8 px-3 py-2 text-xs text-charcoal">
                  <Lock className="h-4 w-4 text-gold-dark" />
                  Elysian has locked your final price. Finish this function to 100% to reveal it.
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-slate">
                  This is a live estimate from your picks. Elysian will negotiate and confirm the final price.
                </p>
              )}

              {fn.picks.length > 0 ? (
                <ul className="divide-y divide-charcoal/8 border border-charcoal/10">
                  {fn.picks.map((p, i) => {
                    const chip = STAGE_CHIP[p.stage] ?? STAGE_CHIP.selected;
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm text-charcoal">{p.vendorName}</p>
                          <p className="truncate text-xs text-slate">
                            {p.serviceName ?? p.categoryName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={cn("border px-1.5 py-0.5 font-accent text-[9px] uppercase tracking-[0.12em]", chip.cls)}>
                            {chip.label}
                          </span>
                          {fn.state !== "locked" ? (
                            <span className="font-heading text-xs text-slate">
                              ~{formatCurrency(p.estimatedCost)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="border border-dashed border-charcoal/12 px-3 py-3 text-center text-xs text-slate">
                  No vendors picked for this function yet.
                </p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const STATE_META: Record<FnState, { label: string; bar: string; chip: string }> = {
  locked: { label: "Confirmed", bar: "bg-gold-primary", chip: "border-gold-primary/40 bg-gold-primary/10 text-gold-dark" },
  awaiting: { label: "Sealed", bar: "bg-gold-primary/50", chip: "border-gold-primary/30 bg-gold-primary/5 text-gold-dark" },
  estimate: { label: "Estimate", bar: "bg-charcoal/25", chip: "border-charcoal/15 bg-charcoal/5 text-slate" },
};

// ─── Pieces ─────────────────────────────────────────────────────────────────

function SplitStat({
  icon: Icon,
  label,
  value,
  sub,
  gold,
}: {
  icon?: typeof Lock;
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1 font-accent text-[9px] uppercase tracking-[0.16em] text-ivory/55">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </p>
      <p className={cn("mt-0.5 font-display text-xl", gold ? "text-gold-primary" : "text-ivory")}>{value}</p>
      <p className="text-[10px] text-ivory/45">{sub}</p>
    </div>
  );
}

function ConfirmRing({ pct, locked, total }: { pct: number; locked: number; total: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#C9A96E"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl text-ivory">{pct}%</span>
        <span className="font-accent text-[8px] uppercase tracking-[0.14em] text-ivory/55">
          {locked}/{total} locked
        </span>
      </div>
    </div>
  );
}

function BreakdownBar({ functions, total }: { functions: FnRow[]; total: number }) {
  const segs = functions.filter((f) => f.display > 0);
  const colour = (s: FnState) =>
    s === "locked" ? "bg-gold-primary" : s === "awaiting" ? "bg-gold-primary/40" : "bg-charcoal/25";
  return (
    <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-charcoal/8">
      {segs.map((f, i) => (
        <motion.div
          key={f.eventId}
          title={`${f.name} · ${formatCurrency(f.display)}`}
          initial={{ width: 0 }}
          animate={{ width: `${(f.display / Math.max(total, 1)) * 100}%` }}
          transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          className={cn("h-full border-r border-ivory/50 last:border-r-0", colour(f.state))}
        />
      ))}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
      <span className={cn("h-2 w-2 rounded-full", cls)} />
      {label}
    </span>
  );
}
