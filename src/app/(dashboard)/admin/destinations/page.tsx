"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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

type DestinationDraft = {
  name: string;
  country: string;
  tagline: string;
  startingPrice: string;
};

type DraftErrors = Partial<Record<keyof DestinationDraft, string>>;

type CreateDestinationResponse = {
  destination?: DestinationRow;
  error?: string;
};

const EMPTY_DRAFT: DestinationDraft = {
  name: "",
  country: "",
  tagline: "",
  startingPrice: "",
};

const MAX_STARTING_PRICE = 2_147_483_647;
const inputClass =
  "w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors placeholder:text-slate/55 focus:border-gold-primary disabled:cursor-not-allowed disabled:opacity-60";

function validateDraft(draft: DestinationDraft) {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  const country = draft.country.trim();
  const tagline = draft.tagline.trim();

  if (!name) errors.name = "Enter a destination name.";
  else if (name.length > 120) errors.name = "Use 120 characters or fewer.";

  if (!country) errors.country = "Enter a country.";
  else if (country.length > 80) errors.country = "Use 80 characters or fewer.";

  if (tagline.length > 240) errors.tagline = "Use 240 characters or fewer.";

  if (draft.startingPrice.trim()) {
    const startingPrice = Number(draft.startingPrice);
    if (
      !Number.isInteger(startingPrice) ||
      startingPrice <= 0 ||
      startingPrice > MAX_STARTING_PRICE
    ) {
      errors.startingPrice = "Enter a positive whole number of rupees.";
    }
  }

  return errors;
}

