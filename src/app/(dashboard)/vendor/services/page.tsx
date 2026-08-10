"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import {
  PresetTagInput,
  DIETARY_TAG_OPTIONS,
  type PlannerOption,
} from "@/components/dashboard/planner-inputs";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { categoryCopy } from "@/lib/vendor-offering";
import { cn } from "@/lib/utils";

/** Turn the example string lists into PresetTagInput suggestions. */
function toOptions(values: string[]): PlannerOption[] {
  return values.map((label) => ({ value: label, label }));
}

type ServiceItem = {
  id?: string;
  itemType: string;
  name: string;
  description: string;
  dietaryTags: string[];
  imageUrls: string[];
  referenceUrl: string;
  sortOrder: number;
};

type Service = {
  id: string;
  name: string;
  description: string;
  serviceScope: string;
  basePrice: number;
  maxPrice: number | null;
  unit: string;
  eventTypeFit: string[];
  inclusions: string[];
  deliverables: string[];
  addOns: string[];
  items: ServiceItem[];
  active: boolean;
};

type DraftState = {
  name: string;
  description: string;
  serviceScope: string;
  basePrice: string;
  maxPrice: string;
  unit: string;
  eventTypeFit: string;
  inclusions: string;
  deliverables: string;
  addOns: string;
  items: ServiceItem[];
};

const EMPTY_DRAFT: DraftState = {
  name: "",
  description: "",
  serviceScope: "",
  basePrice: "",
  maxPrice: "",
  unit: "per event",
  eventTypeFit: "",
  inclusions: "",
  deliverables: "",
  addOns: "",
  items: [],
};

const inputBase =
  "w-full border border-charcoal/15 bg-ivory px-3 py-2.5 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary";
const textareaBase =
  "min-h-[88px] w-full border border-charcoal/15 bg-ivory px-3 py-2.5 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary";

function splitToList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function listToTextarea(values: string[] | null | undefined) {
  return (values ?? []).join("\n");
}

function buildDraftFromService(service: Service): DraftState {
  return {
    name: service.name,
    description: service.description,
    serviceScope: service.serviceScope,
    basePrice: service.basePrice ? String(service.basePrice) : "",
    maxPrice: service.maxPrice ? String(service.maxPrice) : "",
    unit: service.unit || "per event",
    eventTypeFit: listToTextarea(service.eventTypeFit),
    inclusions: listToTextarea(service.inclusions),
    deliverables: listToTextarea(service.deliverables),
    addOns: listToTextarea(service.addOns),
    items: service.items.map((item) => ({ ...item })),
  };
}

function buildPayload(draft: DraftState, defaultItemType: string) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    serviceScope: draft.serviceScope.trim(),
    basePrice: Number(draft.basePrice) || 0,
    maxPrice: draft.maxPrice ? Number(draft.maxPrice) : null,
    unit: draft.unit,
    eventTypeFit: splitToList(draft.eventTypeFit),
    inclusions: splitToList(draft.inclusions),
    deliverables: splitToList(draft.deliverables),
    addOns: splitToList(draft.addOns),
    items: draft.items
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        ...(item.id ? { id: item.id } : {}),
        itemType: item.itemType || defaultItemType,
        name: item.name.trim(),
        description: item.description.trim(),
        dietaryTags: item.dietaryTags,
        imageUrls: item.imageUrls,
        referenceUrl: item.referenceUrl.trim(),
        sortOrder: item.sortOrder ?? index,
      })),
  };
}

function mapApiService(raw: ApiService): Service {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    serviceScope: raw.service_scope ?? "",
    basePrice: raw.base_price ?? 0,
    maxPrice: raw.max_price ?? null,
    unit: raw.unit ?? "per event",
    eventTypeFit: raw.event_type_fit ?? [],
    inclusions: raw.inclusions ?? [],
    deliverables: raw.deliverables ?? [],
    addOns: raw.add_ons ?? [],
    items: (raw.items ?? []).map((item) => ({
      id: item.id,
      itemType: item.item_type ?? "inclusion",
      name: item.name,
      description: item.description ?? "",
      dietaryTags: item.dietary_tags ?? [],
      imageUrls: item.image_urls ?? [],
      referenceUrl: item.reference_url ?? "",
      sortOrder: item.sort_order ?? 0,
    })),
    active: raw.is_active ?? true,
  };
}

type ApiServiceItem = {
  id: string;
  item_type: string | null;
  name: string;
  description: string | null;
  dietary_tags: string[] | null;
  image_urls: string[] | null;
  reference_url: string | null;
  sort_order: number | null;
};

