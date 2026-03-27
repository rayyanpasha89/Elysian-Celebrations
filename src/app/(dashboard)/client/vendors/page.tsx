"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const categories = [
  "All",
  "Photography",
  "Decor",
  "Catering",
  "Music & DJ",
  "Makeup",
  "Venues",
] as const;

type Cat = (typeof categories)[number];

const vendors: {
  id: string;
  name: string;
  category: Exclude<Cat, "All">;
  location: string;
  rating: number;
  priceRange: string;
}[] = [
  { id: "1", name: "Lens & Light Studios", category: "Photography", location: "Mumbai", rating: 4.9, priceRange: "₹2.5L – 4L" },
  { id: "2", name: "Nova Decor House", category: "Decor", location: "Jaipur", rating: 4.7, priceRange: "₹8L – 15L" },
  { id: "3", name: "Spice Route Catering", category: "Catering", location: "Delhi", rating: 4.8, priceRange: "₹3K – 5K / plate" },
  { id: "4", name: "Midnight Sound", category: "Music & DJ", location: "Bangalore", rating: 4.6, priceRange: "₹1.2L – 2L" },
  { id: "5", name: "Velvet Brush Co", category: "Makeup", location: "Udaipur", rating: 4.9, priceRange: "₹45K – 85K" },
  { id: "6", name: "Lakeview Estates", category: "Venues", location: "Udaipur", rating: 4.8, priceRange: "On request" },
  { id: "7", name: "Frame & Film", category: "Photography", location: "Goa", rating: 4.5, priceRange: "₹2L – 3.5L" },
  { id: "8", name: "Bloom Atelier", category: "Decor", location: "Goa", rating: 4.4, priceRange: "₹5L – 12L" },
];

const secondaryBtn =
  "font-accent inline-flex items-center justify-center border border-charcoal/20 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-all duration-500 hover:border-gold-primary hover:text-gold-dark";

export default function ClientVendorsPage() {
  const [cat, setCat] = useState<Cat>("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = vendors;
    if (cat !== "All") list = list.filter((v) => v.category === cat);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((v) => v.name.toLowerCase().includes(s) || v.location.toLowerCase().includes(s));
    return list;
  }, [cat, q]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Discovery</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Vendors</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8">
        <label htmlFor="vendor-disc-search" className={dashLabel}>
          Search
        </label>
        <input
          id="vendor-disc-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or city"
          className="mt-3 w-full max-w-md border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {categories.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "font-accent border-b-2 px-3 py-3 text-[10px] uppercase tracking-[0.15em] transition-colors md:px-4 md:text-[11px] md:tracking-[0.2em]",
                  active ? "-mb-px border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <motion.article key={v.id} variants={staggerItem} className={dashCard}>
              <div className="aspect-[4/3] border border-charcoal/10 bg-gradient-to-br from-midnight/50 to-charcoal/20" />
              <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-display text-lg text-charcoal">{v.name}</h3>
                <span className={cn(statusBadgeBase, "border-gold-primary/50 text-gold-dark")}>{v.category}</span>
              </div>
              <p className="font-heading mt-2 text-sm text-slate">{v.location}</p>
              <p className="font-heading mt-3 text-sm text-charcoal">
                <span className={dashLabel}>Rating </span>
                {v.rating.toFixed(1)} / 5
              </p>
              <p className="font-heading mt-1 text-sm text-charcoal">
                <span className={dashLabel}>From </span>
                {v.priceRange}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className={dashBtn}>
                  View Profile
                </button>
                <button type="button" className={secondaryBtn}>
                  Shortlist
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </motion.div>
  );
}
