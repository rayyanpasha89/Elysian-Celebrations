"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type VendorDashboardPayload = {
  vendor: { id: string; businessName: string; slug: string; isVerified: boolean } | null;
  stats: {
    totalBookings: number;
    pendingInquiries: number;
    confirmedBookings: number;
    avgRating: number;
    revenueMonth: number;
    profileViews: number;
  };
  pendingInquiries: { id: string; couple: string; destination: string; date: string; service: string }[];
  upcomingEvents: { couple: string; event: string; date: string; location: string }[];
  needsOnboarding?: boolean;
  subtitle?: string;
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 border border-charcoal/8 bg-charcoal/5" />
        <div className="h-80 border border-charcoal/8 bg-charcoal/5" />
      </div>
    </div>
  );
}

function formatRevenue(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

const quickLinks = [
  { label: "Bookings", href: "/vendor/bookings" },
  { label: "Messages", href: "/vendor/messages" },
  { label: "Services", href: "/vendor/services" },
  { label: "Analytics", href: "/vendor/analytics" },
  { label: "Edit Profile", href: "/vendor/profile" },
];

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VendorDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/vendor");
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

  const { stats, pendingInquiries, upcomingEvents, vendor } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      {/* Onboarding banner */}
      {data.needsOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gold-primary/40 bg-cream/60 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-base font-semibold text-charcoal">Complete your vendor profile</p>
              <p className="font-heading mt-1 text-sm text-slate">Add your business name, category, and bio so couples can find you.</p>
            </div>
            <Link href="/vendor/profile" className="flex-shrink-0 font-accent border border-gold-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight">
              Complete profile
            </Link>
          </div>
        </motion.div>
      )}

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
            <p className={dashLabel}>Vendor Portal</p>
            <h1 className="font-display mt-3 text-4xl font-semibold text-charcoal lg:text-5xl">
              {vendor?.businessName ?? "Your Studio"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {vendor?.isVerified ? (
                <span className={cn(statusBadgeBase, "border-sage/70 text-sage")}>Verified</span>
              ) : (
                <span className={cn(statusBadgeBase, "border-gold-primary/60 text-gold-dark")}>Pending verification</span>
              )}
              <span className="font-heading text-sm text-slate">{data.subtitle ?? "Here's your business snapshot."}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {quickLinks.map((l) => (
                <Link key={l.href} href={l.href} className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Revenue highlight */}
          <div className="flex flex-col items-center justify-center border border-gold-primary/20 bg-cream/40 px-8 py-6 text-center">
            <p className={dashLabel}>Revenue this month</p>
            <p className="font-display mt-2 text-4xl font-semibold text-charcoal lg:text-5xl">
              {formatRevenue(stats.revenueMonth)}
            </p>
            <p className="font-heading mt-1 text-xs text-slate">{stats.confirmedBookings} confirmed booking{stats.confirmedBookings !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Bookings", value: stats.totalBookings, sub: "all time" },
          { label: "Pending Inquiries", value: stats.pendingInquiries, sub: "awaiting response", highlight: stats.pendingInquiries > 0 },
          { label: "Profile Views", value: stats.profileViews, sub: "this month" },
          { label: "Avg Rating", value: `${stats.avgRating.toFixed(1)} / 5`, sub: "from reviews" },
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
            {s.highlight && (
              <Link href="/vendor/bookings" className="mt-3 inline-block font-accent text-[10px] uppercase tracking-[0.15em] text-gold-primary">
                Respond now
              </Link>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Pending inquiries */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="border border-charcoal/8 bg-ivory p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-charcoal">New Inquiries</h3>
              <p className="font-heading mt-1 text-xs text-slate">{pendingInquiries.length} pending response</p>
            </div>
            <Link href="/vendor/bookings" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>View all</Link>
          </div>

          {pendingInquiries.length === 0 ? (
            <div className="border border-dashed border-charcoal/12 bg-cream/30 px-5 py-8 text-center">
              <p className="font-heading text-sm text-slate">No pending inquiries.</p>
              <p className="font-heading mt-1 text-xs text-slate/60">New bookings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-charcoal/5">
              {pendingInquiries.map((inq) => (
                <div key={inq.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-heading text-sm font-medium text-charcoal">{inq.couple}</p>
                    <p className="font-accent mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate">
                      {inq.destination || "—"} · {inq.service}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={dashLabel}>{inq.date}</p>
                    <Link href="/vendor/bookings" className="mt-1 inline-block font-accent text-[10px] uppercase tracking-[0.15em] text-gold-primary">
                      Respond
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming events */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="border border-charcoal/8 bg-ivory p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-charcoal">Upcoming Events</h3>
              <p className="font-heading mt-1 text-xs text-slate">{upcomingEvents.length} confirmed event{upcomingEvents.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/vendor/bookings" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>Calendar</Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="border border-dashed border-charcoal/12 bg-cream/30 px-5 py-8 text-center">
              <p className="font-heading text-sm text-slate">No upcoming events.</p>
              <p className="font-heading mt-1 text-xs text-slate/60">Confirmed bookings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-charcoal/5">
              {upcomingEvents.map((evt, i) => {
                const parts = evt.date.trim().split(/\s+/);
                return (
                  <div key={i} className="flex items-center gap-5 py-4">
                    <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center border border-gold-primary/30 bg-cream/60">
                      <span className="font-display text-base font-semibold text-gold-dark leading-none">{parts[0]}</span>
                      <span className="font-accent text-[9px] uppercase tracking-[0.1em] text-slate mt-0.5">{parts.slice(1).join(" ")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-medium text-charcoal truncate">{evt.couple}</p>
                      <p className="font-accent mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate truncate">{evt.event}</p>
                    </div>
                    <span className="flex-shrink-0 font-heading text-xs text-slate">{evt.location}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Performance metrics */}
          <div className="mt-6 border-t border-charcoal/8 pt-6">
            <p className={cn(dashLabel, "mb-4")}>Performance</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Bookings", value: stats.totalBookings },
                { label: "Views", value: stats.profileViews },
                { label: "Rating", value: `${stats.avgRating.toFixed(1)}★` },
              ].map((m) => (
                <div key={m.label} className="border border-charcoal/8 bg-cream/40 p-3 text-center">
                  <p className="font-display text-xl text-charcoal">{m.value}</p>
                  <p className={cn(dashLabel, "mt-1")}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
