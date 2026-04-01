"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type AnalyticsPayload = {
  usersByRole: { client: number; vendor: number; admin: number };
  weddingsCount: number;
  bookingsByStatus: Record<string, number>;
  newContactInquiries: number;
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bookingStatusRows = useMemo(() => {
    return Object.entries(data?.bookingsByStatus ?? {}).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const totalBookings = bookingStatusRows.reduce((sum, [, count]) => sum + count, 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-40 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Platform</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Analytics</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total weddings" value={data?.weddingsCount ?? 0} />
        <StatCard label="Registered vendors" value={data?.usersByRole.vendor ?? 0} />
        <StatCard label="Registered clients" value={data?.usersByRole.client ?? 0} />
        <StatCard label="New inquiries" value={data?.newContactInquiries ?? 0} />
      </motion.div>

      <motion.div variants={fadeUp} className={cn(dashCard, "mt-10")}>
        <h3 className="font-display text-lg text-charcoal">Booking status overview</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Live counts from the current booking pipeline.
        </p>
        {bookingStatusRows.length === 0 ? (
          <p className="mt-6 text-sm text-slate">No booking data yet.</p>
        ) : (
          <ul className="mt-6 list-none space-y-4 pl-0">
            {bookingStatusRows.map(([status, count]) => (
              <li key={status}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-heading text-sm text-charcoal">{statusLabel(status)}</span>
                  <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {count}
                  </span>
                </div>
                <div className="mt-2 h-2 border border-charcoal/10 bg-cream">
                  <div
                    className="h-full bg-gold-primary/50"
                    style={{
                      width: totalBookings > 0 ? `${(count / totalBookings) * 100}%` : "0%",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className={cn(dashCard, "mt-10")}>
        <h3 className="font-display text-lg text-charcoal">Account mix</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="border border-charcoal/8 bg-ivory p-4">
            <p className={dashLabel}>Clients</p>
            <p className="mt-2 font-display text-2xl text-charcoal">
              {data?.usersByRole.client ?? 0}
            </p>
          </div>
          <div className="border border-charcoal/8 bg-ivory p-4">
            <p className={dashLabel}>Vendors</p>
            <p className="mt-2 font-display text-2xl text-charcoal">
              {data?.usersByRole.vendor ?? 0}
            </p>
          </div>
          <div className="border border-charcoal/8 bg-ivory p-4">
            <p className={dashLabel}>Admins</p>
            <p className="mt-2 font-display text-2xl text-charcoal">
              {data?.usersByRole.admin ?? 0}
            </p>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
