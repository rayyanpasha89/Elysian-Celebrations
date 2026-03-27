"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashBtn, dashLabel, rsvpBadgeClass, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Rsvp = "CONFIRMED" | "PENDING" | "DECLINED";
type Side = "BRIDE" | "GROOM" | "MUTUAL";

const guests: {
  id: string;
  name: string;
  side: Side;
  rsvp: Rsvp;
  meal: string;
  plusOne: boolean;
}[] = [
  { id: "1", name: "Ananya Kapoor", side: "BRIDE", rsvp: "CONFIRMED", meal: "Vegetarian", plusOne: true },
  { id: "2", name: "Rohan Mehta", side: "GROOM", rsvp: "CONFIRMED", meal: "Non-veg", plusOne: false },
  { id: "3", name: "Neha Singh", side: "MUTUAL", rsvp: "PENDING", meal: "Vegan", plusOne: false },
  { id: "4", name: "Vikram Desai", side: "GROOM", rsvp: "DECLINED", meal: "—", plusOne: false },
  { id: "5", name: "Kavya Iyer", side: "BRIDE", rsvp: "CONFIRMED", meal: "Jain", plusOne: true },
  { id: "6", name: "Arjun Nair", side: "MUTUAL", rsvp: "PENDING", meal: "Vegetarian", plusOne: false },
];

const tabs = ["All", "Confirmed", "Pending", "Declined"] as const;
type Tab = (typeof tabs)[number];

function sideLabel(s: Side) {
  if (s === "BRIDE") return "Bride";
  if (s === "GROOM") return "Groom";
  return "Mutual";
}

export default function ClientGuestsPage() {
  const [tab, setTab] = useState<Tab>("All");

  const filtered = useMemo(() => {
    if (tab === "All") return guests;
    if (tab === "Confirmed") return guests.filter((g) => g.rsvp === "CONFIRMED");
    if (tab === "Pending") return guests.filter((g) => g.rsvp === "PENDING");
    return guests.filter((g) => g.rsvp === "DECLINED");
  }, [tab]);

  const total = guests.length;
  const confirmed = guests.filter((g) => g.rsvp === "CONFIRMED").length;
  const pending = guests.filter((g) => g.rsvp === "PENDING").length;
  const declined = guests.filter((g) => g.rsvp === "DECLINED").length;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Guest list</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">RSVP & preferences</h2>
        </div>
        <button type="button" className={dashBtn}>
          Add Guest
        </button>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total guests" value={total} />
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Declined" value={declined} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "font-accent border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors",
                  active
                    ? "-mb-px border-gold-primary text-charcoal"
                    : "border-transparent text-slate hover:text-charcoal",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState />
      ) : (
        <motion.div variants={fadeUp} className="scrollbar-elysian mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-charcoal/15">
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Name</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Side</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>RSVP</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Meal pref</th>
                <th className={cn(dashLabel, "pb-3 font-normal")}>Plus one</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-charcoal/8">
                  <td className="font-heading py-4 pr-4 text-sm text-charcoal">{g.name}</td>
                  <td className="font-heading py-4 pr-4 text-sm text-slate">{sideLabel(g.side)}</td>
                  <td className="py-4 pr-4">
                    <span className={rsvpBadgeClass(g.rsvp)}>{g.rsvp}</span>
                  </td>
                  <td className="font-heading py-4 pr-4 text-sm text-slate">{g.meal}</td>
                  <td className="py-4">
                    <span
                      className={cn(
                        statusBadgeBase,
                        g.plusOne ? "border-charcoal/20 text-charcoal" : "border-charcoal/10 text-slate",
                      )}
                    >
                      {g.plusOne ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
  );
}
