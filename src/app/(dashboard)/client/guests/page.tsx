"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashBtn, dashLabel, rsvpBadgeClass, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Rsvp = "CONFIRMED" | "PENDING" | "DECLINED" | "MAYBE";
type Side = "BRIDE" | "GROOM" | "COUPLE" | "MUTUAL";

type GuestRow = {
  id: string;
  name: string;
  side: Side;
  rsvp: Rsvp;
  meal: string;
  plusOne: boolean;
};

const tabs = ["All", "Confirmed", "Pending", "Declined"] as const;
type Tab = (typeof tabs)[number];

function sideLabel(s: Side) {
  if (s === "BRIDE") return "Bride";
  if (s === "GROOM") return "Groom";
  if (s === "COUPLE") return "Couple";
  return "Mutual";
}

export default function ClientGuestsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    side: "COUPLE" as Side,
    mealPref: "",
    plusOne: false,
    notes: "",
  });
  const [counts, setCounts] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
  });

  const loadGuests = useCallback(async () => {
    const res = await fetch("/api/guests");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = json.guests ?? [];
    const mapped: GuestRow[] = raw.map(
      (g: {
        id: string;
        name: string;
        side: Side;
        rsvp_status: Rsvp;
        meal_pref: string | null;
        plus_one: boolean;
      }) => ({
        id: g.id,
        name: g.name,
        side: g.side,
        rsvp: g.rsvp_status,
        meal: g.meal_pref ?? "—",
        plusOne: g.plus_one,
      })
    );
    setGuests(mapped);
    setCounts(
      json.counts ?? {
        total: mapped.length,
        confirmed: mapped.filter((x) => x.rsvp === "CONFIRMED").length,
        pending: mapped.filter((x) => x.rsvp === "PENDING" || x.rsvp === "MAYBE")
          .length,
        declined: mapped.filter((x) => x.rsvp === "DECLINED").length,
      }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGuests();
      } catch {
        if (!cancelled) {
          setGuests([]);
          setCounts({ total: 0, confirmed: 0, pending: 0, declined: 0 });
          toast.error("Could not load guests");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadGuests]);

  const addGuest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          side: draft.side,
          mealPref: draft.mealPref.trim() || null,
          plusOne: draft.plusOne,
          notes: draft.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setDraft({
        name: "",
        side: "COUPLE",
        mealPref: "",
        plusOne: false,
        notes: "",
      });
      setShowForm(false);
      await loadGuests();
      toast.success("Guest added");
    } catch {
      toast.error("Failed to add guest");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (tab === "All") return guests;
    if (tab === "Confirmed") return guests.filter((g) => g.rsvp === "CONFIRMED");
    if (tab === "Pending")
      return guests.filter((g) => g.rsvp === "PENDING" || g.rsvp === "MAYBE");
    return guests.filter((g) => g.rsvp === "DECLINED");
  }, [tab, guests]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-56 bg-charcoal/10" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 border border-charcoal/8 bg-charcoal/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Guest list</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            RSVP & preferences
          </h2>
        </div>
        <button type="button" className={dashBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close form" : "Add Guest"}
        </button>
      </motion.div>

      {showForm ? (
        <motion.form
          variants={fadeUp}
          onSubmit={addGuest}
          className="mt-6 border border-charcoal/8 bg-ivory p-5"
        >
          <p className={dashLabel}>New guest</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Guest name"
              className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
            <select
              value={draft.side}
              onChange={(event) =>
                setDraft((current) => ({ ...current, side: event.target.value as Side }))
              }
              className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            >
              <option value="COUPLE">Couple</option>
              <option value="BRIDE">Bride</option>
              <option value="GROOM">Groom</option>
              <option value="MUTUAL">Mutual</option>
            </select>
            <input
              type="text"
              value={draft.mealPref}
              onChange={(event) =>
                setDraft((current) => ({ ...current, mealPref: event.target.value }))
              }
              placeholder="Meal preference"
              className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
            <label className="flex items-center gap-3 border border-charcoal/15 px-4 py-3 font-heading text-sm text-charcoal">
              <input
                type="checkbox"
                checked={draft.plusOne}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, plusOne: event.target.checked }))
                }
                className="h-4 w-4 accent-gold-primary"
              />
              Plus one
            </label>
          </div>
          <textarea
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Notes, allergies, table placement..."
            className="mt-4 min-h-[96px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className={dashBtn} disabled={saving}>
              {saving ? "Saving..." : "Save guest"}
            </button>
            <button
              type="button"
              className="font-accent border border-charcoal/15 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </motion.form>
      ) : null}

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total guests" value={counts.total} />
        <StatCard label="Confirmed" value={counts.confirmed} />
        <StatCard label="Pending" value={counts.pending} />
        <StatCard label="Declined" value={counts.declined} />
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
                    : "border-transparent text-slate hover:text-charcoal"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState hint="Add guests to your list or complete onboarding to create a guest list." />
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
                        g.plusOne ? "border-charcoal/20 text-charcoal" : "border-charcoal/10 text-slate"
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
