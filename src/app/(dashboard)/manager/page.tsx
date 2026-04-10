"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ManagerDashboardData = {
  stats: {
    activeWeddings: number;
    pendingInquiries: number;
    confirmedBookings: number;
    vendorsAvailable: number;
  };
  recentInquiries: {
    id: string;
    name: string;
    email: string;
    destination: string | null;
    status: string;
    createdAt: string;
  }[];
  upcomingWeddings: {
    id: string;
    name: string;
    date: string | null;
    destination: string | null;
    status: string;
  }[];
  subtitle: string;
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8">
      <div className="h-40 border border-charcoal/8 bg-charcoal/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 border border-charcoal/8 bg-charcoal/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 h-80 border border-charcoal/8 bg-charcoal/5" />
        <div className="lg:col-span-2 h-80 border border-charcoal/8 bg-charcoal/5" />
      </div>
    </div>
  );
}

function inquiryStatusStyle(status: string) {
  return cn(
    statusBadgeBase,
    status === "NEW" && "border-gold-primary/60 text-gold-dark",
    status === "CONTACTED" && "border-sage/60 text-sage",
    status === "QUALIFIED" && "border-midnight/40 text-midnight",
    !["NEW", "CONTACTED", "QUALIFIED"].includes(status) && "border-charcoal/20 text-slate"
  );
}

const quickLinks = [
  { label: "Inquiries", href: "/manager/inquiries" },
  { label: "Weddings", href: "/manager/weddings" },
  { label: "Vendors", href: "/manager/vendors" },
  { label: "Configurator", href: "/manager/configurator" },
  { label: "Messages", href: "/manager/messages" },
];

const PIPELINE_STATUSES = [
  { key: "NEW", label: "New", color: "bg-gold-primary/50" },
  { key: "CONTACTED", label: "Contacted", color: "bg-sage/50" },
  { key: "QUALIFIED", label: "Qualified", color: "bg-midnight/30" },
  { key: "CLOSED", label: "Closed", color: "bg-charcoal/20" },
];

