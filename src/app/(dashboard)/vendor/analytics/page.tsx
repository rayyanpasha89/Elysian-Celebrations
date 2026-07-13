"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart, DonutChart, type DonutSegment } from "@/components/dashboard/ui-kit";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#9bae8f",
  COMPLETED: "#7ba7c9",
  PENDING: "#c9a96e",
  QUOTE_PENDING: "#c9a96e",
  QUOTED: "#c9a96e",
  IN_PROGRESS: "#c9a96e",
  CANCELLED: "#c98b8b",
  DECLINED: "#c98b8b",
};
const STATUS_PALETTE = ["#c9a96e", "#9bae8f", "#7ba7c9", "#c98b8b", "#b58fae", "#8a8f98"];

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

type WeeklyVolumePoint = {
  label: string;
  count: number;
  pct?: number;
};

type VendorAnalyticsPayload = {
  bookingsTotal: number;
  bookingsByStatus: Record<string, number>;
  paidToDate: number;
  outstandingAmount: number;
  quotePipeline: number;
  completedBookings: number;
  liveInquiries: number;
  profileViews: number;
  rating: number;
  reviewCount: number;
  weeklyInquiryVolume: WeeklyVolumePoint[];
};

const emptyAnalytics: VendorAnalyticsPayload = {
  bookingsTotal: 0,
  bookingsByStatus: {},
  paidToDate: 0,
  outstandingAmount: 0,
  quotePipeline: 0,
  completedBookings: 0,
  liveInquiries: 0,
  profileViews: 0,
  rating: 0,
  reviewCount: 0,
  weeklyInquiryVolume: [],
};

function formatLakhs(amount: number) {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

export default function VendorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] =
    useState<VendorAnalyticsPayload>(emptyAnalytics);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/vendor/analytics");
        const json = (await res.json()) as VendorAnalyticsPayload & {
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to load analytics");
        if (!cancelled) {
          setAnalytics({
            bookingsTotal: json.bookingsTotal ?? 0,
            bookingsByStatus: json.bookingsByStatus ?? {},
            paidToDate: json.paidToDate ?? 0,
            outstandingAmount: json.outstandingAmount ?? 0,
            quotePipeline: json.quotePipeline ?? 0,
            completedBookings: json.completedBookings ?? 0,
            liveInquiries: json.liveInquiries ?? 0,
            profileViews: json.profileViews ?? 0,
            rating: json.rating ?? 0,
            reviewCount: json.reviewCount ?? 0,
            weeklyInquiryVolume: json.weeklyInquiryVolume ?? [],
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load analytics"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartPoints = useMemo(() => {
    if (analytics.weeklyInquiryVolume.length > 0) {
      return analytics.weeklyInquiryVolume;
    }

    return Array.from({ length: 6 }, (_, index) => ({
      label: `W${index + 1}`,
      count: 0,
    }));
  }, [analytics.weeklyInquiryVolume]);

  const statusSegments = useMemo<DonutSegment[]>(
    () =>
      Object.entries(analytics.bookingsByStatus)
        .filter(([, value]) => value > 0)
        .map(([key, value], index) => ({
          label: formatStatusLabel(key),
          value,
          color: STATUS_COLORS[key] ?? STATUS_PALETTE[index % STATUS_PALETTE.length],
        })),
    [analytics.bookingsByStatus]
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 border border-charcoal/8 bg-charcoal/5"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-rose/20 bg-ivory p-6 text-charcoal">
        <p className="font-heading text-sm">{error}</p>
      </div>
    );
  }

  const activity = [
    {
      id: "inquiries",
      text: `${analytics.liveInquiries} live inquiries or quote-stage bookings in the pipeline`,
      time: "Pipeline",
    },
    {
      id: "reviews",
      text: `Average rating ${Number(analytics.rating).toFixed(1)} from ${analytics.reviewCount} published reviews`,
      time: "Reputation",
    },
    {
      id: "completed",
      text: `${analytics.completedBookings} completed bookings already closed out`,
      time: "Delivery",
    },
  ];

  const trends = [
    {
      title: "Quote pipeline",
      sub: "Current vendor value of inquiry and quote-stage work",
      value: formatLakhs(analytics.quotePipeline),
    },
    {
      title: "Outstanding",
      sub: "Current vendor amount less recorded payments on active bookings",
      value: formatLakhs(analytics.outstandingAmount),
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Performance</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Analytics
        </h2>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatCard label="Bookings" value={analytics.bookingsTotal} />
        <StatCard label="Profile views" value={analytics.profileViews} />
        <StatCard label="Reviews" value={analytics.reviewCount} />
        <StatCard label="Avg rating" value={analytics.rating} suffix="/5" />
        <StatCard
          label="Paid to date"
          value={Math.round(analytics.paidToDate / 1000)}
          prefix="₹"
          suffix="K"
        />
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} className={dashCard}>
          <h3 className="font-display text-lg text-charcoal">Inquiry volume</h3>
          <p className="font-heading mt-2 text-sm text-slate">
            Weekly inquiry and quote-stage activity from real booking data.
          </p>
          <BarChart
            className="mt-8"
            data={chartPoints.map((point) => ({ label: point.label, value: point.count }))}
          />
        </motion.div>

        <motion.div variants={fadeUp} className={dashCard}>
          <h3 className="font-display text-lg text-charcoal">Booking status</h3>
          <p className="font-heading mt-2 text-sm text-slate">
            How your {analytics.bookingsTotal} booking
            {analytics.bookingsTotal === 1 ? "" : "s"} break down by stage.
          </p>
          {statusSegments.length > 0 ? (
            <div className="mt-8">
              <DonutChart segments={statusSegments} centerLabel="Bookings" />
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate">
              No bookings yet — your status mix will appear here.
            </p>
          )}
        </motion.div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} className={dashCard}>
          <h3 className="font-display text-lg text-charcoal">Snapshot</h3>
          <ul className="mt-6 list-none space-y-4 border-t border-charcoal/8 pt-4 pl-0">
            {activity.map((item) => (
              <motion.li
                key={item.id}
                variants={staggerItem}
                className="border-b border-charcoal/8 pb-4 last:border-0 last:pb-0"
              >
                <p className="font-heading text-sm text-charcoal">{item.text}</p>
                <p className="font-accent mt-2 text-[10px] uppercase tracking-[0.15em] text-slate">
                  {item.time}
                </p>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-4">
          <p className={dashLabel}>Key metrics</p>
          {trends.map((trend) => (
            <div key={trend.title} className={dashCard}>
              <p className={dashLabel}>{trend.title}</p>
              <p className="font-display mt-2 text-2xl text-charcoal">
                {trend.value}
              </p>
              <p className="font-heading mt-2 text-xs text-slate">{trend.sub}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
