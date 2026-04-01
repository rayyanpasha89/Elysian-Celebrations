"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  active: boolean;
};

export default function VendorServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    basePrice: "",
    unit: "per event",
  });
  const [savingNew, setSavingNew] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: "",
    description: "",
    basePrice: "",
    unit: "per event",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/vendor/services");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = json.services ?? [];
    setServices(
      raw.map(
        (r: {
          id: string;
          name: string;
          description: string | null;
          base_price: number;
          unit: string | null;
          is_active: boolean;
        }) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? "",
          basePrice: r.base_price,
          unit: r.unit ?? "per event",
          active: r.is_active,
        })
      )
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) toast.error("Could not load services");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/vendor/services/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setServices((s) => s.filter((x) => x.id !== id));
      toast.success("Service removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (id: string) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    const next = !s.active;
    try {
      const res = await fetch(`/api/vendor/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setServices((list) => list.map((x) => (x.id === id ? { ...x, active: next } : x)));
    } catch {
      toast.error("Failed to update");
    }
  };

  const addService = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSavingNew(true);
    try {
      const res = await fetch("/api/vendor/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          basePrice: Number(draft.basePrice) || 0,
          unit: draft.unit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      setDraft({ name: "", description: "", basePrice: "", unit: "per event" });
      setShowForm(false);
      toast.success("Service added");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSavingNew(false);
    }
  };

  const beginEdit = (service: Service) => {
    setEditingServiceId(service.id);
    setEditDraft({
      name: service.name,
      description: service.description,
      basePrice: String(service.basePrice),
      unit: service.unit,
    });
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingServiceId || !editDraft.name.trim()) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/vendor/services/${editingServiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          description: editDraft.description,
          basePrice: Number(editDraft.basePrice) || 0,
          unit: editDraft.unit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      setEditingServiceId(null);
      toast.success("Service updated");
    } catch {
      toast.error("Failed to update service");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-40 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Offerings</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Services</h2>
        </div>
        <button type="button" className={dashBtn} onClick={() => setShowForm((v) => !v)}>
          Add Service
        </button>
      </motion.div>

      {showForm && (
        <motion.form
          variants={fadeUp}
          onSubmit={addService}
          className={cn(dashCard, "mt-8 space-y-4 border-dashed border-gold-primary/40")}
        >
          <p className={dashLabel}>New service</p>
          <input
            className="w-full border-0 border-b border-charcoal/20 bg-transparent py-2 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Service name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
          <textarea
            className="min-h-[80px] w-full border-0 border-b border-charcoal/20 bg-transparent py-2 font-heading text-sm outline-none focus:border-gold-primary"
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              className="w-full border-0 border-b border-charcoal/20 bg-transparent py-2 font-heading text-sm outline-none focus:border-gold-primary"
              placeholder="Base price (INR)"
              inputMode="numeric"
              value={draft.basePrice}
              onChange={(e) => setDraft((d) => ({ ...d, basePrice: e.target.value }))}
            />
            <select
              className="w-full border-0 border-b border-charcoal/20 bg-transparent py-2 font-heading text-sm outline-none focus:border-gold-primary"
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
            >
              <option value="per event">per event</option>
              <option value="per day">per day</option>
              <option value="per person">per person</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className={dashBtn} disabled={savingNew}>
              Save service
            </button>
            <button
              type="button"
              className="font-accent border border-charcoal/20 bg-transparent px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {services.length === 0 ? (
        <ListEmptyState hint="Add a service to show it in your public profile." />
      ) : (
        <ul className="mt-10 list-none space-y-6 pl-0">
          {services.map((s) => (
            <motion.li key={s.id} variants={staggerItem} className={dashCard}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                <div>
                  <h3 className="font-display text-xl text-charcoal">{s.name}</h3>
                  <p className="font-heading mt-2 max-w-2xl text-sm font-light text-slate">{s.description}</p>
                </div>
              <div className="flex flex-wrap items-center gap-3">
                  <label className="font-accent flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-slate">
                    <input
                      type="checkbox"
                      checked={s.active}
                      onChange={() => toggleActive(s.id)}
                      className="h-3.5 w-3.5 border border-charcoal/30 accent-gold-primary"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    className="font-accent border border-charcoal/15 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                    onClick={() => beginEdit(s)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="font-accent border border-charcoal/15 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal/60 hover:border-error hover:text-error"
                    onClick={() => remove(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="font-heading mt-4 text-sm text-charcoal">
                <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">From </span>₹
                {s.basePrice.toLocaleString("en-IN")}
                <span className="font-accent ml-2 text-[10px] uppercase tracking-[0.15em] text-slate">{s.unit}</span>
              </p>
              {editingServiceId === s.id ? (
                <form
                  onSubmit={saveEdit}
                  className="mt-5 space-y-4 border-t border-charcoal/8 pt-5"
                >
                  <p className={dashLabel}>Edit service</p>
                  <input
                    value={editDraft.name}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    placeholder="Service name"
                  />
                  <textarea
                    value={editDraft.description}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-[90px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    placeholder="Description"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={editDraft.basePrice}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          basePrice: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                      placeholder="Base price"
                    />
                    <select
                      value={editDraft.unit}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, unit: event.target.value }))
                      }
                      className="w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    >
                      <option value="per event">per event</option>
                      <option value="per day">per day</option>
                      <option value="per person">per person</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className={dashBtn} disabled={savingEdit}>
                      {savingEdit ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      className="font-accent border border-charcoal/20 bg-transparent px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary"
                      onClick={() => setEditingServiceId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
