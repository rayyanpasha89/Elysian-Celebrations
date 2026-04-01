"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import { staggerContainer, staggerItem, fadeUp } from "@/animations/variants";

type VendorDashboardPayload = {
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    isVerified: boolean;
  } | null;
  stats: {
    totalBookings: number;
    pendingInquiries: number;
    confirmedBookings: number;
    avgRating: number;
    revenueMonth: number;
    profileViews: number;
  };
  pendingInquiries: {
    id: string;
    couple: string;
    destination: string;
    date: string;
    service: string;
  }[];
  upcomingEvents: {
    couple: string;
    event: string;
    date: string;
    location: string;
  }[];
  needsOnboarding?: boolean;
  subtitle?: string;
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 bg-charcoal/10" />
        <div className="h-4 w-80 max-w-full bg-charcoal/5" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="mx-auto max-w-6xl border border-rose/20 bg-ivory p-6 text-charcoal">
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;

  const title = data.vendor?.businessName ?? "Your studio";
  const subtitle =
    data.subtitle ??
    "Here’s your business snapshot.";

  const stats = [
    { label: "Active Bookings", value: data.stats.totalBookings },
    {
      label: "Revenue This Month",
      value: data.stats.revenueMonth,
      prefix: "₹",
      formatter: (v: number) => `${(v / 1000).toFixed(0)}K`,
    },
    {
      label: "Profile Views",
      value: data.stats.profileViews,
      trend: { value: 0, isPositive: true },
    },
    {
      label: "Avg Rating",
      value: data.stats.avgRating,
      suffix: "/5",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {data.needsOnboarding && (
        <div className="mb-6 border border-gold-primary/30 bg-cream/40 p-4 text-charcoal">
          <p className="font-display text-sm font-semibold">
            Complete your vendor profile
          </p>
          <p className="mt-1 text-sm text-slate">
            Add your business name and details so couples can find you.
          </p>
          <Link
            href="/vendor/profile"
            className="mt-3 inline-block font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary hover:underline"
          >
            Edit profile
          </Link>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          {title}
        </h2>
        <p className="mt-1 font-heading text-base font-light text-slate">
          {subtitle}
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={staggerItem}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="border border-charcoal/8 bg-ivory p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              New Inquiries
            </h3>
            <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary">
              {data.pendingInquiries.length} pending
            </span>
          </div>
          <div className="space-y-4">
            {data.pendingInquiries.length === 0 ? (
              <p className="text-sm text-slate">No pending inquiries.</p>
            ) : (
              data.pendingInquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="flex items-center justify-between border-b border-charcoal/5 pb-4 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {inq.couple}
                    </p>
                    <p className="mt-0.5 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                      {inq.destination} — {inq.service}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                      {inq.date}
                    </p>
                    <Link
                      href={`/vendor/bookings`}
                      className="mt-1 inline-block font-accent text-[10px] uppercase tracking-[0.15em] text-gold-primary hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="mb-6 font-display text-lg font-semibold text-charcoal">
            Upcoming Events
          </h3>
          <div className="space-y-4">
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate">No upcoming events.</p>
            ) : (
              data.upcomingEvents.map((evt, i) => {
                const parts = evt.date.trim().split(/\s+/);
                const line1 = parts[0] ?? "";
                const line2 = parts.slice(1).join(" ") || " ";
                return (
                  <div
                    key={`${evt.couple}-${i}`}
                    className="flex items-center justify-between border-b border-charcoal/5 pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 flex-col items-center justify-center bg-cream text-center font-accent text-[10px] text-gold-primary leading-tight">
                        {line1}
                        <br />
                        {line2}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {evt.couple}
                        </p>
                        <p className="mt-0.5 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                          {evt.event}
                        </p>
                      </div>
                    </div>
                    <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                      {evt.location}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
