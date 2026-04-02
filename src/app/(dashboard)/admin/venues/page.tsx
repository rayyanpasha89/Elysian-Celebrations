"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type VenueRow = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  capacity: number | null;
  priceRange: string | null;
  isActive: boolean;
  destination: string;
};

export default function AdminVenuesPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/venues");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setVenues(json.venues ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await load(); }
      catch { if (!cancelled) toast.error("Could not load venues"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success(current ? "Venue deactivated" : "Venue activated");
    } catch {
      toast.error("Update failed");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return venues;
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(s) ||
        v.destination.toLowerCase().includes(s) ||
        (v.address ?? "").toLowerCase().includes(s)
    );
  }, [q, venues]);

  const active = venues.filter((v) => v.isActive).length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-64 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Management</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Venues</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total venues" value={venues.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Inactive" value={venues.length - active} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <label htmlFor="venue-search" className={dashLabel}>Search</label>
        <input
          id="venue-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, destination, address"
          className="mt-3 w-full max-w-md border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState
          title={q.trim() ? "No venues match your search" : "No venues yet"}
          hint={q.trim() ? "Try a different name or destination." : "Venues will appear here once added to the database."}
        />
      ) : (
        <motion.div variants={fadeUp} className="scrollbar-elysian mt-10 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-charcoal/15">
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Name</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Destination</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Capacity</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Price Range</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Status</th>
                <th className={cn(dashLabel, "pb-3 font-normal")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-charcoal/8">
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal">{v.name}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{v.destination}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">
                    {v.capacity ? v.capacity.toLocaleString() : "—"}
                  </td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{v.priceRange ?? "—"}</td>
                  <td className="py-4 pr-4">
                    <span className={cn(
                      statusBadgeBase,
                      v.isActive ? "border-sage/70 text-sage" : "border-charcoal/30 text-slate"
                    )}>
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-4">
                    <button
                      type="button"
                      onClick={() => void toggle(v.id, v.isActive)}
                      className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                    >
                      {v.isActive ? "Deactivate" : "Activate"}
                    </button>
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
