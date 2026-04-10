"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
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

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8">
      <div className="h-48 border border-charcoal/8 bg-charcoal/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 border border-charcoal/8 bg-charcoal/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 h-72 border border-charcoal/8 bg-charcoal/5" />
        <div className="lg:col-span-2 h-72 border border-charcoal/8 bg-charcoal/5" />
      </div>
    </div>
  );
}

const quickActions = [
  { label: "Browse Vendors", href: "/client/vendors" },
  { label: "Manage Budget", href: "/client/budget" },
  { label: "Guest List", href: "/client/guests" },
  { label: "Messages", href: "/client/messages" },
  { label: "Timeline", href: "/client/timeline" },
  { label: "Mood Board", href: "/client/mood-board" },
];

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
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading || !data) return;
    if (data.needsOnboarding || data.needsProfile) router.replace("/client/onboarding");
  }, [loading, data, router]);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="mx-auto max-w-6xl border border-rose/20 bg-ivory p-6 text-charcoal">
      <p className="text-sm">{error}</p>
    </div>
  );
  if (!data || data.needsOnboarding || data.needsProfile) return <DashboardSkeleton />;

  const firstName = user?.firstName ?? "there";
  const { stats, tasks, recentNotifications, wedding } = data;
  const doneTasks = tasks.filter((t) => t.done).length;
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const weddingDate = wedding?.date ? new Date(wedding.date) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      {/* Hero — countdown + wedding identity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden border border-charcoal/8 bg-[radial-gradient(ellipse_at_top_right,rgba(201,169,110,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(201,169,110,0.06),transparent_40%)] p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-px w-1/2 bg-gradient-to-l from-transparent via-gold-primary/30 to-transparent" />
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className={dashLabel}>Welcome back</p>
            <h1 className="font-display mt-3 text-4xl font-semibold text-charcoal lg:text-5xl">
              {firstName}
            </h1>
            {wedding ? (
              <p className="font-heading mt-2 text-lg font-light text-slate">
                {wedding.name}
                {wedding.destinationName && (
                  <span className="text-gold-dark"> · {wedding.destinationName}</span>
                )}
              </p>
            ) : (
              <p className="font-heading mt-2 text-base text-slate">Complete onboarding to unlock your planning workspace.</p>
            )}

            {/* Quick actions */}
            <div className="mt-6 flex flex-wrap gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Countdown */}
          {stats.daysUntil > 0 && (
            <div className="flex flex-col items-center justify-center border border-gold-primary/20 bg-cream/40 px-8 py-6 text-center">
              <p className={dashLabel}>Days to go</p>
              <p className="font-display mt-2 text-6xl font-semibold text-charcoal lg:text-7xl">
                {stats.daysUntil}
              </p>
              {weddingDate && (
                <p className="font-heading mt-2 text-xs text-slate">
                  {weddingDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stat strip */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: "Budget Used", value: `${stats.budgetPercent}%`, sub: "of total budget", accent: stats.budgetPercent > 80 },
          { label: "Vendors Booked", value: stats.vendorsBooked, sub: "confirmed vendors" },
          { label: "Guests Confirmed", value: stats.guestsConfirmed, sub: "on your list" },
          { label: "Tasks Done", value: `${doneTasks} / ${tasks.length}`, sub: `${taskProgress}% complete` },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={staggerItem}
            className={cn(
              "border bg-ivory p-6 transition-colors hover:border-gold-primary/40",
              s.accent ? "border-gold-primary/40" : "border-charcoal/8"
            )}
          >
            <p className={dashLabel}>{s.label}</p>
            <p className="font-display mt-3 text-3xl font-semibold text-charcoal">{s.value}</p>
            <p className="font-heading mt-1 text-xs text-slate">{s.sub}</p>
            {s.label === "Budget Used" && (
              <div className="mt-3 h-1 border border-charcoal/10 bg-cream">
                <div
                  className={cn("h-full transition-all duration-700", stats.budgetPercent > 80 ? "bg-gold-primary" : "bg-gold-primary/60")}
                  style={{ width: `${Math.min(stats.budgetPercent, 100)}%` }}
                />
              </div>
            )}
            {s.label === "Tasks Done" && tasks.length > 0 && (
              <div className="mt-3 h-1 border border-charcoal/10 bg-cream">
                <div className="h-full bg-sage/60 transition-all duration-700" style={{ width: `${taskProgress}%` }} />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Tasks */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 space-y-6"
        >
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl text-charcoal">Upcoming Tasks</h3>
                <p className="font-heading mt-1 text-xs text-slate">{tasks.filter((t) => !t.done).length} remaining · {doneTasks} completed</p>
              </div>
              <Link href="/client/timeline" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>
                View all
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="border border-dashed border-charcoal/12 bg-cream/30 px-5 py-8 text-center">
                <p className="font-heading text-sm text-slate">No tasks yet.</p>
                <Link href="/client/timeline" className="mt-3 inline-block font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary">
                  Add your first task
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-charcoal/5">
                {tasks.slice(0, 6).map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center border transition-colors",
                        task.done ? "border-gold-primary/60 bg-gold-primary/10" : "border-charcoal/20"
                      )}>
                        {task.done && <div className="h-2 w-2 bg-gold-primary" />}
                      </div>
                      <span className={cn("font-heading text-sm truncate", task.done ? "text-slate line-through" : "text-charcoal")}>
                        {task.title}
                      </span>
                    </div>
                    <span className="flex-shrink-0 ml-4 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">{task.due}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Wedding summary */}
          {wedding && (
            <div className="border border-charcoal/8 bg-ivory p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-xl text-charcoal">Wedding Overview</h3>
                <Link href="/client/wedding" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>Manage</Link>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {[
                  { label: "Wedding name", value: wedding.name },
                  { label: "Destination", value: wedding.destinationName ?? "TBD" },
                  { label: "Status", value: wedding.status },
                  { label: "Wedding date", value: weddingDate?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) ?? "TBD" },
                  { label: "Days away", value: stats.daysUntil > 0 ? `${stats.daysUntil} days` : "Today!" },
                ].map((item) => (
                  <div key={item.label} className="border border-charcoal/8 bg-cream/30 p-4">
                    <p className={dashLabel}>{item.label}</p>
                    <p className="font-heading mt-2 text-sm text-charcoal">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right column */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Budget ring visual */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl text-charcoal">Budget</h3>
              <Link href="/client/budget" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>Details</Link>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-charcoal/8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.budgetPercent / 100)}`}
                    strokeLinecap="square"
                    className="text-gold-primary transition-all duration-700"
                  />
                </svg>
                <span className="font-display text-lg font-semibold text-charcoal">{stats.budgetPercent}%</span>
              </div>
              <div>
                <p className="font-heading text-sm text-charcoal">of budget allocated</p>
                <p className="font-heading mt-1 text-xs text-slate">
                  {100 - stats.budgetPercent}% remaining
                </p>
                <Link href="/client/budget" className="mt-3 inline-block font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary">
                  Manage budget
                </Link>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <h3 className="font-display mb-5 text-xl text-charcoal">Recent Activity</h3>
            {recentNotifications.length === 0 ? (
              <div className="border border-dashed border-charcoal/12 bg-cream/30 px-4 py-6 text-center">
                <p className="font-heading text-sm text-slate">No activity yet.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {recentNotifications.map((item) => (
                  <li key={item.id} className="border-l-2 border-gold-primary/25 pl-4">
                    <p className="font-heading text-sm leading-snug text-charcoal">{item.text}</p>
                    <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">{item.time}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Vendors shortcut */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl text-charcoal">Vendors</h3>
              <Link href="/client/vendors" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>Browse</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-charcoal/8 bg-cream/40 p-4 text-center">
                <p className="font-display text-2xl text-charcoal">{stats.vendorsBooked}</p>
                <p className={cn(dashLabel, "mt-1")}>Booked</p>
              </div>
              <Link href="/client/vendors" className="border border-charcoal/8 bg-cream/40 p-4 text-center transition-colors hover:border-gold-primary/40">
                <p className="font-display text-2xl text-gold-dark">+</p>
                <p className={cn(dashLabel, "mt-1")}>Add vendor</p>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
