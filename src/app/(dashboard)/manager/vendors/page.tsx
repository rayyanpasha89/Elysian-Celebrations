"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashBtn, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type VendorRow = {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number;
  isVerified: boolean;
  isFeatured: boolean;
};

export default function ManagerVendorsPage() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/vendors");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = json.vendors ?? [];
    setVendors(
      raw.map(
        (v: {
          id: string;
          business_name: string;
          city: string | null;
          rating: number;
          is_verified: boolean;
          is_featured: boolean;
          category: { name?: string } | null;
        }) => ({
          id: v.id,
          name: v.business_name ?? "—",
          category: (v.category as { name?: string } | null)?.name ?? "—",
          city: v.city ?? "—",
          rating: v.rating ?? 0,
          isVerified: v.is_verified,
          isFeatured: v.is_featured,
        })
      )
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await load(); }
      catch { if (!cancelled) setVendors([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleVerify = async (id: string, isVerified: boolean) => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified }),
      });
      if (!res.ok) throw new Error("Failed");
      await load();
      toast.success(isVerified ? "Vendor verified" : "Verification revoked");
    } catch {
      toast.error("Update failed");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vendors;
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(s) ||
        v.category.toLowerCase().includes(s) ||
        v.city.toLowerCase().includes(s)
    );
  }, [q, vendors]);

  const verified = vendors.filter((v) => v.isVerified).length;
  const pending = vendors.length - verified;

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
        <p className={dashLabel}>Directory</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Vendors</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total vendors" value={vendors.length} />
        <StatCard label="Verified" value={verified} />
        <StatCard label="Pending" value={pending} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <label htmlFor="vendor-search" className={dashLabel}>Search</label>
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
          <table className="w-full min-w-[700px] border-collapse text-left">
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
                    <span className={cn(statusBadgeBase, v.isVerified ? "border-sage/70 text-sage" : "border-gold-primary/70 text-gold-dark")}>
                      {v.isVerified ? "VERIFIED" : "PENDING"}
                    </span>
                  </td>
                  <td className="py-4">
                    {!v.isVerified ? (
                      <button type="button" className={dashBtn} onClick={() => toggleVerify(v.id, true)}>
                        Verify
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate hover:border-gold-primary"
                        onClick={() => toggleVerify(v.id, false)}
                      >
                        Revoke
                      </button>
                    )}
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
