"use client";

import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import { staggerContainer, staggerItem, fadeUp } from "@/animations/variants";

const stats = [
  { label: "Active Bookings", value: 8 },
  { label: "Revenue This Month", value: 450000, prefix: "₹", formatter: (v: number) => `${(v / 1000).toFixed(0)}K` },
  { label: "Profile Views", value: 342, trend: { value: 12, isPositive: true } },
  { label: "Avg Rating", value: 4.8, suffix: "/5" },
];

const pendingInquiries = [
  { couple: "Sneha & Vikram", destination: "Kerala", date: "Jun 15, 2026", service: "Photography" },
  { couple: "Riya & Aditya", destination: "Bali", date: "Sep 22, 2026", service: "Photo + Video" },
];

const upcomingEvents = [
  { couple: "Meera & Karthik", event: "Pre-wedding Shoot", date: "Apr 5", location: "Goa" },
  { couple: "Ananya & Rahul", event: "Wedding Day", date: "Apr 18", location: "Jaipur" },
  { couple: "Priya & Arjun", event: "Engagement", date: "May 2", location: "Udaipur" },
];

export default function VendorDashboard() {
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
          Lens & Light Studio
        </h2>
        <p className="mt-1 font-heading text-base font-light text-slate">
          You have 2 new inquiries and 3 upcoming events this month.
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Inquiries */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="border border-charcoal/8 bg-ivory p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              New Inquiries
            </h3>
            <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary">
              {pendingInquiries.length} pending
            </span>
          </div>
          <div className="space-y-4">
            {pendingInquiries.map((inq, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-charcoal/5 pb-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-charcoal">{inq.couple}</p>
                  <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate mt-0.5">
                    {inq.destination} — {inq.service}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {inq.date}
                  </p>
                  <button className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-gold-primary hover:underline">
                    Respond
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="font-display text-lg font-semibold text-charcoal mb-6">
            Upcoming Events
          </h3>
          <div className="space-y-4">
            {upcomingEvents.map((evt, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-charcoal/5 pb-4 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center bg-cream font-accent text-[10px] text-gold-primary">
                    {evt.date.split(" ")[0]}
                    <br />
                    {evt.date.split(" ")[1]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{evt.couple}</p>
                    <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate mt-0.5">
                      {evt.event}
                    </p>
                  </div>
                </div>
                <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                  {evt.location}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
