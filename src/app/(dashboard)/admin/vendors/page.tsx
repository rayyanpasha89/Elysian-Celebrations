"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type VendorStatus = "VERIFIED" | "PENDING" | "SUSPENDED";

const vendors: {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number;
  status: VendorStatus;
  featured: boolean;
}[] = [
  { id: "1", name: "Lens & Light Studios", category: "Photography", city: "Mumbai", rating: 4.9, status: "VERIFIED", featured: true },
  { id: "2", name: "Spice Route Catering", category: "Catering", city: "Delhi", rating: 4.7, status: "VERIFIED", featured: false },
  { id: "3", name: "Nova Decor House", category: "Decor & Design", city: "Jaipur", rating: 4.5, status: "PENDING", featured: false },
  { id: "4", name: "Midnight Sound", category: "Music & DJ", city: "Bangalore", rating: 4.8, status: "VERIFIED", featured: false },
  { id: "5", name: "Velvet Events Co", category: "Travel & Logistics", city: "Goa", rating: 3.9, status: "SUSPENDED", featured: false },
];

function statusBadge(status: VendorStatus) {
  return cn(
    statusBadgeBase,
    status === "VERIFIED" && "border-sage/70 text-sage",
    status === "PENDING" && "border-gold-primary/70 text-gold-dark",
    status === "SUSPENDED" && "border-error/60 text-error",
  );
}

export default function AdminVendorsPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vendors;
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(s) ||
        v.category.toLowerCase().includes(s) ||
        v.city.toLowerCase().includes(s),
    );
  }, [q]);

  const total = vendors.length;
  const verified = vendors.filter((v) => v.status === "VERIFIED").length;
  const pending = vendors.filter((v) => v.status === "PENDING").length;
  const featured = vendors.filter((v) => v.featured).length;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Directory</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Vendors</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total vendors" value={total} />
        <StatCard label="Verified" value={verified} />
        <StatCard label="Pending approval" value={pending} />
        <StatCard label="Featured" value={featured} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <label htmlFor="vendor-search" className={dashLabel}>
          Search
        </label>
        <input
          id="vendor-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, category, city"
          className="mt-3 w-full max-w-md border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState />
      ) : (
        <motion.div variants={fadeUp} className="scrollbar-elysian mt-10 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-charcoal/15">
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Name</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Category</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>City</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Rating</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Status</th>
                <th className={cn(dashLabel, "pb-3 font-normal")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-charcoal/8">
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal">{v.name}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{v.category}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{v.city}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal">{v.rating.toFixed(1)}</td>
                  <td className="py-4 pr-4">
                    <span className={statusBadge(v.status)}>{v.status}</span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                      >
                        View
                      </button>
                      {v.status === "PENDING" && (
                        <button
                          type="button"
                          className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate hover:border-gold-primary"
                      >
                        {v.featured ? "Unfeature" : "Feature"}
                      </button>
                    </div>
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
