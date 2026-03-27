"use client";

import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";

const stats = [
  { label: "Days Until Wedding", value: 127 },
  { label: "Budget Used", value: 42, suffix: "%" },
  { label: "Vendors Booked", value: 5 },
  { label: "Guests Confirmed", value: 89 },
];

const upcomingTasks = [
  { title: "Finalize venue decoration plan", due: "Mar 30", done: false },
  { title: "Confirm catering menu tasting", due: "Apr 2", done: false },
  { title: "Send invitation batch 2", due: "Apr 5", done: false },
  { title: "Photography team pre-shoot call", due: "Apr 8", done: false },
  { title: "Book travel for Udaipur team", due: "Apr 10", done: false },
];

const recentActivity = [
  { text: "Vendor 'Lens & Light' confirmed for photography", time: "2h ago" },
  { text: "Budget updated — catering estimate revised", time: "5h ago" },
  { text: "New message from Deeksha (Elysian)", time: "1d ago" },
  { text: "Guest RSVP: 12 new confirmations", time: "2d ago" },
];

export default function ClientDashboard() {
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
          Welcome back, Priya
        </h2>
        <p className="mt-1 font-heading text-base font-light text-slate">
          Your Udaipur wedding is 127 days away. Here&apos;s your planning snapshot.
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

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tasks */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              Upcoming Tasks
            </h3>
            <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary">
              {upcomingTasks.filter((t) => !t.done).length} remaining
            </span>
          </div>
          <ul className="space-y-3">
            {upcomingTasks.map((task, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-charcoal/5 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 border border-charcoal/20 flex items-center justify-center cursor-pointer hover:border-gold-primary transition-colors">
                    {task.done && (
                      <div className="h-2 w-2 bg-gold-primary" />
                    )}
                  </div>
                  <span className="text-sm text-charcoal">{task.title}</span>
                </div>
                <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                  {task.due}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Activity */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="font-display text-lg font-semibold text-charcoal mb-6">
            Recent Activity
          </h3>
          <ul className="space-y-4">
            {recentActivity.map((item, i) => (
              <li key={i} className="border-l-2 border-gold-primary/20 pl-4">
                <p className="text-sm text-charcoal leading-snug">
                  {item.text}
                </p>
                <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                  {item.time}
                </p>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
