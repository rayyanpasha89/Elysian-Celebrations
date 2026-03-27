"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const revenueWeeks = [
  { label: "W1", pct: 38 },
  { label: "W2", pct: 52 },
  { label: "W3", pct: 61 },
  { label: "W4", pct: 55 },
];

const destinations = [
  { name: "Udaipur", bookings: 42 },
  { name: "Goa", bookings: 36 },
  { name: "Jaipur", bookings: 29 },
  { name: "Bali", bookings: 18 },
  { name: "Kerala", bookings: 14 },
];
const destMax = Math.max(...destinations.map((d) => d.bookings));

const activity = [
  { id: "1", text: "New vendor verification — Nova Decor House", time: "Today · 08:40" },
  { id: "2", text: "Booking completed — Lens & Light × Priya & Arjun", time: "Today · 07:12" },
  { id: "3", text: "Client registered — Sofia James", time: "Yesterday · 19:30" },
  { id: "4", text: "Inquiry converted — Jim Corbett weekend", time: "2d ago · 14:05" },
];

export default function AdminAnalyticsPage() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Platform</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Analytics</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total revenue (YTD)" value={428} prefix="₹" suffix="L" />
        <StatCard label="Active vendors" value={186} />
        <StatCard label="Active clients" value={94} />
        <StatCard label="Bookings (month)" value={52} />
      </motion.div>

      <motion.div variants={fadeUp} className={cn(dashCard, "mt-10")}>
        <h3 className="font-display text-lg text-charcoal">Revenue trend</h3>
        <p className="font-heading mt-2 text-sm text-slate">Gross booking value — last 4 weeks</p>
        <div className="mt-8 flex h-52 items-end gap-3 border-b border-charcoal/15 pb-2">
          {revenueWeeks.map((w) => (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full border border-charcoal/10 bg-midnight/20"
                style={{ height: `${w.pct}%` }}
              />
              <span className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">{w.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className={cn(dashCard, "mt-10")}>
        <h3 className="font-display text-lg text-charcoal">Top destinations by bookings</h3>
        <ul className="mt-6 list-none space-y-4 pl-0">
          {destinations.map((d) => (
            <li key={d.name}>
              <div className="flex items-center justify-between gap-4">
                <span className="font-heading text-sm text-charcoal">{d.name}</span>
                <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">{d.bookings}</span>
              </div>
              <div className="mt-2 h-2 border border-charcoal/10 bg-cream">
                <div
                  className="h-full bg-gold-primary/50"
                  style={{ width: `${(d.bookings / destMax) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div variants={fadeUp} className={cn(dashCard, "mt-10")}>
        <h3 className="font-display text-lg text-charcoal">Recent platform activity</h3>
        <ul className="mt-6 list-none space-y-4 border-t border-charcoal/8 pt-4 pl-0">
          {activity.map((a) => (
            <motion.li key={a.id} variants={staggerItem} className="border-b border-charcoal/8 pb-4 last:border-0 last:pb-0">
              <p className="font-heading text-sm text-charcoal">{a.text}</p>
              <p className="font-accent mt-2 text-[10px] uppercase tracking-[0.15em] text-slate">{a.time}</p>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
