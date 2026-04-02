"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type PackageRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  startingPrice: number;
  inclusions: string[];
  sortOrder: number;
  isActive: boolean;
};

export default function AdminPackagesPage() {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/packages");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = (json.packages ?? []) as {
      id: string;
      name: string;
      slug: string;
      tagline: string | null;
      starting_price: number;
      inclusions: string[];
      sort_order: number;
      is_active: boolean;
    }[];
    setPackages(raw.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      startingPrice: p.starting_price,
      inclusions: p.inclusions ?? [],
      sortOrder: p.sort_order,
      isActive: p.is_active,
    })));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await load(); }
      catch { if (!cancelled) toast.error("Could not load packages"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success(current ? "Package deactivated" : "Package activated");
    } catch {
      toast.error("Update failed");
    }
  };

  const active = packages.filter((p) => p.isActive).length;

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
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Packages</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total tiers" value={packages.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Inactive" value={packages.length - active} />
      </motion.div>

      {packages.length === 0 ? (
        <ListEmptyState title="No packages yet" hint="Package tiers will appear here once added to the database." />
      ) : (
        <motion.div variants={fadeUp} className="mt-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="border border-charcoal/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-semibold text-charcoal">{p.name}</p>
                  {p.tagline && <p className="mt-1 font-heading text-sm text-slate">{p.tagline}</p>}
                </div>
                <span className={cn(
                  statusBadgeBase,
                  p.isActive ? "border-sage/70 text-sage" : "border-charcoal/30 text-slate"
                )}>
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-4 font-display text-2xl font-semibold text-gold-dark">
                ${p.startingPrice.toLocaleString()}
                <span className="font-heading text-sm font-normal text-slate"> starting</span>
              </p>

              {p.inclusions.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {p.inclusions.slice(0, 4).map((inc, i) => (
                    <li key={i} className="flex items-center gap-2 font-heading text-xs text-slate">
                      <span className="h-px w-3 bg-gold-primary/60" />
                      {inc}
                    </li>
                  ))}
                  {p.inclusions.length > 4 && (
                    <li className="font-heading text-xs text-slate/60">
                      +{p.inclusions.length - 4} more inclusions
                    </li>
                  )}
                </ul>
              )}

              <button
                type="button"
                onClick={() => void toggle(p.id, p.isActive)}
                className="font-accent mt-6 border border-charcoal/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
              >
                {p.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
