"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type AdminDashboardPayload = {
  usersByRole: { client: number; vendor: number; admin: number };
  weddingsCount: number;
  bookingsByStatus: Record<string, number>;
  newContactInquiries: number;
  pendingVendors: { id: string; name: string; category: string; date: string }[];
  pendingVendorCount: number;
  recentContactInquiries: {
    id: string; name: string; email: string;
    destination: string | null; status: string; createdAt: string; preview: string;
  }[];
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
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 h-72 border border-charcoal/8 bg-charcoal/5" />
        <div className="lg:col-span-2 h-72 border border-charcoal/8 bg-charcoal/5" />
      </div>
    </div>
  );
}

const quickLinks = [
  { label: "All Vendors", href: "/admin/vendors" },
  { label: "All Clients", href: "/admin/clients" },
  { label: "Inquiries", href: "/admin/inquiries" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Users", href: "/admin/users" },
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/admin");
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

  const totalUsers = data.usersByRole.client + data.usersByRole.vendor + (data.usersByRole.admin ?? 0);
  const activeBookings = (data.bookingsByStatus.CONFIRMED ?? 0) + (data.bookingsByStatus.DEPOSIT_PAID ?? 0) + (data.bookingsByStatus.INQUIRY ?? 0);
  const totalBookings = Object.values(data.bookingsByStatus).reduce((a, b) => a + b, 0);

  const bookingStatuses = [
    { label: "Inquiry", value: data.bookingsByStatus.INQUIRY ?? 0, color: "bg-gold-primary/50" },
    { label: "Confirmed", value: data.bookingsByStatus.CONFIRMED ?? 0, color: "bg-sage/60" },
    { label: "Deposit paid", value: data.bookingsByStatus.DEPOSIT_PAID ?? 0, color: "bg-sage" },
    { label: "Completed", value: data.bookingsByStatus.COMPLETED ?? 0, color: "bg-charcoal/30" },
  ];

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
            <p className={dashLabel}>Administration</p>
            <h1 className="font-display mt-3 text-4xl font-semibold text-charcoal lg:text-5xl">
              Platform Overview
            </h1>
            <p className="font-heading mt-2 text-base font-light text-slate">
              {data.subtitle ?? "Full visibility across weddings, vendors, and bookings."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {quickLinks.map((l) => (
                <Link key={l.href} href={l.href} className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Users at a glance */}
          <div className="border border-charcoal/8 bg-ivory p-6 min-w-[200px]">
            <p className={dashLabel}>Platform users</p>
            <p className="font-display mt-2 text-4xl font-semibold text-charcoal">{totalUsers}</p>
            <div className="mt-4 space-y-2">
              {[
                { label: "Clients", value: data.usersByRole.client, pct: totalUsers > 0 ? (data.usersByRole.client / totalUsers) * 100 : 0 },
                { label: "Vendors", value: data.usersByRole.vendor, pct: totalUsers > 0 ? (data.usersByRole.vendor / totalUsers) * 100 : 0 },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between">
                    <span className={dashLabel}>{r.label}</span>
                    <span className="font-accent text-[10px] text-charcoal">{r.value}</span>
                  </div>
                  <div className="mt-1 h-1 bg-charcoal/8">
                    <div className="h-full bg-gold-primary/60 transition-all duration-700" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat row */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Weddings", value: data.weddingsCount, sub: "on platform", href: "/admin/clients" },
          { label: "Active Vendors", value: data.usersByRole.vendor, sub: "registered", href: "/admin/vendors" },
          { label: "Active Bookings", value: activeBookings, sub: "in pipeline", href: null },
          { label: "New Inquiries", value: data.newContactInquiries, sub: "uncontacted", href: "/admin/inquiries", highlight: data.newContactInquiries > 0 },
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

      {/* Booking pipeline visual */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="border border-charcoal/8 bg-ivory p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-xl text-charcoal">Booking Pipeline</h3>
          <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">{totalBookings} total</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bookingStatuses.map((s) => (
            <div key={s.label} className="border border-charcoal/8 bg-cream/30 p-4">
              <p className={dashLabel}>{s.label}</p>
              <p className="font-display mt-2 text-2xl font-semibold text-charcoal">{s.value}</p>
              <div className="mt-3 h-1.5 bg-charcoal/8">
                <div
                  className={cn("h-full transition-all duration-700", s.color)}
                  style={{ width: totalBookings > 0 ? `${(s.value / totalBookings) * 100}%` : "0%" }}
                />
              </div>
              <p className="font-heading mt-1 text-[11px] text-slate">
                {totalBookings > 0 ? Math.round((s.value / totalBookings) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Vendor verification queue */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-charcoal">Vendors Awaiting Verification</h3>
              <p className="font-heading mt-1 text-xs text-slate">{data.pendingVendorCount} pending approval</p>
            </div>
            <Link href="/admin/vendors" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>View all</Link>
          </div>

          {data.pendingVendors.length === 0 ? (
            <div className="border border-dashed border-charcoal/12 bg-cream/30 px-5 py-8 text-center">
              <p className="font-heading text-sm text-slate">No vendors pending verification.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-charcoal/5">
              {data.pendingVendors.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-charcoal/8 bg-cream font-display text-base text-gold-dark">
                      {v.name[0]}
                    </div>
                    <div>
                      <p className="font-heading text-sm font-medium text-charcoal">{v.name}</p>
                      <p className="font-accent text-[10px] uppercase tracking-[0.12em] text-slate">{v.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={dashLabel}>{v.date}</span>
                    <Link href="/admin/vendors" className={cn(statusBadgeBase, "border-gold-primary/50 text-gold-dark hover:bg-gold-primary/10 transition-colors cursor-pointer")}>
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right column */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">

          {/* Platform health */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <h3 className="font-display mb-5 text-xl text-charcoal">Platform Health</h3>
            <div className="space-y-4">
              {[
                { label: "Clients", value: data.usersByRole.client, href: "/admin/clients" },
                { label: "Vendors", value: data.usersByRole.vendor, href: "/admin/vendors" },
                { label: "Pending approvals", value: data.pendingVendorCount, href: "/admin/vendors", highlight: data.pendingVendorCount > 0 },
                { label: "Weddings active", value: data.weddingsCount, href: null },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between border-b border-charcoal/5 pb-3 last:border-0">
                  <p className={dashLabel}>{m.label}</p>
                  <div className="flex items-center gap-3">
                    <p className={cn("font-display text-xl text-charcoal", m.highlight && "text-gold-dark")}>{m.value}</p>
                    {m.href && <Link href={m.href} className="font-accent text-[10px] uppercase tracking-[0.12em] text-slate hover:text-gold-primary">→</Link>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent inquiries */}
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl text-charcoal">Recent Inquiries</h3>
              <Link href="/admin/inquiries" className={cn(dashLabel, "hover:text-gold-dark transition-colors")}>All</Link>
            </div>
            {data.recentContactInquiries.length === 0 ? (
              <p className="font-heading text-sm text-slate">No inquiries yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentContactInquiries.slice(0, 4).map((q) => (
                  <div key={q.id} className="border-l-2 border-gold-primary/25 pl-3">
                    <p className="font-heading text-sm font-medium text-charcoal">{q.name}</p>
                    <p className="font-heading text-xs text-slate line-clamp-1">{q.preview}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn(
                        statusBadgeBase,
                        q.status === "NEW" ? "border-gold-primary/60 text-gold-dark" : "border-charcoal/20 text-slate"
                      )}>{q.status}</span>
                      {q.destination && <span className={dashLabel}>{q.destination}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
