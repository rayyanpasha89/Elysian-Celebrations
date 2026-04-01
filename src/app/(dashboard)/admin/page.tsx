"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import { staggerContainer, staggerItem, fadeUp } from "@/animations/variants";

type AdminDashboardPayload = {
  usersByRole: { client: number; vendor: number; admin: number };
  weddingsCount: number;
  bookingsByStatus: Record<string, number>;
  newContactInquiries: number;
  pendingVendors: {
    id: string;
    name: string;
    category: string;
    date: string;
  }[];
  pendingVendorCount: number;
  recentContactInquiries: {
    id: string;
    name: string;
    email: string;
    destination: string | null;
    status: string;
    createdAt: string;
    preview: string;
  }[];
  subtitle?: string;
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-56 bg-charcoal/10" />
        <div className="h-4 w-full max-w-md bg-charcoal/5" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

  const activeBookings =
    (data.bookingsByStatus.CONFIRMED ?? 0) +
    (data.bookingsByStatus.DEPOSIT_PAID ?? 0) +
    (data.bookingsByStatus.INQUIRY ?? 0) +
    (data.bookingsByStatus.QUOTE_SENT ?? 0);

  const stats = [
    {
      label: "Total Weddings",
      value: data.weddingsCount,
      trend: { value: 0, isPositive: true },
    },
    { label: "Active Vendors", value: data.usersByRole.vendor },
    {
      label: "Active Bookings",
      value: activeBookings,
      prefix: "",
      formatter: (v: number) => String(v),
    },
    {
      label: "New Inquiries",
      value: data.newContactInquiries,
      trend: { value: 0, isPositive: true },
    },
  ];

  const platformMetrics = [
    {
      label: "Clients registered",
      value: String(data.usersByRole.client),
    },
    {
      label: "Vendors registered",
      value: String(data.usersByRole.vendor),
    },
    {
      label: "Pending vendor approvals",
      value: String(data.pendingVendorCount),
    },
    {
      label: "Bookings (all statuses)",
      value: String(
        Object.values(data.bookingsByStatus).reduce((a, b) => a + b, 0)
      ),
    },
  ];

  const subtitle =
    data.subtitle ??
    "Platform-wide metrics and recent activity.";

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          Platform Overview
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

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              Vendors awaiting verification
            </h3>
            <Link
              href="/admin/vendors"
              className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {data.pendingVendors.length === 0 ? (
              <p className="text-sm text-slate">No pending vendors.</p>
            ) : (
              data.pendingVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between border-b border-charcoal/5 pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center bg-cream font-accent text-[10px] text-gold-primary">
                      {vendor.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        {vendor.name}
                      </p>
                      <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                        {vendor.category}
                      </p>
                    </div>
                  </div>
                  <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {vendor.date}
                  </span>
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
          className="lg:col-span-2 border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="mb-6 font-display text-lg font-semibold text-charcoal">
            Platform Health
          </h3>
          <div className="space-y-5">
            {platformMetrics.map((metric, i) => (
              <div key={metric.label}>
                <p className="mb-1 font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
                  {metric.label}
                </p>
                <p className="font-display text-xl font-bold text-charcoal">
                  {metric.value}
                </p>
                {i < platformMetrics.length - 1 && (
                  <div className="mt-4 h-px bg-charcoal/5" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-charcoal/8 pt-6">
            <h4 className="mb-3 font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
              Recent contact inquiries
            </h4>
            <ul className="space-y-3">
              {data.recentContactInquiries.length === 0 ? (
                <li className="text-sm text-slate">None yet.</li>
              ) : (
                data.recentContactInquiries.map((q) => (
                  <li key={q.id} className="text-sm">
                    <span className="font-medium text-charcoal">{q.name}</span>
                    <span className="text-slate"> — {q.preview}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