type ApiService = {
  id: string;
  name: string;
  description: string | null;
  service_scope: string | null;
  base_price: number | null;
  max_price: number | null;
  unit: string | null;
  event_type_fit: string[] | null;
  inclusions: string[] | null;
  deliverables: string[] | null;
  add_ons: string[] | null;
  is_active: boolean | null;
  items: ApiServiceItem[] | null;
};

export default function VendorServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editDraft, setEditDraft] = useState<DraftState>(EMPTY_DRAFT);

  const copy = useMemo(() => categoryCopy(categorySlug), [categorySlug]);

  const load = useCallback(async () => {
    const res = await fetch("/api/vendor/services");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw: ApiService[] = json.services ?? [];
    setCategorySlug(typeof json.categorySlug === "string" ? json.categorySlug : null);
    setServices(raw.map(mapApiService));
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
    const service = services.find((entry) => entry.id === id);
    if (
      !window.confirm(
        `Remove ${service?.name ?? "this service"}? This permanently removes its catalogue and reference imagery.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/vendor/services/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setServices((s) => s.filter((x) => x.id !== id));
      toast.success("Service removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service");
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
        body: JSON.stringify(buildPayload(draft, copy.defaultItemType)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      setDraft(EMPTY_DRAFT);
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
    setEditDraft(buildDraftFromService(service));
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingServiceId || !editDraft.name.trim()) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/vendor/services/${editingServiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editDraft, copy.defaultItemType)),
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
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className={dashLabel}>Offerings</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Services and catalogue
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
            Build packages that mirror what you actually offer — scope, inclusions,
            deliverables, add-ons, and itemized {copy.catalogueLabel.toLowerCase()}.
            Clients see this exact catalogue on your public profile.
          </p>
        </div>
        <button
          type="button"
          className={dashBtn}
          onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) setDraft(EMPTY_DRAFT);
          }}
        >
          {showForm ? "Close form" : "Add service"}
        </button>
      </motion.div>

      {showForm && (
        <motion.form
          variants={fadeUp}
          onSubmit={addService}
          className={cn(dashCard, "mt-8 space-y-6 border-dashed border-gold-primary/40")}
        >
          <p className={dashLabel}>New service</p>
          <ServiceEditor
            draft={draft}
            onChange={setDraft}
            copy={copy}
          />
          <div className="flex gap-3">
            <button type="submit" className={dashBtn} disabled={savingNew}>
              {savingNew ? "Saving..." : "Save service"}
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
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-charcoal">{s.name}</h3>
                  {s.serviceScope ? (
                    <p className="font-heading mt-2 max-w-2xl text-sm font-light text-charcoal">
                      {s.serviceScope}
                    </p>
                  ) : null}
                  {s.description ? (
                    <p className="font-heading mt-2 max-w-2xl text-sm font-light text-slate">
                      {s.description}
                    </p>
                  ) : null}
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
                <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
                  From{" "}
                </span>
                ₹{s.basePrice.toLocaleString("en-IN")}
                {s.maxPrice ? (
                  <span className="text-slate"> – ₹{s.maxPrice.toLocaleString("en-IN")}</span>
                ) : null}
                <span className="font-accent ml-2 text-[10px] uppercase tracking-[0.15em] text-slate">
                  {s.unit}
                </span>
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SummaryBlock title="Best fit events" items={s.eventTypeFit} />
                <SummaryBlock title="Inclusions" items={s.inclusions} />
                <SummaryBlock title="Deliverables" items={s.deliverables} />
                <SummaryBlock title="Add-ons" items={s.addOns} />
              </div>

              {s.items.length > 0 ? (
                <div className="mt-5 border-t border-charcoal/8 pt-4">
                  <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                    {copy.catalogueLabel} ({s.items.length})
                  </p>
                  <ul className="mt-3 list-none space-y-2 pl-0">
                    {s.items.map((item) => (
                      <li
                        key={item.id ?? item.name}
                        className="border border-charcoal/8 bg-cream/35 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-heading text-sm text-charcoal">{item.name}</p>
                          <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
                            {labelForItemType(item.itemType)}
                          </span>
                        </div>
                        {item.description ? (
                          <p className="mt-2 text-xs leading-relaxed text-slate">
                            {item.description}
                          </p>
                        ) : null}
                        {item.dietaryTags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.dietaryTags.map((tag) => (
                              <span
                                key={tag}
                                className="border border-sage/30 px-2 py-0.5 font-heading text-[10px] text-sage"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.imageUrls.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.imageUrls.slice(0, 4).map((url, i) => (
                              <div
                                key={`${url}-${i}`}
                                className="h-12 w-12 overflow-hidden border border-charcoal/10 bg-cream/40"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  width={48}
                                  height={48}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                            {item.imageUrls.length > 4 ? (
                              <div className="flex h-12 w-12 items-center justify-center border border-charcoal/10 bg-cream/40 text-[10px] text-charcoal/60">
                                +{item.imageUrls.length - 4}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {editingServiceId === s.id ? (
                <form
                  onSubmit={saveEdit}
                  className="mt-6 space-y-6 border-t border-charcoal/8 pt-5"
                >
                  <p className={dashLabel}>Edit service</p>
                  <ServiceEditor
                    draft={editDraft}
                    onChange={setEditDraft}
                    copy={copy}
                    serviceId={s.id}
                  />
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

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="border border-charcoal/8 bg-cream/35 p-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.slice(0, 8).map((item) => (
          <span
            key={item}
            className="border border-charcoal/10 bg-ivory px-2 py-1 font-heading text-[11px] text-charcoal"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ServiceEditor({
  draft,
  onChange,
  copy,
  serviceId,
}: {
  draft: DraftState;
  onChange: (next: DraftState) => void;
  copy: ReturnType<typeof categoryCopy>;
  /**
   * Required for media uploads. New services (no id yet) get the URL-paste
   * fallback only; ItemMediaEditor shows a hint to save first.
   */
  serviceId?: string | null;
}) {
  const updateField = <K extends keyof DraftState>(field: K, value: DraftState[K]) =>
    onChange({ ...draft, [field]: value });

  const addItem = () =>
    onChange({
      ...draft,
      items: [
        ...draft.items,
        {
          itemType: copy.defaultItemType,
          name: "",
          description: "",
          dietaryTags: [],
          imageUrls: [],
          referenceUrl: "",
          sortOrder: draft.items.length,
        },
      ],
    });

  const updateItem = (index: number, patch: Partial<ServiceItem>) => {
    onChange({
      ...draft,
      items: draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...draft,
      items: draft.items.filter((_, i) => i !== index),
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return;
    const next = [...draft.items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({
      ...draft,
      items: next.map((item, i) => ({ ...item, sortOrder: i })),
    });
  };

  const duplicateItem = (index: number) => {
    const source = draft.items[index];
    if (!source) return;
    const copy: ServiceItem = {
      itemType: source.itemType,
      name: source.name ? `${source.name} (copy)` : "",
      description: source.description,
      dietaryTags: [...source.dietaryTags],
      imageUrls: [...source.imageUrls],
      referenceUrl: source.referenceUrl,
      sortOrder: index + 1,
    };
    const next = [
      ...draft.items.slice(0, index + 1),
      copy,
      ...draft.items.slice(index + 1),
    ];
    onChange({
      ...draft,
      items: next.map((item, i) => ({ ...item, sortOrder: i })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            Service name
          </span>
          <input
            className={cn(inputBase, "mt-2")}
            placeholder="Signature wedding package"
            value={draft.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            Pricing unit
          </span>
          <select
            className={cn(inputBase, "mt-2")}
            value={draft.unit}
            onChange={(e) => updateField("unit", e.target.value)}
          >
            <option value="per event">per event</option>
            <option value="per day">per day</option>
            <option value="per person">per person</option>
            <option value="per look">per look</option>
            <option value="per setup">per setup</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
          Short description
        </span>
        <textarea
          className={cn(textareaBase, "mt-2")}
          placeholder="One-line summary couples will see beside the package title."
          value={draft.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
          Service scope
        </span>
        <textarea
          className={cn(textareaBase, "mt-2")}
          placeholder={copy.scopePrompt}
          value={draft.serviceScope}
          onChange={(e) => updateField("serviceScope", e.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            Base price (INR)
          </span>
          <input
            className={cn(inputBase, "mt-2")}
            inputMode="numeric"
            placeholder="e.g. 150000"
            value={draft.basePrice}
            onChange={(e) => updateField("basePrice", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            Upper bound (optional)
          </span>
          <input
            className={cn(inputBase, "mt-2")}
            inputMode="numeric"
            placeholder="e.g. 350000"
            value={draft.maxPrice}
            onChange={(e) => updateField("maxPrice", e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ListField
          label="Best fit events"
          hint="Tap the event types this service suits."
          suggestions={toOptions(copy.exampleEventFit)}
          value={draft.eventTypeFit}
          onChange={(value) => updateField("eventTypeFit", value)}
        />
        <ListField
          label="Inclusions"
          hint="What's covered. Tap a suggestion or add your own."
          suggestions={toOptions(copy.exampleInclusions)}
          value={draft.inclusions}
          onChange={(value) => updateField("inclusions", value)}
        />
        <ListField
          label="Deliverables"
          hint="What the client receives."
          suggestions={toOptions(copy.exampleDeliverables)}
          value={draft.deliverables}
          onChange={(value) => updateField("deliverables", value)}
        />
        <ListField
          label="Add-ons"
          hint="Optional extras they can layer on."
          suggestions={toOptions(copy.exampleAddOns)}
          value={draft.addOns}
          onChange={(value) => updateField("addOns", value)}
        />
      </div>

      <div className="border border-charcoal/8 bg-cream/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
              {copy.catalogueLabel}
              {draft.items.length > 0 ? (
                <span className="ml-2 text-charcoal/60">({draft.items.length})</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate">
              {copy.catalogueHint}
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="font-accent border border-charcoal/20 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-charcoal hover:border-gold-primary hover:text-gold-dark"
          >
            Add row
          </button>
        </div>

        {draft.items.length === 0 ? (
          <div className="mt-4 border border-dashed border-charcoal/15 bg-ivory/60 p-4">
            <p className="font-heading text-sm text-charcoal">
              No itemized rows yet
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate">
              Clients currently only see your package summary. Add rows for what
              clients actually receive — e.g.{" "}
              <span className="text-charcoal">
                {copy.exampleItemNames.join(", ")}
              </span>
              . Each row can have a short description{copy.showDietary ? " and dietary tags" : ""}.
            </p>
            <button
              type="button"
              onClick={addItem}
              className="mt-3 font-accent border border-gold-primary/40 bg-ivory px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gold-dark hover:bg-gold-primary/10"
            >
              Add first row
            </button>
          </div>
        ) : (
          <ul className="mt-4 list-none space-y-3 pl-0">
            {draft.items.map((item, index) => (
              <li
                key={index}
                className="border border-charcoal/10 bg-ivory p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                    Row {index + 1} of {draft.items.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label="Move row up"
                      className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] tracking-[0.16em] text-charcoal hover:border-gold-primary hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-charcoal/15 disabled:hover:text-charcoal"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === draft.items.length - 1}
                      aria-label="Move row down"
                      className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] tracking-[0.16em] text-charcoal hover:border-gold-primary hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-charcoal/15 disabled:hover:text-charcoal"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateItem(index)}
                      className="font-accent border border-charcoal/15 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-charcoal hover:border-gold-primary hover:text-gold-dark"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="font-accent border border-charcoal/15 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-charcoal/60 hover:border-error hover:text-error"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
                  <select
                    className={cn(inputBase, "py-2")}
                    value={item.itemType || copy.defaultItemType}
                    onChange={(e) =>
                      updateItem(index, { itemType: e.target.value })
                    }
                  >
                    {copy.itemTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={cn(inputBase, "py-2")}
                    placeholder={copy.itemNamePrompt}
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                  />
                </div>
                <textarea
                  className={cn(textareaBase, "mt-3 min-h-[64px]")}
                  placeholder="Optional detail couples will read on the public profile."
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, { description: e.target.value })
                  }
                />
                {copy.showDietary ? (
                  <div className="mt-3">
                    <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                      Dietary tags
                    </span>
                    <div className="mt-2">
                      <PresetTagInput
                        suggestions={DIETARY_TAG_OPTIONS}
                        value={item.dietaryTags}
                        onChange={(tags) => updateItem(index, { dietaryTags: tags })}
                        placeholder="Add a dietary tag"
                      />
                    </div>
                  </div>
                ) : null}
                <ItemMediaEditor
                  imageUrls={item.imageUrls}
                  referenceUrl={item.referenceUrl}
                  onChange={(patch) => updateItem(index, patch)}
                  serviceId={serviceId ?? null}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ItemMediaEditor({
  imageUrls,
  referenceUrl,
  onChange,
  serviceId,
}: {
  imageUrls: string[];
  referenceUrl: string;
  onChange: (patch: Partial<ServiceItem>) => void;
  /** Service must be saved before uploads are allowed. */
  serviceId: string | null;
}) {
  const [draftUrl, setDraftUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_IMAGES = 6;
  const remaining = MAX_IMAGES - imageUrls.length;
  const canUpload = Boolean(serviceId) && remaining > 0 && !uploading;

  const pushUrl = (url: string) => {
    if (imageUrls.includes(url) || imageUrls.length >= MAX_IMAGES) return;
    onChange({ imageUrls: [...imageUrls, url] });
  };

  const tryAdd = () => {
    const trimmed = draftUrl.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    } catch {
      return;
    }
    if (imageUrls.includes(trimmed)) {
      setDraftUrl("");
      return;
    }
    if (imageUrls.length >= MAX_IMAGES) return;
    onChange({ imageUrls: [...imageUrls, trimmed] });
    setDraftUrl("");
  };

  const removeAt = (target: number) => {
    onChange({
      imageUrls: imageUrls.filter((_, i) => i !== target),
    });
  };

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!serviceId) {
        toast.error("Save the service first, then upload images");
        return;
      }
      const allowed = files
        .filter((file) =>
          ["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
        .slice(0, remaining);

      if (files.length > 0 && allowed.length === 0) {
        toast.error("Only JPEG, PNG, or WebP images are accepted");
        return;
      }

      setUploading(true);
      try {
        for (const file of allowed) {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch(
            `/api/vendor/services/${serviceId}/images`,
            { method: "POST", body: form }
          );
          const json = await res.json();
          if (!res.ok) {
            toast.error(json.error ?? "Upload failed");
            continue;
          }
          if (typeof json.url === "string") pushUrl(json.url);
        }
      } finally {
        setUploading(false);
      }
    },
    // pushUrl + imageUrls referenced via the closure; we don't want to thrash
    // the callback identity on every keystroke. Service id is the meaningful key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceId, remaining]
  );

  const onFilesPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) void uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) void uploadFiles(files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canUpload) return;
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  return (
    <div className="mt-3 space-y-3 border-t border-charcoal/8 pt-3">
      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
          Reference imagery
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate/80">
          Up to {MAX_IMAGES} images per row. Clients see these as thumbnails on
          your profile and inside the Event Editor catalogue preview.
        </p>
      </div>

      {imageUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative h-14 w-14 overflow-hidden border border-charcoal/10 bg-cream/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Reference ${i + 1}`}
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove image"
                className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center bg-midnight/70 text-[10px] text-ivory opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {serviceId ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "border border-dashed px-4 py-5 text-center transition-colors",
            isDragging
              ? "border-gold-primary bg-gold-primary/10"
              : "border-charcoal/15 bg-cream/30"
          )}
        >
          <p className="text-[11px] leading-relaxed text-slate/80">
            {uploading
              ? "Uploading…"
              : isDragging
                ? "Drop to upload"
                : "Drop images here, or"}{" "}
            {!uploading && !isDragging ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canUpload}
                className="font-accent inline text-[10px] uppercase tracking-[0.18em] text-gold-dark underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                browse files
              </button>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] text-slate/60">
            JPEG · PNG · WebP, up to 4 MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onFilesPicked}
          />
        </div>
      ) : (
        <p className="border border-dashed border-charcoal/15 bg-cream/25 px-3 py-3 text-[11px] leading-relaxed text-slate/80">
          Save the service first to enable direct image uploads. You can paste
          URLs below in the meantime.
        </p>
      )}

      <div className="flex gap-2">
        <input
          className={cn(inputBase, "py-2")}
          placeholder={
            remaining > 0
              ? "Or paste an image URL (https://…)"
              : "Image limit reached"
          }
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryAdd();
            }
          }}
          disabled={remaining <= 0}
        />
        <button
          type="button"
          onClick={tryAdd}
          disabled={remaining <= 0 || !draftUrl.trim()}
          className="font-accent shrink-0 border border-gold-primary/45 bg-gold-primary/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gold-dark transition-colors hover:bg-gold-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add URL
        </button>
      </div>
      <p className="text-[10px] text-slate/70">
        {imageUrls.length}/{MAX_IMAGES} images
      </p>

      <input
        className={cn(inputBase, "py-2")}
        placeholder="Optional moodboard or portfolio link (e.g. Pinterest)"
        value={referenceUrl}
        onChange={(e) => onChange({ referenceUrl: e.target.value })}
      />
    </div>
  );
}

function ListField({
  label,
  hint,
  value,
  onChange,
  suggestions = [],
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: PlannerOption[];
}) {
  // Keep the string-backed draft contract: tap chips in, store as a list.
  return (
    <div className="block">
      <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
        {label}
      </span>
      <p className="mt-1 text-[11px] leading-relaxed text-slate/70">{hint}</p>
      <div className="mt-2">
        <PresetTagInput
          suggestions={suggestions}
          value={splitToList(value)}
          onChange={(next) => onChange(next.join("\n"))}
          placeholder={`Add a ${label.toLowerCase()} item`}
        />
      </div>
    </div>
  );
}

function labelForItemType(value: string) {
  switch (value) {
    case "menu":
      return "Menu";
    case "setup":
      return "Setup";
    case "deliverable":
      return "Deliverable";
    case "performance":
      return "Performance";
    case "look":
      return "Look";
    case "addon":
      return "Add-on";
    default:
      return "Inclusion";
  }
}
