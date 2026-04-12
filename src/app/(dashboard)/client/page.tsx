"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ClientDashboardPayload = {
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

const quickActions = [
  { label: "Wedding plan", href: "/client/wedding" },
  { label: "Vendors", href: "/client/vendors" },
  { label: "Guests", href: "/client/guests" },
  { label: "Timeline", href: "/client/timeline" },
  { label: "Bookings", href: "/client/bookings" },
  { label: "Messages", href: "/client/messages" },
  { label: "Mood board", href: "/client/mood-board" },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="border border-charcoal/8 bg-cream/40 p-6">
        <div className="h-3 w-24 bg-charcoal/10" />
        <div className="mt-4 h-10 max-w-xs bg-charcoal/10" />
        <div className="mt-3 h-4 max-w-lg bg-charcoal/10" />
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 border border-charcoal/8 bg-ivory/50" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 border border-charcoal/8 bg-ivory/80" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 h-72 border border-charcoal/8 bg-ivory/50" />
        <div className="lg:col-span-2 h-72 border border-charcoal/8 bg-ivory/50" />
      </div>
    </div>
  );
}

const actionLinkClass =
  "font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark";

const sectionEyebrowClass =
  "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

export default function ClientDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/client");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !data) return;
    if (data.needsOnboarding || data.needsProfile)
      router.replace("/client/onboarding");
  }, [loading, data, router]);

  if (loading) return <DashboardSkeleton />;
  if (error)
    return (
      <div className="border border-charcoal/8 bg-ivory p-8">
        <p className={sectionEyebrowClass}>Dashboard</p>
        <h1 className="mt-2 font-display text-2xl text-charcoal">
          Something went wrong
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          {error}
        </p>
      </div>
    );
  if (!data || data.needsOnboarding || data.needsProfile)
    return <DashboardSkeleton />;

  const firstName = user?.firstName ?? "there";
  const { stats, tasks, recentNotifications, wedding } = data;
  const doneTasks = tasks.filter((t) => t.done).length;
  const taskProgress =
    tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const weddingDate = wedding?.date ? new Date(wedding.date) : null;

  return (
    <div className="space-y-6">
      {/* Strategy header — aligned with /client/budget top strip */}
      <div className="border border-charcoal/8 bg-cream/40 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className={sectionEyebrowClass}>Planning hub</p>
            <h1 className="mt-2 font-display text-3xl text-charcoal md:text-4xl">
              {firstName}
            </h1>
            {wedding ? (
              <p className="font-heading mt-2 text-sm text-slate">
                <span className="text-charcoal">{wedding.name}</span>
                {wedding.destinationName ? (
                  <span className="text-gold-dark">
                    {" "}
                    · {wedding.destinationName}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="font-heading mt-2 text-sm text-slate">
                Complete onboarding to unlock your full workspace.
              </p>
            )}
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
              This is your command center—jump into the budget planner, day-by-day
              wedding plan, vendors, and guest flow from one place. Shortcuts below
              mirror how the budget screen keeps tools one click away.
            </p>
          </div>

          <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:w-[min(100%,380px)]">
            {stats.daysUntil > 0 ? (
              <div className="border border-charcoal/8 bg-ivory/80 p-4 sm:col-span-2">
                <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                  Days to go
                </p>
                <p className="mt-2 font-display text-4xl text-charcoal xl:text-5xl">
                  {stats.daysUntil}
                </p>
                {weddingDate ? (
                  <p className="mt-2 font-heading text-xs text-slate">
                    {weddingDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="border border-charcoal/8 bg-ivory/80 p-4 sm:col-span-2">
                <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                  Countdown
                </p>
                <p className="mt-2 font-display text-xl text-charcoal">
                  Set your date in onboarding or the wedding plan.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/client/budget"
            className="font-accent inline-flex items-center justify-center border border-gold-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-gold-primary transition-all duration-500 hover:bg-gold-primary hover:text-midnight"
          >
            Open budget planner
          </Link>
          <Link href="/client/wedding" className={actionLinkClass}>
            Edit wedding plan
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-charcoal/8 pt-5">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className={actionLinkClass}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Quick stats — same card language as budget QuickStat */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardQuickStat
          label="Budget allocated"
          value={`${stats.budgetPercent}%`}
          hint="Of your total budget cap"
          tone={stats.budgetPercent > 80 ? "warning" : "neutral"}
          progress={Math.min(stats.budgetPercent, 100)}
          progressClassName={
            stats.budgetPercent > 80 ? "bg-gold-primary" : "bg-gold-primary/60"
          }
        />
        <DashboardQuickStat
          label="Vendors booked"
          value={stats.vendorsBooked}
          hint="Confirmed on your plan"
        />
        <DashboardQuickStat
          label="Guests confirmed"
          value={stats.guestsConfirmed}
          hint="On your primary list"
        />
        <DashboardQuickStat
          label="Tasks progress"
          value={`${doneTasks} / ${tasks.length}`}
          hint={`${taskProgress}% complete`}
          tone={taskProgress === 100 ? "healthy" : "neutral"}
          progress={tasks.length > 0 ? taskProgress : undefined}
          progressClassName="bg-sage/60"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className={sectionEyebrowClass}>Timeline</p>
                <h2 className="mt-2 font-display text-xl text-charcoal">
                  Upcoming tasks
                </h2>
                <p className="font-heading mt-1 text-xs text-slate">
                  {tasks.filter((t) => !t.done).length} remaining · {doneTasks}{" "}
                  completed
                </p>
              </div>
              <Link
                href="/client/timeline"
                className={cn(dashLabel, "shrink-0 hover:text-gold-dark")}
              >
                View all
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="border border-dashed border-charcoal/12 bg-cream/30 px-5 py-8 text-center">
                <p className="font-heading text-sm text-slate">No tasks yet.</p>
                <Link
                  href="/client/timeline"
                  className="mt-3 inline-block font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary"
                >
                  Add your first task
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-charcoal/5">
                {tasks.slice(0, 6).map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
                          task.done
                            ? "border-gold-primary/60 bg-gold-primary/10"
                            : "border-charcoal/20"
                        )}
                      >
                        {task.done && (
                          <div className="h-2 w-2 bg-gold-primary" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "truncate font-heading text-sm",
                          task.done
                            ? "text-slate line-through"
                            : "text-charcoal"
                        )}
                      >
                        {task.title}
                      </span>
                    </div>
                    <span className="ml-4 shrink-0 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                      {task.due}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {wedding ? (
            <div className="border border-charcoal/8 bg-ivory p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className={sectionEyebrowClass}>Wedding operating plan</p>
                  <h2 className="mt-2 font-display text-xl text-charcoal">
                    Overview
                  </h2>
                </div>
                <Link
                  href="/client/wedding"
                  className={cn(dashLabel, "shrink-0 hover:text-gold-dark")}
                >
                  Manage
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {[
                  { label: "Wedding name", value: wedding.name },
                  {
                    label: "Destination",
                    value: wedding.destinationName ?? "TBD",
                  },
                  { label: "Status", value: wedding.status },
                  {
                    label: "Wedding date",
                    value:
                      weddingDate?.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }) ?? "TBD",
                  },
                  {
                    label: "Days away",
                    value:
                      stats.daysUntil > 0
                        ? `${stats.daysUntil} days`
                        : "Today or TBD",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border border-charcoal/8 bg-cream/30 px-4 py-3"
                  >
                    <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                      {item.label}
                    </p>
                    <p className="font-heading mt-2 text-sm text-charcoal">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className={sectionEyebrowClass}>Investment plan</p>
                <h2 className="mt-2 font-display text-xl text-charcoal">
                  Budget at a glance
                </h2>
              </div>
              <Link
                href="/client/budget"
                className={cn(dashLabel, "shrink-0 hover:text-gold-dark")}
              >
                Details
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-charcoal/8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.budgetPercent / 100)}`}
                    strokeLinecap="square"
                    className="text-gold-primary transition-all duration-700"
                  />
                </svg>
                <span className="font-display text-lg font-semibold text-charcoal">
                  {stats.budgetPercent}%
                </span>
              </div>
              <div>
                <p className="font-heading text-sm text-charcoal">
                  Of budget allocated to categories
                </p>
                <p className="font-heading mt-1 text-xs text-slate">
                  {100 - stats.budgetPercent}% headroom in the planner
                </p>
                <Link
                  href="/client/budget"
                  className="mt-4 inline-flex font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary"
                >
                  Manage budget →
                </Link>
              </div>
            </div>
          </div>

          <div className="border border-charcoal/8 bg-ivory p-6">
            <p className={sectionEyebrowClass}>Activity</p>
            <h2 className="mt-2 font-display text-xl text-charcoal">
              Recent updates
            </h2>
            <div className="mt-5">
              {recentNotifications.length === 0 ? (
                <div className="border border-dashed border-charcoal/12 bg-cream/30 px-4 py-6 text-center">
                  <p className="font-heading text-sm text-slate">
                    No activity yet.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {recentNotifications.map((item) => (
                    <li
                      key={item.id}
                      className="border-l-2 border-gold-primary/25 pl-4"
                    >
                      <p className="font-heading text-sm leading-snug text-charcoal">
                        {item.text}
                      </p>
                      <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                        {item.time}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className={sectionEyebrowClass}>Suppliers</p>
                <h2 className="mt-2 font-display text-xl text-charcoal">
                  Vendors
                </h2>
              </div>
              <Link
                href="/client/vendors"
                className={cn(dashLabel, "shrink-0 hover:text-gold-dark")}
              >
                Browse
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-charcoal/8 bg-cream/40 p-4 text-center">
                <p className="font-display text-2xl text-charcoal">
                  {stats.vendorsBooked}
                </p>
                <p className={cn(dashLabel, "mt-1")}>Booked</p>
              </div>
              <Link
                href="/client/vendors"
                className="border border-charcoal/8 bg-cream/40 p-4 text-center transition-colors hover:border-gold-primary/40"
              >
                <p className="font-display text-2xl text-gold-dark">+</p>
                <p className={cn(dashLabel, "mt-1")}>Add vendor</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardQuickStat({
  label,
  value,
  hint,
  tone = "neutral",
  progress,
  progressClassName = "bg-gold-primary/60",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "warning" | "healthy";
  progress?: number;
  progressClassName?: string;
}) {
  const display = typeof value === "number" ? String(value) : value;
  return (
    <div className="border border-charcoal/8 bg-ivory/80 p-4">
      <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-xl",
          tone === "warning" && "text-gold-dark",
          tone === "healthy" && "text-sage",
          tone === "neutral" && "text-charcoal"
        )}
      >
        {display}
      </p>
      <p className="mt-1 text-xs text-slate">{hint}</p>
      {progress !== undefined ? (
        <div className="mt-3 h-1 border border-charcoal/10 bg-cream">
          <div
            className={cn("h-full transition-all duration-700", progressClassName)}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