export default function ManagerDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/manager");
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

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="mx-auto max-w-6xl border border-rose/20 bg-ivory p-6 text-charcoal">
      <p className="text-sm">{error}</p>
    </div>
  );
  if (!data) return <DashboardSkeleton />;

  const firstName = user?.firstName ?? "there";
  const { stats, recentInquiries, upcomingWeddings } = data;

  const pipelineCounts = PIPELINE_STATUSES.map((s) => ({
    ...s,
    value: recentInquiries.filter((i) => i.status === s.key).length,
  }));
  const totalPipeline = pipelineCounts.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden border border-charcoal/8 bg-[radial-gradient(ellipse_at_top_right,rgba(201,169,110,0.1),transparent_50%)] p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-px w-1/2 bg-gradient-to-l from-transparent via-gold-primary/30 to-transparent" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className={dashLabel}>Operations</p>
            <h1 className="font-display mt-3 text-4xl font-semibold text-charcoal lg:text-5xl">
              {firstName}&apos;s Hub
            </h1>
            <p className="font-heading mt-2 text-base font-light text-slate">
              {data.subtitle}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {quickLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Inquiry highlight */}
          <div className="flex flex-col items-center justify-center border border-gold-primary/20 bg-cream/40 px-8 py-6 text-center min-w-[160px]">
            <p className={dashLabel}>Needs attention</p>
            <p className="font-display mt-2 text-5xl font-semibold text-charcoal lg:text-6xl">
              {stats.pendingInquiries}
            </p>
            <p className="font-heading mt-1 text-xs text-slate">open inquiries</p>
            {stats.pendingInquiries > 0 && (
              <Link
                href="/manager/inquiries"
                className="mt-3 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary"
              >
                Respond
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stat row */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Weddings", value: stats.activeWeddings, sub: "in planning", href: "/manager/weddings" },
          { label: "Pending Inquiries", value: stats.pendingInquiries, sub: "awaiting response", href: "/manager/inquiries", highlight: stats.pendingInquiries > 0 },
          { label: "Confirmed Bookings", value: stats.confirmedBookings, sub: "in pipeline", href: null },
          { label: "Verified Vendors", value: stats.vendorsAvailable, sub: "available", href: "/manager/vendors" },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={staggerItem}
            className={cn(
              "border bg-ivory p-6 transition-colors hover:border-gold-primary/40",
              s.highlight ? "border-gold-primary/40" : "border-charcoal/8"
            )}
          >
            <p className={dashLabel}>{s.label}</p>
            <p className="font-display mt-3 text-3xl font-semibold text-charcoal">{s.value}</p>
            <p className="font-heading mt-1 text-xs text-slate">{s.sub}</p>
            {s.href && (
              <Link href={s.href} className="mt-3 inline-block font-accent text-[10px] uppercase tracking-[0.15em] text-gold-primary">
                View
              </Link>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Inquiry pipeline */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-charcoal">Inquiry Pipeline</h3>
              <p className="font-heading mt-1 text-xs text-slate">{recentInquiries.length} recent inquiries</p>
            </div>
            <Link href="/manager/inquiries" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>
              View all
            </Link>
          </div>

          {/* Pipeline status bar */}
          <div className="mb-6 grid grid-cols-4 gap-3">
            {pipelineCounts.map((s) => (
              <div key={s.key} className="border border-charcoal/8 bg-cream/30 p-3 text-center">
                <p className={dashLabel}>{s.label}</p>
                <p className="font-display mt-1 text-xl text-charcoal">{s.value}</p>
                <div className="mt-2 h-1 bg-charcoal/8">
                  <div
                    className={cn("h-full transition-all duration-700", s.color)}
                    style={{ width: `${(s.value / totalPipeline) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {recentInquiries.length === 0 ? (
            <div className="border border-dashed border-charcoal/12 bg-cream/30 px-5 py-8 text-center">
              <p className="font-heading text-sm text-slate">No inquiries yet.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-charcoal/5">
              {recentInquiries.slice(0, 5).map((inq) => (
                <div key={inq.id} className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-medium text-charcoal">{inq.name}</p>
                    <p className="font-accent mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate truncate">
                      {inq.email}
                      {inq.destination && <span> · {inq.destination}</span>}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                    <span className="font-accent text-[10px] text-slate">
                      {new Date(inq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    <span className={inquiryStatusStyle(inq.status)}>{inq.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right column */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">

          {/* Upcoming weddings */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl text-charcoal">Upcoming Weddings</h3>
              <Link href="/manager/weddings" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>All</Link>
            </div>

            {upcomingWeddings.length === 0 ? (
              <div className="border border-dashed border-charcoal/12 bg-cream/30 px-4 py-6 text-center">
                <p className="font-heading text-sm text-slate">No upcoming weddings.</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-charcoal/5">
                {upcomingWeddings.map((w) => {
                  const d = w.date ? new Date(w.date) : null;
                  const day = d?.toLocaleDateString("en-IN", { day: "numeric" });
                  const mon = d?.toLocaleDateString("en-IN", { month: "short" });
                  return (
                    <div key={w.id} className="flex items-center gap-4 py-4">
                      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center border border-gold-primary/30 bg-cream/60">
                        {d ? (
                          <>
                            <span className="font-display text-base font-semibold text-gold-dark leading-none">{day}</span>
                            <span className="font-accent text-[9px] uppercase tracking-[0.1em] text-slate mt-0.5">{mon}</span>
                          </>
                        ) : (
                          <span className="font-accent text-[9px] uppercase tracking-[0.1em] text-slate">TBD</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-medium text-charcoal truncate">{w.name}</p>
                        <p className="font-accent mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate truncate">
                          {w.destination ?? "Destination TBD"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Configurator CTA */}
          <div className="border border-gold-primary/20 bg-[radial-gradient(ellipse_at_bottom_right,rgba(201,169,110,0.08),transparent_60%)] p-6">
            <p className={dashLabel}>Event Planning</p>
            <h3 className="font-display mt-2 text-xl text-charcoal">Event Configurator</h3>
            <p className="font-heading mt-2 text-sm text-slate">Build a custom event proposal for a client with real-time pricing and package selection.</p>
            <Link
              href="/manager/configurator"
              className="mt-4 inline-block font-accent border border-gold-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
            >
              Open configurator
            </Link>
          </div>

          {/* Operations metrics */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <p className={cn(dashLabel, "mb-4")}>Operations at a glance</p>
            <div className="space-y-3">
              {[
                { label: "Weddings in planning", value: stats.activeWeddings },
                { label: "Bookings confirmed", value: stats.confirmedBookings },
                { label: "Vendor network", value: stats.vendorsAvailable },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between border-b border-charcoal/5 pb-2 last:border-0">
                  <p className={dashLabel}>{m.label}</p>
                  <p className="font-display text-xl text-charcoal">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
