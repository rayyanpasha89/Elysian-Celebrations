"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const barData = [
  { label: "Week 1", pct: 42 },
  { label: "Week 2", pct: 58 },
  { label: "Week 3", pct: 71 },
  { label: "Week 4", pct: 64 },
];

const activity = [
  { id: "1", text: "New inquiry from Priya & Arjun — Udaipur, Feb 2026", time: "Today · 10:24" },
  { id: "2", text: "Quote viewed by Meera Kapoor", time: "Yesterday · 16:02" },
  { id: "3", text: "Booking confirmed — Goa pre-wedding", time: "2d ago · 09:15" },
  { id: "4", text: "Profile featured on destination landing", time: "4d ago · 11:40" },
];

const trends = [
  { title: "Inquiries", sub: "+12% vs last month", value: "28" },
  { title: "Conversion", sub: "Inquiry → booking", value: "34%" },
  { title: "Avg. ticket", sub: "Photography packages", value: "₹2.8L" },
];

export default function VendorAnalyticsPage() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Performance</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Analytics</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Profile views" value={1840} />
        <StatCard label="Inquiries" value={28} />
        <StatCard label="Bookings" value={9} />
        <StatCard label="Revenue (month)" value={842} prefix="₹" suffix="K" />
      </motion.div>

      <motion.div variants={fadeUp} className={cn(dashCard, "mt-10")}>
        <h3 className="font-display text-lg text-charcoal">Inquiry volume</h3>
        <p className="font-heading mt-2 text-sm text-slate">This month — weekly index</p>
        <div className="mt-8 flex h-48 items-end gap-4 border-b border-charcoal/15 pb-2">
          {barData.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full border border-charcoal/10 bg-gold-primary/25 transition-colors hover:bg-gold-primary/40"
                style={{ height: `${b.pct}%` }}
              />
              <span className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">{b.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} className={dashCard}>
          <h3 className="font-display text-lg text-charcoal">Recent activity</h3>
          <ul className="mt-6 list-none space-y-4 border-t border-charcoal/8 pt-4 pl-0">
            {activity.map((a) => (
              <motion.li key={a.id} variants={staggerItem} className="border-b border-charcoal/8 pb-4 last:border-0 last:pb-0">
                <p className="font-heading text-sm text-charcoal">{a.text}</p>
                <p className="font-accent mt-2 text-[10px] uppercase tracking-[0.15em] text-slate">{a.time}</p>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-4">
          <p className={dashLabel}>Monthly trends</p>
          {trends.map((t) => (
            <div key={t.title} className={dashCard}>
              <p className={dashLabel}>{t.title}</p>
              <p className="font-display mt-2 text-2xl text-charcoal">{t.value}</p>
              <p className="font-heading mt-2 text-xs text-slate">{t.sub}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
