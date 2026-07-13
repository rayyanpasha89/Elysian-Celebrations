"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Plus, Search, Star, Store, Trash2, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type Category = { id: string; name: string; slug: string };
type VendorRow = {
  id: string;
  businessName: string;
  slug: string;
  city: string | null;
  description: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  serviceCount: number;
};
type Service = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | null;
  maxPrice: number | null;
  unit: string | null;
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vendors");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load vendors");
      setVendors((json.vendors ?? []) as VendorRow[]);
      setCategories((json.categories ?? []) as Category[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return vendors.filter((v) => {
      if (catFilter !== "all" && v.categoryId !== catFilter) return false;
      if (term && !`${v.businessName} ${v.city ?? ""} ${v.categoryName ?? ""}`.toLowerCase().includes(term))
        return false;
      return true;
    });
  }, [vendors, q, catFilter]);

  const stats = useMemo(
    () => ({
      total: vendors.length,
      verified: vendors.filter((v) => v.isVerified).length,
      featured: vendors.filter((v) => v.isFeatured).length,
    }),
    [vendors]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading vendors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border border-charcoal/10 bg-cream/40 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-dark">
            Vendor management
          </p>
          <h1 className="mt-1 font-display text-2xl text-charcoal">
            {stats.total} vendors · {stats.verified} verified · {stats.featured} featured
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="font-accent inline-flex items-center justify-center gap-2 border border-gold-primary bg-gold-primary px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-midnight shadow-[0_14px_36px_rgba(201,169,110,0.18)] transition-all hover:bg-gold-dark hover:border-gold-dark"
        >
          <Plus className="h-4 w-4" /> Add vendor
        </button>
      </section>

      {/* filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 border border-charcoal/15 bg-ivory px-3 lg:w-72">
          <Search className="h-4 w-4 shrink-0 text-slate" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vendors…"
            className="w-full bg-transparent py-2 font-heading text-sm text-charcoal outline-none placeholder:text-slate/60"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCatFilter("all")}
            className={cn(
              "border px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
              catFilter === "all" ? "border-gold-primary bg-gold-primary/10 text-gold-dark" : "border-charcoal/12 text-slate"
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className={cn(
                "border px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
                catFilter === c.id ? "border-gold-primary bg-gold-primary/10 text-gold-dark" : "border-charcoal/12 text-slate hover:border-gold-primary/40"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setEditingId(v.id)}
            className="group flex flex-col border border-charcoal/10 bg-ivory p-4 text-left transition-all hover:-translate-y-0.5 hover:border-gold-primary/40 hover:shadow-[0_14px_36px_rgba(51,61,41,0.08)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-primary/10 text-gold-dark">
                  <Store className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-base text-charcoal">{v.businessName}</p>
                  <p className="truncate text-xs text-slate">{v.categoryName ?? "Uncategorised"}</p>
                </div>
              </div>
              {v.isFeatured ? <Star className="h-3.5 w-3.5 shrink-0 fill-gold-primary text-gold-primary" /> : null}
            </div>
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate">
              {v.description || "No description yet."}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-charcoal/8 pt-3">
              <span className="font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
                {v.city ?? "—"} · {v.serviceCount} {v.serviceCount === 1 ? "service" : "services"}
              </span>
              <span
                className={cn(
                  "border px-2 py-0.5 font-accent text-[9px] uppercase tracking-[0.12em]",
                  v.isVerified ? "border-sage/35 bg-sage/10 text-sage" : "border-charcoal/12 text-slate"
                )}
              >
                {v.isVerified ? "Verified" : "Pending"}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 ? (
          <div className="border border-dashed border-charcoal/15 bg-ivory p-10 text-center text-sm text-slate sm:col-span-2 xl:col-span-3">
            No vendors match.
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {adding ? (
          <AddVendorModal
            categories={categories}
            onClose={() => setAdding(false)}
            onCreated={(id) => {
              setAdding(false);
              void load().then(() => setEditingId(id));
            }}
          />
        ) : null}
        {editingId ? (
          <VendorEditor
            key={editingId}
            vendorId={editingId}
            categories={categories}
            onClose={() => setEditingId(null)}
            onChanged={() => void load()}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Add vendor ─────────────────────────────────────────────────────────────

function AddVendorModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name, categoryId, city, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create vendor");
      toast.success("Vendor created");
      onCreated(json.vendor.id as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create vendor");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <form onSubmit={submit}>
        <ModalHeader title="Add vendor" subtitle="Create a managed vendor profile" onClose={onClose} />
        <div className="space-y-3 px-5 py-5">
          <Labeled label="Business name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. House of Petals"
              className="w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
          </Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Category">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Udaipur"
                className="w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              />
            </Labeled>
          </div>
          <Labeled label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this vendor is known for…"
              className="min-h-[80px] w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
          </Labeled>
        </div>
        <div className="flex justify-end gap-2 border-t border-charcoal/10 px-5 py-4">
          <button type="button" onClick={onClose} className="font-accent border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="font-accent border border-gold-primary bg-gold-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-midnight transition-all hover:bg-gold-dark hover:border-gold-dark disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create vendor"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ─── Vendor editor (profile + services) ─────────────────────────────────────

function VendorEditor({
  vendorId,
  categories,
  onClose,
  onChanged,
}: {
  vendorId: string;
  categories: Category[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/vendors/${vendorId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load vendor");
        const v = json.vendor;
        setName(v.businessName ?? "");
        setCategoryId(v.categoryId ?? "");
        setCity(v.city ?? "");
        setDescription(v.description ?? "");
        setIsVerified(Boolean(v.isVerified));
        setIsFeatured(Boolean(v.isFeatured));
        setServices((json.services ?? []) as Service[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load vendor");
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId, onClose]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name, categoryId, city, description, isVerified, isFeatured }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save");
      }
      toast.success("Vendor updated");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this vendor and its services?")) return;
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to delete");
      toast.success("Vendor deleted");
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const addService = async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New service", basePrice: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add service");
      setServices((s) => [...s, json.service as Service]);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add service");
    }
  };

  const saveService = async (svc: Service) => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/services`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: svc.id,
          name: svc.name,
          basePrice: svc.basePrice,
          maxPrice: svc.maxPrice,
          unit: svc.unit,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save service");
      }
      toast.success("Service saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save service");
    }
  };

  const deleteService = async (id: string) => {
    const service = services.find((entry) => entry.id === id);
    if (
      deletingServiceId ||
      !window.confirm(
        `Remove ${service?.name ?? "this service"}? This permanently removes its catalogue and reference imagery.`
      )
    ) {
      return;
    }

    setDeletingServiceId(id);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/services?serviceId=${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to delete service");
      setServices((current) => current.filter((entry) => entry.id !== id));
      toast.success("Service removed");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service");
    } finally {
      setDeletingServiceId(null);
    }
  };

  return (
    <Overlay onClose={onClose} wide>
      <ModalHeader title={name || "Vendor"} subtitle="Edit profile & services" onClose={onClose} />
      {loading ? (
        <div className="p-10 text-center">
          <p className={dashLabel}>Loading…</p>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {/* profile */}
          <div className="space-y-3">
            <Labeled label="Business name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              />
            </Labeled>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Category">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="City">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
              </Labeled>
            </div>
            <Labeled label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[70px] w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              />
            </Labeled>
            <div className="flex flex-wrap gap-2">
              <Toggle on={isVerified} onClick={() => setIsVerified((v) => !v)} label="Verified" />
              <Toggle on={isFeatured} onClick={() => setIsFeatured((v) => !v)} label="Featured" />
            </div>
          </div>

          {/* services */}
          <div className="mt-6 border-t border-charcoal/8 pt-5">
            <div className="flex items-center justify-between">
              <p className={dashLabel}>Services & prices</p>
              <button
                type="button"
                onClick={addService}
                className="font-accent inline-flex items-center gap-1.5 border border-charcoal/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
              >
                <Plus className="h-3 w-3" /> Add service
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {services.length === 0 ? (
                <p className="border border-dashed border-charcoal/12 px-3 py-5 text-center text-xs text-slate">
                  No services yet.
                </p>
              ) : (
                services.map((svc) => (
                  <ServiceRow
                    key={svc.id}
                    service={svc}
                    onChange={(next) => setServices((arr) => arr.map((x) => (x.id === svc.id ? next : x)))}
                    onSave={() => saveService(services.find((x) => x.id === svc.id) ?? svc)}
                    onDelete={() => deleteService(svc.id)}
                    deleteDisabled={deletingServiceId !== null}
                    isDeleting={deletingServiceId === svc.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 px-5 py-4">
        <button
          type="button"
          onClick={remove}
          className="font-accent inline-flex items-center gap-1.5 px-3 py-2.5 text-[10px] uppercase tracking-[0.18em] text-rose transition-colors hover:underline"
        >
          <Trash2 className="h-3 w-3" /> Delete vendor
        </button>
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={savingProfile}
          className="font-accent border border-gold-primary bg-gold-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-midnight transition-all hover:bg-gold-dark hover:border-gold-dark disabled:opacity-50"
        >
          {savingProfile ? "Saving..." : "Save profile"}
        </button>
      </div>
    </Overlay>
  );
}

function ServiceRow({
  service,
  onChange,
  onSave,
  onDelete,
  deleteDisabled,
  isDeleting,
}: {
  service: Service;
  onChange: (next: Service) => void;
  onSave: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="border border-charcoal/10 bg-cream/20 p-3">
      <div className="flex items-center gap-2">
        <input
          value={service.name}
          onChange={(e) => onChange({ ...service, name: e.target.value })}
          onBlur={onSave}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          aria-label={isDeleting ? "Deleting service" : "Delete service"}
          className="text-slate hover:text-rose disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <PriceInput label="Base ₹" value={service.basePrice} onChange={(v) => onChange({ ...service, basePrice: v })} onSave={onSave} />
        <PriceInput label="Max ₹" value={service.maxPrice} onChange={(v) => onChange({ ...service, maxPrice: v })} onSave={onSave} />
        <label className="block">
          <span className="font-accent text-[9px] uppercase tracking-[0.12em] text-slate">Unit</span>
          <input
            value={service.unit ?? ""}
            onChange={(e) => onChange({ ...service, unit: e.target.value })}
            onBlur={onSave}
            placeholder="per event"
            className="mt-0.5 w-full border border-charcoal/15 bg-transparent px-2 py-1.5 font-heading text-xs text-charcoal outline-none focus:border-gold-primary"
          />
        </label>
      </div>
      {service.basePrice != null ? (
        <p className="mt-1.5 text-[11px] text-slate">Listed: {formatCurrency(service.basePrice)}{service.unit ? ` ${service.unit}` : ""}</p>
      ) : null}
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
  onSave,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onSave: () => void;
}) {
  return (
    <label className="block">
      <span className="font-accent text-[9px] uppercase tracking-[0.12em] text-slate">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        onBlur={onSave}
        placeholder="0"
        className="mt-0.5 w-full border border-charcoal/15 bg-transparent px-2 py-1.5 font-heading text-xs text-charcoal outline-none focus:border-gold-primary"
      />
    </label>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-midnight/45 p-4 backdrop-blur"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full border border-charcoal/12 bg-ivory shadow-[0_40px_120px_rgba(51,61,41,0.35)]",
          wide ? "max-w-2xl" : "max-w-lg"
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-charcoal/10 px-5 py-4">
      <div className="min-w-0">
        <p className={dashLabel}>{subtitle}</p>
        <p className="mt-0.5 truncate font-display text-lg text-charcoal">{title}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-charcoal/15 text-lg leading-none text-slate transition-colors hover:border-gold-primary hover:text-gold-dark"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
        on ? "border-sage/40 bg-sage/10 text-sage" : "border-charcoal/15 text-slate hover:border-gold-primary/50"
      )}
    >
      {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </button>
  );
}
