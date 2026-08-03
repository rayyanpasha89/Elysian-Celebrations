"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  IndianRupee,
  ListChecks,
  MapPin,
  ReceiptText,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { cn } from "@/lib/utils";

// ─── API payloads ───────────────────────────────────────────────────────────

type DashboardPayload = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    destinationName: string | null;
    status: string;
  } | null;
  stats: {
    daysUntil: number;
    budgetPercent: number;
    vendorsBooked: number;
    guestsConfirmed: number;
  };
  tasks: { id: string; title: string; due: string; done: boolean }[];
  recentNotifications: { id: string; text: string; time: string }[];
  needsOnboarding?: boolean;
  needsProfile?: boolean;
  subtitle?: string;
};
type GuestRow = {
  rsvp_status: "PENDING" | "CONFIRMED" | "DECLINED" | "MAYBE";
  plus_one: boolean;
};
type BookingStage = "selected" | "booked" | "confirmed";
type BudgetPayload = {
  eventPlanSpend: { totalEstimated: number; eventCount: number } | null;
  planLineItems: { stage: BookingStage; estimatedCost: number }[];
};
type SchedulePayload = {
  schedule: {
    id: string;
    name: string;
    date: string | null;
    events: { id: string; name: string; startTime: string | null }[];
  }[];
};

