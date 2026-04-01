"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type DestinationRow = {
  id: string;
  name: string;
  slug: string;
  country: string;
  tagline: string | null;
  starting_price: number | null;
  venue_count: number;
  is_active: boolean;
  sort_order: number;
};

export default function AdminDestinationsPage() {
  const [rows, setRows] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    country: "",
    tagline: "",
    startingPrice: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/destinations");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load");
    setRows(data.destinations ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not load destinations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const toggle = async (id: string, next: boolean) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/destinations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setRows((r) =>
        r.map((x) => (x.id === id ? { ...x, is_active: data.destination?.is_active ?? next } : x))
      );
      toast.success(next ? "Destination activated" : "Destination hidden");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setSavingId(null);
    }
  };

  const createDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const country = draft.country.trim();
    if (!name || !country) {
      toast.error("Name and country are required");
      return;
    }
    setCreating(true);
    try {
      const startingPrice =
        draft.startingPrice.trim() === "" ? undefined : Number(draft.startingPrice);
      if (startingPrice !== undefined && (!Number.isFinite(startingPrice) || startingPrice < 0)) {
        toast.error("Starting price must be a valid number");
        setCreating(false);
        return;
      }
      const res = await fetch("/api/admin/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country,
          tagline: draft.tagline.trim() || undefined,
          startingPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      await load();
      toast.success("Destination created");
      setDraft({ name: "", country: "", tagline: "", startingPrice: "" });
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Catalogue</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Destinations</h2>
          <p className="font-heading mt-2 max-w-xl text-sm text-slate">
            Data is loaded from Supabase. Toggling &quot;Active&quot; updates the database immediately. Adding a
            destination creates a slug from the name (you can edit slugs in the database if needed).
          </p>
        </div>
        <button type="button" className={dashBtn} onClick={() => setAddOpen((o) => !o)}>
          {addOpen ? "Close form" : "Add destination"}
        </button>
      </motion.div>

      {addOpen && (
        <motion.form
          variants={fadeUp}
          onSubmit={createDestination}
          className={cn(dashCard, "mt-8 space-y-4 border-dashed border-gold-primary/40")}
        >
          <p className={dashLabel}>New destination</p>
          <input
            className="w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Name (e.g. Udaipur)"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
          />
          <input
            className="w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Country"
            value={draft.country}
            onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
            required
          />
          <input
            className="w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Tagline (optional)"
            value={draft.tagline}
            onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
          />
          <input
            className="w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Starting price INR (optional)"
            inputMode="numeric"
            value={draft.startingPrice}
            onChange={(e) => setDraft((d) => ({ ...d, startingPrice: e.target.value }))}
          />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={dashBtn} disabled={creating}>
              {creating ? "Creating…" : "Create destination"}
            </button>
            <button
              type="button"
              className="font-accent border border-charcoal/20 bg-transparent px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse border border-charcoal/8 bg-charcoal/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-12">
          <ListEmptyState hint="No destinations in the database yet. Use Add destination to create one." />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <motion.div key={d.id} variants={staggerItem} className={dashCard}>
              <div className="aspect-[16/10] border border-charcoal/10 bg-gradient-to-br from-midnight/60 to-charcoal/20" />
              <h3 className="font-display mt-4 text-xl text-charcoal">{d.name}</h3>
              <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-dark">{d.country}</p>
              <p className="font-heading mt-2 line-clamp-2 text-xs text-slate">{d.tagline ?? "—"}</p>
              <div className="mt-4 space-y-2 font-heading text-sm text-slate">
                <p>
                  <span className={dashLabel}>Venues </span>
                  {d.venue_count}
                </p>
                <p>
                  <span className={dashLabel}>From </span>
                  {d.starting_price != null
                    ? `₹${(d.starting_price / 100000).toFixed(1)}L`
                    : "—"}
                </p>
              </div>
              <label className="font-accent mt-6 flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-slate">
                <input
                  type="checkbox"
                  checked={d.is_active}
                  disabled={savingId === d.id}
                  onChange={() => toggle(d.id, !d.is_active)}
                  className="h-3.5 w-3.5 border border-charcoal/30 accent-gold-primary disabled:opacity-50"
                />
                {savingId === d.id ? "Saving…" : "Active"}
              </label>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
