"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type VendorStatus = "VERIFIED" | "PENDING" | "SUSPENDED";

type VendorRow = {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number;
  status: VendorStatus;
  featured: boolean;
};

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
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/vendors");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = (json.vendors ?? []) as {
      id: string;
      business_name: string;
      city: string | null;
      rating: number | null;
      is_verified: boolean;
      is_featured: boolean;
      user: { is_active?: boolean } | null;
      category: { name?: string } | null;
    }[];

    setVendors(
      raw.map((vendor) => {
        const isActive = vendor.user?.is_active ?? true;
        const status: VendorStatus = !isActive
          ? "SUSPENDED"
          : vendor.is_verified
            ? "VERIFIED"
            : "PENDING";

        return {
          id: vendor.id,
          name: vendor.business_name,
          category: vendor.category?.name ?? "Uncategorized",
          city: vendor.city ?? "—",
          rating: vendor.rating ?? 0,
          status,
          featured: vendor.is_featured,
        };
      })
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) toast.error("Could not load vendors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchVendor = async (
    id: string,
    updates: { isVerified?: boolean; isFeatured?: boolean },
    successMessage: string
  ) => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success(successMessage);
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
        v.city.toLowerCase().includes(s),
    );
  }, [q, vendors]);

  const total = vendors.length;
  const verified = vendors.filter((v) => v.status === "VERIFIED").length;
  const pending = vendors.filter((v) => v.status === "PENDING").length;
  const featured = vendors.filter((v) => v.featured).length;

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
        <ListEmptyState
          title={q.trim() ? "No vendors match your search" : "No vendors yet"}
          hint={q.trim() ? "Try a different name, category, or city." : "Vendors will appear here when they register and complete their profiles."}
        />
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
                      {v.status === "PENDING" && (
                        <button
                          type="button"
                          className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                          onClick={() =>
                            void patchVendor(v.id, { isVerified: true }, "Vendor verified")
                          }
                        >
                          Verify
                        </button>
                      )}
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate hover:border-gold-primary"
                        onClick={() =>
                          void patchVendor(
                            v.id,
                            { isFeatured: !v.featured },
                            v.featured ? "Vendor unfeatured" : "Vendor featured"
                          )
                        }
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
