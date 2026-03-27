"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";

const initial = [
  { id: "1", name: "Udaipur", country: "India", venueCount: 42, startingPrice: 2800000, active: true },
  { id: "2", name: "Jaipur", country: "India", venueCount: 38, startingPrice: 2400000, active: true },
  { id: "3", name: "Goa", country: "India", venueCount: 56, startingPrice: 2200000, active: true },
  { id: "4", name: "Kerala", country: "India", venueCount: 33, startingPrice: 2000000, active: true },
  { id: "5", name: "Jim Corbett", country: "India", venueCount: 18, startingPrice: 1800000, active: true },
  { id: "6", name: "Bali", country: "Indonesia", venueCount: 64, startingPrice: 3500000, active: true },
  { id: "7", name: "Santorini", country: "Greece", venueCount: 27, startingPrice: 5500000, active: false },
];

export default function AdminDestinationsPage() {
  const [rows, setRows] = useState(initial);

  const toggle = (id: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Catalogue</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Destinations</h2>
        </div>
        <button type="button" className={dashBtn}>
          Add Destination
        </button>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((d) => (
          <motion.div key={d.id} variants={staggerItem} className={dashCard}>
            <div className="aspect-[16/10] border border-charcoal/10 bg-gradient-to-br from-midnight/60 to-charcoal/20" />
            <h3 className="font-display mt-4 text-xl text-charcoal">{d.name}</h3>
            <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-dark">{d.country}</p>
            <div className="mt-4 space-y-2 font-heading text-sm text-slate">
              <p>
                <span className={dashLabel}>Venues </span>
                {d.venueCount}
              </p>
              <p>
                <span className={dashLabel}>From </span>₹{(d.startingPrice / 100000).toFixed(1)}L
              </p>
            </div>
            <label className="font-accent mt-6 flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-slate">
              <input
                type="checkbox"
                checked={d.active}
                onChange={() => toggle(d.id)}
                className="h-3.5 w-3.5 border border-charcoal/30 accent-gold-primary"
              />
              Active
            </label>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
