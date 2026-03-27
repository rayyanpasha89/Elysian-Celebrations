"use client";

import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import { staggerContainer, staggerItem, fadeUp } from "@/animations/variants";

const stats = [
  { label: "Total Weddings", value: 23, trend: { value: 15, isPositive: true } },
  { label: "Active Vendors", value: 87 },
  { label: "Revenue (MTD)", value: 2800000, prefix: "₹", formatter: (v: number) => `${(v / 100000).toFixed(1)}L` },
  { label: "New Inquiries", value: 12, trend: { value: 8, isPositive: true } },
];

const recentVendorApprovals = [
  { name: "Royal Decor Studios", category: "Decor & Design", date: "Mar 24" },
  { name: "Spice Route Catering", category: "Catering", date: "Mar 22" },
  { name: "Wanderlens Photography", category: "Photography", date: "Mar 20" },
];

const platformMetrics = [
  { label: "Vendor Approval Rate", value: "92%" },
  { label: "Avg Response Time", value: "4.2h" },
  { label: "Client Satisfaction", value: "4.8/5" },
  { label: "Repeat Bookings", value: "34%" },
];

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Welcome */}
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
          12 new inquiries this week. 3 vendor applications pending review.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={staggerItem}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Vendor Approvals */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              Recent Vendor Approvals
            </h3>
            <button className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentVendorApprovals.map((vendor, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-charcoal/5 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-cream flex items-center justify-center font-accent text-[10px] text-gold-primary">
                    {vendor.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{vendor.name}</p>
                    <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                      {vendor.category}
                    </p>
                  </div>
                </div>
                <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                  {vendor.date}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Platform Health */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="font-display text-lg font-semibold text-charcoal mb-6">
            Platform Health
          </h3>
          <div className="space-y-5">
            {platformMetrics.map((metric, i) => (
              <div key={i}>
                <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-1">
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
        </motion.div>
      </div>
    </div>
  );
}
