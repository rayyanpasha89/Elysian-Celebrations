"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Status = "PENDING" | "CONFIRMED" | "COMPLETED";
type Tab = "All" | Status;

const bookings: {
  id: string;
  vendor: string;
  service: string;
  date: string;
  amount: number;
  status: Status;
}[] = [
  { id: "1", vendor: "Lens & Light Studios", service: "Full wedding coverage", date: "2026-02-14", amount: 285000, status: "CONFIRMED" },
  { id: "2", vendor: "Nova Decor House", service: "Mandap & reception décor", date: "2026-02-12", amount: 920000, status: "PENDING" },
  { id: "3", vendor: "Spice Route Catering", service: "Multi-event catering", date: "2026-02-13", amount: 1100000, status: "CONFIRMED" },
  { id: "4", vendor: "Midnight Sound", service: "Sangeet + reception", date: "2026-02-13", amount: 165000, status: "PENDING" },
  { id: "5", vendor: "Velvet Brush Co", service: "Bridal + family styling", date: "2026-02-14", amount: 78000, status: "COMPLETED" },
];

const tabs: Tab[] = ["All", "PENDING", "CONFIRMED", "COMPLETED"];

function statusClass(s: Status) {
  return cn(
    statusBadgeBase,
    s === "CONFIRMED" && "border-sage/70 text-sage",
    s === "PENDING" && "border-gold-primary/70 text-gold-dark",
    s === "COMPLETED" && "border-charcoal/35 text-charcoal",
  );
}

export default function ClientBookingsPage() {
  const [tab, setTab] = useState<Tab>("All");

  const filtered = useMemo(() => {
    if (tab === "All") return bookings;
    return bookings.filter((b) => b.status === tab);
  }, [tab]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Reservations</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Bookings</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {tabs.map((t) => {
            const active = tab === t;
            const label =
              t === "All" ? "All" : t === "PENDING" ? "Pending" : t === "CONFIRMED" ? "Confirmed" : "Completed";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "font-accent border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors",
                  active ? "-mb-px border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState />
      ) : (
        <ul className="mt-8 list-none space-y-6 pl-0">
          {filtered.map((b) => (
            <motion.li key={b.id} variants={staggerItem} className={dashCard}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                <div>
                  <h3 className="font-display text-xl text-charcoal">{b.vendor}</h3>
                  <p className="font-heading mt-2 text-sm text-slate">{b.service}</p>
                </div>
                <span className={statusClass(b.status)}>{b.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-6 font-heading text-sm text-charcoal">
                <p>
                  <span className={dashLabel}>Date </span>
                  {new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p>
                  <span className={dashLabel}>Amount </span>₹{b.amount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="mt-6">
                <button type="button" className={dashBtn}>
                  View Details
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
