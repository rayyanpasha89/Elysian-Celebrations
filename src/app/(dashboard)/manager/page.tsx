"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashCard, dashLabel, dashBtn, statusBadgeBase } from "@/lib/dashboard-styles";
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
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-48 bg-charcoal/10" />
        <div className="h-4 w-96 max-w-full bg-charcoal/5" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 border border-charcoal/8 bg-charcoal/5" />
        ))}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { user, isLoaded } = useUser();
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

  if (!isLoaded || loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl border border-rose/20 bg-ivory p-6 text-charcoal">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const firstName = user?.firstName ?? "there";
  const stats = [
    { label: "Active Weddings", value: data.stats.activeWeddings },
    { label: "Pending Inquiries", value: data.stats.pendingInquiries },
    { label: "Confirmed Bookings", value: data.stats.confirmedBookings },
    { label: "Available Vendors", value: data.stats.vendorsAvailable },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          Welcome back, {firstName}
        </h2>
        <p className="mt-1 font-heading text-base font-light text-slate">
          {data.subtitle}
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
        {/* Recent Inquiries */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              Recent Inquiries
            </h3>
            <Link
              href="/manager/inquiries"
              className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <ul className="space-y-3">
            {data.recentInquiries.length === 0 ? (
              <li className="text-sm text-slate">No inquiries yet.</li>
            ) : (
              data.recentInquiries.map((inq) => (
                <li
                  key={inq.id}
                  className="flex items-center justify-between border-b border-charcoal/5 pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm text-charcoal">{inq.name}</p>
                    <p className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">
                      {inq.destination ?? "No destination"} &middot;{" "}
                      {new Date(inq.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      statusBadgeBase,
                      inq.status === "NEW"
                        ? "border-gold-primary/70 text-gold-dark"
                        : "border-charcoal/25 text-slate"
                    )}
                  >
                    {inq.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </motion.div>

        {/* Upcoming Weddings */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="mb-6 font-display text-lg font-semibold text-charcoal">
            Upcoming Weddings
          </h3>
          <ul className="space-y-4">
            {data.upcomingWeddings.length === 0 ? (
              <li className="text-sm text-slate">No upcoming weddings.</li>
            ) : (
              data.upcomingWeddings.map((w) => (
                <li key={w.id} className="border-l-2 border-gold-primary/20 pl-4">
                  <p className="text-sm leading-snug text-charcoal">{w.name}</p>
                  <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {w.destination ?? "TBD"} &middot;{" "}
                    {w.date
                      ? new Date(w.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Date TBD"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