function formatLakh(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  return `₹${(n / 100000).toFixed(1)}L`;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function daysTo(date: string | null): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

const QUICK_ACTIONS = [
  { label: "Event plan", href: "/client/wedding" },
  { label: "Cost estimate", href: "/client/budget" },
  { label: "Guests", href: "/client/guests" },
  { label: "Run of show", href: "/client/timeline" },
  { label: "Vendors", href: "/client/vendors" },
  { label: "Messages", href: "/client/messages" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ClientCommandCenter() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [budget, setBudget] = useState<BudgetPayload | null>(null);
  const [schedule, setSchedule] = useState<SchedulePayload["schedule"]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setFailedSources([]);

      const getJson = async (url: string) => {
        const response = await fetch(url);
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(json?.error ?? `Failed to load ${url}`);
        }
        return json;
      };

      const [dashboardResult, guestsResult, budgetResult, timelineResult] =
        await Promise.allSettled([
          getJson("/api/dashboard/client"),
          getJson("/api/guests"),
          getJson("/api/budget"),
          getJson("/api/timeline"),
      ]);

      if (cancelled) return;

      if (dashboardResult.status === "rejected") {
        setDash(null);
        setLoadError(
          dashboardResult.reason instanceof Error
            ? dashboardResult.reason.message
            : "Could not load your command center"
        );
        setLoading(false);
        return;
      }

      const failures: string[] = [];
      setDash(dashboardResult.value as DashboardPayload);

      if (guestsResult.status === "fulfilled") {
        setGuests((guestsResult.value?.guests ?? []) as GuestRow[]);
      } else {
        failures.push("guests");
        setGuests([]);
      }

      if (budgetResult.status === "fulfilled") {
        const value = budgetResult.value;
        setBudget({
          eventPlanSpend: value?.eventPlanSpend ?? null,
          planLineItems: value?.planLineItems ?? [],
        });
      } else {
        failures.push("cost estimate");
        setBudget(null);
      }

      if (timelineResult.status === "fulfilled") {
        setSchedule(
          (timelineResult.value?.schedule ?? []) as SchedulePayload["schedule"]
        );
      } else {
        failures.push("event schedule");
        setSchedule([]);
      }

      setFailedSources(failures);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (loading || !dash) return;
    if (dash.needsOnboarding || dash.needsProfile) router.replace("/client/onboarding");
  }, [loading, dash, router]);

  const agg = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.rsvp_status === "CONFIRMED");
    const pending = guests.filter((g) => g.rsvp_status === "PENDING").length;
    const heads = (rows: GuestRow[]) => rows.reduce((s, g) => s + 1 + (g.plus_one ? 1 : 0), 0);

    const picks = budget?.planLineItems ?? [];
    const estimated =
      budget?.eventPlanSpend?.totalEstimated ??
      (budget ? picks.reduce((sum, pick) => sum + pick.estimatedCost, 0) : null);
    const bookings = {
      total: picks.length,
      selected: picks.filter((p) => p.stage === "selected").length,
      booked: picks.filter((p) => p.stage === "booked").length,
      confirmed: picks.filter((p) => p.stage === "confirmed").length,
      value: picks.reduce((s, p) => s + p.estimatedCost, 0),
    };

    const events = schedule.flatMap((day) =>
      day.events.map((e) => ({ ...e, dayName: day.name, date: day.date }))
    );
    const upcoming = events
      .filter((e) => e.date && (daysTo(e.date) ?? -1) >= 0)
      .sort((a, b) => (a.date! < b.date! ? -1 : 1));
    const nextFn = upcoming[0] ?? events[0] ?? null;

    return {
      guests: {
        total,
        confirmed: confirmed.length,
        pending,
        declined: guests.filter((g) => g.rsvp_status === "DECLINED").length,
        confirmedHeads: heads(confirmed),
        invitedHeads: heads(guests),
        respondedPct:
          total > 0
            ? Math.round((guests.filter((g) => g.rsvp_status !== "PENDING").length / total) * 100)
            : 0,
      },
      budget: { estimated },
      bookings,
      plan: {
        days: schedule.length,
        events: events.length,
      },
      nextFn,
    };
  }, [guests, budget, schedule]);

  const attention = useMemo(() => {
    const a: {
      id: string;
      severity: "high" | "medium" | "info";
      title: string;
      detail: string;
      href: string;
      cta: string;
    }[] = [];
    if (!dash) return a;
    if (!failedSources.includes("event schedule") && agg.plan.events === 0) {
      a.push({
        id: "no-events",
        severity: "high",
        title: "No functions planned yet",
        detail: "Add your celebration days and functions to unlock the rest of the suite.",
        href: "/client/wedding",
        cta: "Open planner",
      });
    }
    if (agg.guests.pending > 0) {
      a.push({
        id: "rsvp",
        severity: "medium",
        title: `${agg.guests.pending} ${agg.guests.pending === 1 ? "guest hasn't" : "guests haven't"} replied`,
        detail: `${agg.guests.respondedPct}% of your list has responded so far.`,
        href: "/client/guests",
        cta: "Chase RSVPs",
      });
    }
    if (
      !failedSources.includes("cost estimate") &&
      agg.bookings.confirmed === 0 &&
      agg.plan.events > 0
    ) {
      a.push({
        id: "vendors",
        severity: "medium",
        title:
          agg.bookings.total === 0
            ? "No vendors selected yet"
            : `${agg.bookings.total} vendor ${agg.bookings.total === 1 ? "pick" : "picks"}, none confirmed`,
        detail:
          agg.bookings.total === 0
            ? "Shortlist caterers, decor and photography and add them to your functions."
            : "Confirm your selected vendors to lock in their pricing.",
        href: "/client/vendors",
        cta: "Open vendors",
      });
    }
    const nextDays = agg.nextFn?.date ? daysTo(agg.nextFn.date) : null;
    if (nextDays != null && nextDays >= 0 && nextDays <= 21) {
      a.push({
        id: "next-fn",
        severity: "info",
        title: `${agg.nextFn!.name} in ${nextDays} ${nextDays === 1 ? "day" : "days"}`,
        detail: "Lock the run of show and confirm vendor call-times.",
        href: "/client/timeline",
        cta: "Open run of show",
      });
    }
    const order = { high: 0, medium: 1, info: 2 };
    return a.sort((x, y) => order[x.severity] - order[y.severity]);
  }, [dash, agg, failedSources]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading your command center...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <section className="border border-rose/25 bg-rose/5 p-6 md:p-8">
        <p className={dashLabel}>Command center unavailable</p>
        <h1 className="mt-2 font-display text-3xl text-charcoal">
          Your planning data could not be loaded.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          Nothing has been reset. Try the connection again to restore the live
          dashboard.
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="mt-5 border border-charcoal bg-charcoal px-5 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-ebony"
        >
          Retry dashboard
        </button>
      </section>
    );
  }
  if (!dash || dash.needsOnboarding || dash.needsProfile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Redirecting to setup...</p>
      </div>
    );
  }

  const firstName = user?.firstName ?? "there";
  const wedding = dash.wedding;
  const dday = wedding?.date ? daysTo(wedding.date) : dash.stats.daysUntil;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {failedSources.length > 0 ? (
        <div className="flex flex-col gap-3 border border-gold-primary/30 bg-gold-primary/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-charcoal">
            Some live sections could not load: {failedSources.join(", ")}. Their
            cards are marked unavailable rather than shown as zero.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="shrink-0 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark underline underline-offset-4"
          >
            Retry sections
          </button>
        </div>
      ) : null}
      {/* Hero */}
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-2 font-display text-3xl text-ivory md:text-4xl">
              {wedding?.name ?? "Your celebration"}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ivory/70">
              {wedding?.destinationName ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gold-primary" />
                  {wedding.destinationName}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold-primary" />
                {failedSources.includes("event schedule")
                  ? "Plan size temporarily unavailable"
                  : `${agg.plan.events} functions · ${agg.plan.days} days`}
              </span>
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div className="text-right">
              <p className="font-display text-6xl leading-none text-gold-primary">
                {dday != null ? Math.max(0, dday) : "—"}
              </p>
              <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.18em] text-ivory/60">
                days to go
              </p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 border-t border-ivory/10 p-3 md:px-8">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="font-accent border border-ivory/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-ivory/80 transition-colors hover:border-gold-primary hover:text-gold-primary"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Attention now */}
      <motion.section variants={fadeUp}>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gold-dark" />
          <h2 className={dashLabel}>Attention now</h2>
        </div>
        {attention.length === 0 ? (
          <div className="flex items-center gap-3 border border-sage/30 bg-sage/8 p-5">
            <CheckCircle2 className="h-6 w-6 text-sage" />
            <div>
              <p className="font-display text-lg text-charcoal">You&apos;re in great shape</p>
              <p className="text-sm text-slate">
                Nothing needs your attention right now — enjoy the calm.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attention.map((item) => (
              <AttentionCard key={item.id} {...item} />
            ))}
          </div>
        )}
      </motion.section>

      {/* Module health */}
      <motion.section variants={fadeUp} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          href="/client/wedding"
          icon={ListChecks}
          label="Event plan"
          value={
            failedSources.includes("event schedule")
              ? "—"
              : `${agg.plan.events}`
          }
          unit={
            failedSources.includes("event schedule")
              ? "temporarily unavailable"
              : "functions"
          }
          footer={
            failedSources.includes("event schedule")
              ? "Retry to restore the plan summary"
              : `Across ${agg.plan.days} ${agg.plan.days === 1 ? "day" : "days"}`
          }
        />
        <ModuleCard
          href="/client/budget"
          icon={Wallet}
          label="Cost estimate"
          value={
            agg.budget.estimated == null
              ? "—"
              : formatLakh(agg.budget.estimated)
          }
          unit={agg.budget.estimated == null ? "temporarily unavailable" : "estimated"}
          footer={
            failedSources.includes("cost estimate")
              ? "Retry to restore live pricing"
              : agg.bookings.total > 0
              ? `${agg.bookings.total} vendor ${agg.bookings.total === 1 ? "pick" : "picks"}`
              : "Pricing appears as the plan takes shape"
          }
        />
        <ModuleCard
          href="/client/guests"
          icon={Users}
          label="Guests"
          value={failedSources.includes("guests") ? "—" : `${agg.guests.confirmedHeads}`}
          unit={
            failedSources.includes("guests")
              ? "temporarily unavailable"
              : `of ${agg.guests.invitedHeads} heads`
          }
          footer={
            failedSources.includes("guests")
              ? "Retry to restore the guest list"
              : `${agg.guests.confirmed} confirmed · ${agg.guests.pending} pending`
          }
          tone={
            failedSources.includes("guests")
              ? undefined
              : agg.guests.pending > 0
                ? "warn"
                : "good"
          }
          bar={
            failedSources.includes("guests")
              ? undefined
              : { pct: agg.guests.respondedPct }
          }
        />
        <ModuleCard
          href="/client/timeline"
          icon={CalendarClock}
          label="Next up"
          value={
            failedSources.includes("event schedule")
              ? "—"
              : agg.nextFn?.name ?? "—"
          }
          unit={
            failedSources.includes("event schedule")
              ? "temporarily unavailable"
              : agg.nextFn?.dayName ?? "Run of show"
          }
          footer={(() => {
            if (failedSources.includes("event schedule")) {
              return "Retry to restore the schedule";
            }
            const d = daysTo(agg.nextFn?.date ?? null);
            if (d == null) return "Open run of show";
            if (d <= 0) return "Happening now";
            return `In ${d} ${d === 1 ? "day" : "days"}`;
          })()}
          valueSmall
        />
      </motion.section>

      {/* Vendor bookings status */}
      <motion.section variants={fadeUp} className="border border-charcoal/10 bg-ivory">
        <div className="flex items-center justify-between border-b border-charcoal/8 p-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-gold-dark" />
            <h2 className={dashLabel}>Vendor bookings</h2>
          </div>
          <Link
            href="/client/budget"
            className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate transition-colors hover:text-gold-dark"
          >
            View costs
          </Link>
        </div>
        <div className="grid grid-cols-3 divide-x divide-charcoal/8">
          {(
            [
              { key: "confirmed", label: "Confirmed", n: agg.bookings.confirmed, dot: "bg-sage" },
              { key: "booked", label: "Booked", n: agg.bookings.booked, dot: "bg-gold-primary" },
              { key: "selected", label: "Selected", n: agg.bookings.selected, dot: "bg-slate/50" },
            ] as const
          ).map((stage) => (
            <div key={stage.key} className="p-4 text-center">
              <p className="font-display text-3xl text-charcoal">{stage.n}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                <span className={cn("h-1.5 w-1.5 rounded-full", stage.dot)} />
                {stage.label}
              </p>
            </div>
          ))}
        </div>
        {agg.bookings.total === 0 ? (
          <p className="border-t border-charcoal/8 px-4 py-3 text-xs text-slate">
            Pick vendors on your functions and they appear here as selected →
            booked → confirmed.
          </p>
        ) : null}
      </motion.section>

      {/* This week + activity */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <motion.section variants={fadeUp} className="border border-charcoal/10 bg-ivory">
          <div className="flex items-center justify-between border-b border-charcoal/8 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold-dark" />
              <h2 className={dashLabel}>What needs doing</h2>
            </div>
            <Link
              href="/client/timeline"
              className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate transition-colors hover:text-gold-dark"
            >
              View all
            </Link>
          </div>
          {dash.tasks.length === 0 ? (
            <p className="p-6 text-sm text-slate">
              No open tasks. Add run-of-show moments and they&apos;ll show up here.
            </p>
          ) : (
            <ul className="divide-y divide-charcoal/8">
              {dash.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 p-4">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      task.done ? "bg-sage" : "bg-gold-primary"
                    )}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate font-heading text-sm",
                      task.done ? "text-slate line-through" : "text-charcoal"
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="shrink-0 font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
                    {task.due}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section variants={fadeUp} className="border border-charcoal/10 bg-ivory">
          <div className="flex items-center gap-2 border-b border-charcoal/8 p-4">
            <IndianRupee className="h-4 w-4 text-gold-dark" />
            <h2 className={dashLabel}>Recent activity</h2>
          </div>
          {dash.recentNotifications.length === 0 ? (
            <p className="p-6 text-sm text-slate">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-charcoal/8">
              {dash.recentNotifications.map((n) => (
                <li key={n.id} className="p-4">
                  <p className="text-sm leading-snug text-charcoal">{n.text}</p>
                  <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
                    {n.time}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

function AttentionCard({
  severity,
  title,
  detail,
  href,
  cta,
}: {
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  const tone =
    severity === "high"
      ? "border-rose/40 bg-rose/[0.06]"
      : severity === "medium"
        ? "border-gold-primary/45 bg-gold-primary/[0.06]"
        : "border-charcoal/12 bg-cream/30";
  const dot =
    severity === "high" ? "bg-rose" : severity === "medium" ? "bg-gold-primary" : "bg-slate/50";
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(51,61,41,0.08)]",
        tone
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          <p className="font-display text-base leading-tight text-charcoal">{title}</p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate">{detail}</p>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
}

function ModuleCard({
  href,
  icon: Icon,
  label,
  value,
  unit,
  footer,
  tone = "neutral",
  bar,
  valueSmall,
}: {
  href: string;
  icon: typeof Wallet;
  label: string;
  value: string;
  unit: string;
  footer: string;
  tone?: "neutral" | "good" | "warn";
  bar?: { pct: number };
  valueSmall?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-charcoal/10 bg-ivory p-4 transition-all hover:-translate-y-0.5 hover:border-gold-primary/40 hover:shadow-[0_14px_36px_rgba(51,61,41,0.07)]"
    >
      <div className="flex items-center justify-between">
        <p className={dashLabel}>{label}</p>
        <Icon className="h-4 w-4 text-gold-dark" />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-charcoal",
            valueSmall ? "truncate text-lg" : "text-3xl"
          )}
        >
          {value}
        </span>
        <span className="truncate font-heading text-xs text-slate">{unit}</span>
      </div>
      {bar ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "warn" ? "bg-rose" : tone === "good" ? "bg-sage" : "bg-gold-primary"
            )}
            style={{ width: `${Math.min(100, bar.pct)}%` }}
          />
        </div>
      ) : null}
      <p
        className={cn(
          "mt-2 font-accent text-[10px] uppercase tracking-[0.12em]",
          tone === "warn" ? "text-rose" : tone === "good" ? "text-sage" : "text-slate"
        )}
      >
        {footer}
      </p>
    </Link>
  );
}