export default function AdminDestinationsPage() {
  const [rows, setRows] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DestinationDraft>(EMPTY_DRAFT);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creationMessage, setCreationMessage] = useState<string | null>(null);

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

  const updateDraft = (field: keyof DestinationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDraftErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const closeAddForm = () => {
    if (creating) return;
    setAddOpen(false);
    setDraft(EMPTY_DRAFT);
    setDraftErrors({});
    setFormError(null);
  };

  const createDestination = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setDraftErrors(errors);
      setFormError("Review the highlighted fields and try again.");
      return;
    }

    const name = draft.name.trim();
    const country = draft.country.trim();
    const startingPrice = draft.startingPrice.trim()
      ? Number(draft.startingPrice)
      : undefined;

    setCreating(true);
    setFormError(null);
    try {
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
      const data = (await res.json()) as CreateDestinationResponse;
      if (!res.ok || !data.destination) {
        const message =
          res.status === 401
            ? "Your session has expired. Sign in again to add a destination."
            : res.status === 403
              ? "Only administrators can add destinations."
              : data.error ?? "Could not create the destination.";

        if (res.status === 409) {
          setDraftErrors((current) => ({ ...current, name: message }));
        }
        setFormError(message);
        return;
      }

      const destination = data.destination;
      setRows((current) =>
        [...current.filter((row) => row.id !== destination.id), destination].sort(
          (a, b) => a.sort_order - b.sort_order
        )
      );
      setCreationMessage(`${destination.name} is now active in the destination catalogue.`);
      toast.success("Destination created");
      setDraft(EMPTY_DRAFT);
      setDraftErrors({});
      setAddOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not create the destination."
      );
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
            Manage the places shown across the Elysian catalogue. New destinations receive a URL slug
            automatically and are active as soon as they are created.
          </p>
        </div>
        <button
          type="button"
          className={dashBtn}
          disabled={loading || creating}
          aria-expanded={addOpen}
          aria-controls="add-destination-form"
          onClick={() => {
            if (addOpen) closeAddForm();
            else {
              setCreationMessage(null);
              setAddOpen(true);
            }
          }}
        >
          {addOpen ? "Close form" : "Add destination"}
        </button>
      </motion.div>

      {creationMessage && (
        <motion.div
          variants={fadeUp}
          role="status"
          aria-live="polite"
          className="mt-6 border border-sage/30 bg-sage/8 px-5 py-4"
        >
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-sage">
            Destination added
          </p>
          <p className="font-heading mt-1 text-sm text-charcoal">{creationMessage}</p>
        </motion.div>
      )}

      {addOpen && (
        <motion.form
          id="add-destination-form"
          variants={fadeUp}
          onSubmit={createDestination}
          noValidate
          aria-labelledby="add-destination-title"
          className={cn(dashCard, "mt-8 border-gold-primary/35 p-0")}
        >
          <div className="border-b border-charcoal/8 px-6 py-5 sm:px-8">
            <p className={dashLabel}>New catalogue entry</p>
            <h3 id="add-destination-title" className="font-display mt-2 text-2xl text-charcoal">
              Add a destination
            </h3>
            <p className="font-heading mt-2 max-w-2xl text-sm leading-6 text-slate">
              Add the essential details now. The destination starts active with zero venues, and its
              public URL is generated from the name.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="destination-name" className={dashLabel}>
                  Destination name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="destination-name"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  required
                  maxLength={120}
                  disabled={creating}
                  className={cn(inputClass, "mt-2", draftErrors.name && "border-error/60")}
                  placeholder="e.g. Udaipur"
                  value={draft.name}
                  aria-invalid={Boolean(draftErrors.name)}
                  aria-describedby={draftErrors.name ? "destination-name-error" : undefined}
                  onChange={(e) => updateDraft("name", e.target.value)}
                />
                {draftErrors.name && (
                  <p id="destination-name-error" className="font-heading mt-1.5 text-xs text-error" role="alert">
                    {draftErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="destination-country" className={dashLabel}>
                  Country <span aria-hidden="true">*</span>
                </label>
                <input
                  id="destination-country"
                  type="text"
                  autoComplete="country-name"
                  required
                  maxLength={80}
                  disabled={creating}
                  className={cn(inputClass, "mt-2", draftErrors.country && "border-error/60")}
                  placeholder="e.g. India"
                  value={draft.country}
                  aria-invalid={Boolean(draftErrors.country)}
                  aria-describedby={draftErrors.country ? "destination-country-error" : undefined}
                  onChange={(e) => updateDraft("country", e.target.value)}
                />
                {draftErrors.country && (
                  <p id="destination-country-error" className="font-heading mt-1.5 text-xs text-error" role="alert">
                    {draftErrors.country}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="destination-tagline" className={dashLabel}>
                  Tagline <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <span className="font-heading text-[11px] text-slate/70">
                  {draft.tagline.length}/240
                </span>
              </div>
              <input
                id="destination-tagline"
                type="text"
                maxLength={240}
                disabled={creating}
                className={cn(inputClass, "mt-2", draftErrors.tagline && "border-error/60")}
                placeholder="e.g. The City of Lakes"
                value={draft.tagline}
                aria-invalid={Boolean(draftErrors.tagline)}
                aria-describedby={draftErrors.tagline ? "destination-tagline-error" : undefined}
                onChange={(e) => updateDraft("tagline", e.target.value)}
              />
              {draftErrors.tagline && (
                <p id="destination-tagline-error" className="font-heading mt-1.5 text-xs text-error" role="alert">
                  {draftErrors.tagline}
                </p>
              )}
            </div>

            <div className="max-w-sm">
              <label htmlFor="destination-starting-price" className={dashLabel}>
                Starting price in INR <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="destination-starting-price"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_STARTING_PRICE}
                step={1}
                disabled={creating}
                className={cn(inputClass, "mt-2", draftErrors.startingPrice && "border-error/60")}
                placeholder="2500000"
                value={draft.startingPrice}
                aria-invalid={Boolean(draftErrors.startingPrice)}
                aria-describedby="destination-starting-price-hint"
                onChange={(e) => updateDraft("startingPrice", e.target.value)}
              />
              <p
                id="destination-starting-price-hint"
                className={cn(
                  "font-heading mt-1.5 text-xs",
                  draftErrors.startingPrice ? "text-error" : "text-slate/75"
                )}
                role={draftErrors.startingPrice ? "alert" : undefined}
              >
                {draftErrors.startingPrice ?? "Enter rupees without commas, for example 2500000 for ₹25L."}
              </p>
            </div>

            <div aria-live="polite">
              {formError && (
                <p className="border border-error/25 bg-error/5 px-4 py-3 font-heading text-sm text-error" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-charcoal/8 pt-5">
              <button type="submit" className={dashBtn} disabled={creating}>
                {creating ? "Creating…" : "Create destination"}
              </button>
              <button
                type="button"
                disabled={creating}
                className="font-accent border border-charcoal/20 bg-transparent px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary disabled:pointer-events-none disabled:opacity-40"
                onClick={closeAddForm}
              >
                Cancel
              </button>
            </div>
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
