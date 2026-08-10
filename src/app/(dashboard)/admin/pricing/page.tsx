"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, BadgeIndianRupee, IndianRupee } from "lucide-react";
import {
  CelebrationCanvas,
  type CanvasDay,
  type FlowStatus,
} from "@/components/dashboard/event-flow";
import type { EventReadinessGap } from "@/lib/event-readiness";
import { cn, formatCurrency } from "@/lib/utils";

// ─── API shapes ─────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  status: string;
  vendorName: string;
  serviceName: string | null;
  categoryName: string;
  vendorPrice: number | null;
  finalPrice: number | null;
  pricePublished: boolean;
  fee: number | null;
  updatedAt: string;
};
type AdminEvent = {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  guestCount: number | null;
  startTime: string | null;
  endTime: string | null;
  readiness: number;
  readinessGaps: EventReadinessGap[];
  bookings: Booking[];
};
type AdminDay = { id: string; name: string; date: string | null; events: AdminEvent[] };
type AdminClient = {
  id: string;
  name: string;
  email: string | null;
  wedding: { id: string; name: string; date: string | null } | null;
  totals: {
    finalTotal: number;
    vendorTotal: number;
    feeTotal: number;
    bookingCount: number;
    pricedCount: number;
  };
  readiness: { percent: number; eventCount: number; eventsReady: number };
  days: AdminDay[];
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

/** Colour a node by pricing completion: grey = no picks, amber = incomplete,
 *  and green = every selected service has a final price. */
function pricingHealth(picks: number, priced: number): FlowStatus {
  if (picks === 0) return "planned";
  if (priced < picks) return "active";
  return "ready";
}
function bookingStatus(b: Booking): FlowStatus {
  if (b.pricePublished) return "ready";
  if (b.finalPrice != null) return "active";
  return "gap";
}
function lakh(n: number) {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  return `₹${(n / 100000).toFixed(1)}L`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminPricingPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    booking: Booking;
    eventName: string;
    clientName: string;
  } | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load pricing");
      setClients((json.clients ?? []) as AdminClient[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const activeClients = useMemo(
    () => clients.filter((c) => c.wedding && c.totals.bookingCount > 0),
    [clients]
  );
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  const canvasDays: CanvasDay[] = useMemo(() => {
    if (!selectedClient) return [];
    return selectedClient.days.map((day) => {
      let dayFee = 0;
      let dayPicks = 0;
      let dayPriced = 0;
      const events = day.events.map((ev) => {
        const fee = ev.bookings.reduce((sum, booking) => sum + (booking.fee ?? 0), 0);
        const priced = ev.bookings.filter((b) => b.finalPrice != null).length;
        dayFee += fee;
        dayPicks += ev.bookings.length;
        dayPriced += priced;
        return {
          id: ev.id,
          title: ev.name,
          // money shown right on the node
          timeLabel:
            ev.bookings.length === 0
              ? undefined
              : priced < ev.bookings.length
                ? `${ev.bookings.length - priced} to price`
                : `${lakh(fee)} fee`,
          meta:
            ev.readiness < 100 && ev.readinessGaps[0]
              ? `${ev.bookings.length} picks · ${ev.readinessGaps[0].label} open`
              : `${ev.bookings.length} picks`,
          status: pricingHealth(ev.bookings.length, priced),
          readiness:
            ev.bookings.length > 0 ? Math.round((priced / ev.bookings.length) * 100) : 0,
          steps: ev.bookings.map((b) => ({
            id: b.id,
            label: b.vendorName,
            status: bookingStatus(b),
          })),
        };
      });
      return {
        id: day.id,
        title: day.name,
        dateLabel: day.date
          ? new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : dayPicks > 0
            ? `${lakh(dayFee)} fee`
            : undefined,
        status: pricingHealth(dayPicks, dayPriced),
        readiness: dayPicks > 0 ? Math.round((dayPriced / dayPicks) * 100) : 0,
        events,
      };
    });
  }, [selectedClient]);

  const openBooking = useCallback(
    (eventId: string, bookingId: string) => {
      if (!selectedClient) return;
      for (const day of selectedClient.days) {
        for (const ev of day.events) {
          if (ev.id !== eventId) continue;
          const booking = ev.bookings.find((b) => b.id === bookingId);
          if (booking)
            setEditing({ booking, eventName: ev.name, clientName: selectedClient.name });
        }
      }
    },
    [selectedClient]
  );

  const savePricing = useCallback(
    async (
      bookingId: string,
      patch: {
        vendorPrice?: number | null;
        fee?: number | null;
        pricePublished?: boolean;
        updatedAt: string;
      }
    ) => {
      try {
        const res = await fetch("/api/admin/pricing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, ...patch }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to save");
        const updated = json.booking as {
          vendorPrice: number | null;
          finalPrice: number | null;
          pricePublished: boolean;
          fee: number | null;
          updatedAt: string;
        };
        // patch local state
        setClients((prev) =>
          prev.map((c) => ({
            ...c,
            days: c.days.map((d) => ({
              ...d,
              events: d.events.map((e) => ({
                ...e,
                bookings: e.bookings.map((b) =>
                  b.id === bookingId
                    ? { ...b, ...updated, pricePublished: updated.pricePublished }
                    : b
                ),
              })),
            })),
          }))
        );
        setEditing((cur) =>
          cur && cur.booking.id === bookingId
            ? { ...cur, booking: { ...cur.booking, ...updated } }
            : cur
        );
        toast.success("Pricing saved");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
        return false;
      }
    },
    []
  );

  // Recompute totals locally whenever bookings change (keeps headline live).
  const recomputed = useMemo(() => {
    return clients.map((c) => {
      let finalTotal = 0,
        vendorTotal = 0,
        feeTotal = 0,
        bookingCount = 0,
        pricedCount = 0;
      for (const d of c.days)
        for (const e of d.events)
          for (const b of e.bookings) {
            bookingCount += 1;
            if (b.finalPrice != null) {
              finalTotal += b.finalPrice;
              pricedCount += 1;
              vendorTotal += b.vendorPrice ?? 0;
              feeTotal += b.fee ?? 0;
            }
          }
      return {
        ...c,
        totals: { finalTotal, vendorTotal, feeTotal, bookingCount, pricedCount },
      };
    });
  }, [clients]);
  const liveGrand = useMemo(
    () =>
      recomputed.reduce(
        (a, c) => {
          a.finalTotal += c.totals.finalTotal;
          a.vendorTotal += c.totals.vendorTotal;
          a.feeTotal += c.totals.feeTotal;
          a.priced += c.totals.pricedCount;
          a.bookings += c.totals.bookingCount;
          return a;
        },
        { finalTotal: 0, vendorTotal: 0, feeTotal: 0, priced: 0, bookings: 0 }
      ),
    [recomputed]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading pricing board...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
              Final pricing board
            </p>
            <h1 className="mt-2 font-display text-3xl text-ivory md:text-4xl">
              One price, clearly composed
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ivory/70">
              Record the vendor price agreed offline, add Elysian&apos;s flat fee, and
              publish one complete client total. No portal negotiation or quote wait.
            </p>
          </div>
          <div className="flex gap-6">
            <HeroStat label="Final value" value={lakh(liveGrand.finalTotal)} />
            <HeroStat label="Vendor payouts" value={lakh(liveGrand.vendorTotal)} muted />
            <HeroStat label="Elysian fee" value={lakh(liveGrand.feeTotal)} gold />
          </div>
        </div>
        <div className="relative flex flex-wrap gap-x-6 gap-y-1 border-t border-ivory/10 px-6 py-3 md:px-8">
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-ivory/60">
            {liveGrand.priced}/{liveGrand.bookings} picks priced
          </span>
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-ivory/60">
            {activeClients.length} active clients
          </span>
        </div>
      </section>

      {/* Client selector */}
      <div className="flex items-center gap-2">
        {selectedClient ? (
          <button
            type="button"
            onClick={() => setSelectedClientId(null)}
            className="inline-flex items-center gap-1.5 border border-charcoal/15 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All clients
          </button>
        ) : (
          <p className={dashLabel}>Select a client to record agreed pricing</p>
        )}
      </div>

      {!selectedClient ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeClients.length === 0 ? (
            <div className="border border-dashed border-charcoal/15 bg-ivory p-8 sm:col-span-2 xl:col-span-3">
              <p className="font-display text-xl text-charcoal">No vendor picks to price yet</p>
              <p className="mt-2 text-sm text-slate">
                Client plans appear here as soon as they select a vendor service.
              </p>
            </div>
          ) : (
            recomputed
              .filter((c) => c.wedding && c.totals.bookingCount > 0)
              .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClientId(c.id)}
                className="group flex flex-col border border-charcoal/10 bg-ivory p-4 text-left transition-all hover:-translate-y-0.5 hover:border-gold-primary/40 hover:shadow-[0_14px_36px_rgba(51,61,41,0.08)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg text-charcoal">{c.name}</p>
                    <p className="truncate text-xs text-slate">
                      {c.wedding?.name ?? "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 border px-2 py-1 font-accent text-[9px] uppercase tracking-[0.14em]",
                      c.readiness.percent >= 100
                        ? "border-sage/35 bg-sage/10 text-sage"
                        : "border-charcoal/12 text-slate"
                    )}
                  >
                    {c.readiness.percent}% ready
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-charcoal/8 pt-3">
                  <MiniStat label="Fee" value={lakh(c.totals.feeTotal)} tone="gold" />
                  <MiniStat label="Final" value={lakh(c.totals.finalTotal)} />
                  <MiniStat
                    label="Priced"
                    value={`${c.totals.pricedCount}/${c.totals.bookingCount}`}
                    tone={
                      c.totals.bookingCount > 0 && c.totals.pricedCount < c.totals.bookingCount
                        ? "warn"
                        : "good"
                    }
                  />
                </div>
              </button>
              ))
          )}
        </div>
      ) : (
        <div className="border border-charcoal/10 bg-ivory p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={dashLabel}>Pricing · {selectedClient.name}</p>
              <h2 className="mt-1 font-display text-2xl text-charcoal">
                {selectedClient.wedding?.name ?? "Celebration"}
              </h2>
            </div>
            <div className="flex gap-5">
              <MiniStat label="Fee" value={formatCurrency(
                recomputed.find((c) => c.id === selectedClient.id)?.totals.feeTotal ?? 0
              )} tone="gold" />
              <MiniStat label="Final value" value={formatCurrency(
                recomputed.find((c) => c.id === selectedClient.id)?.totals.finalTotal ?? 0
              )} />
            </div>
          </div>
          <CelebrationCanvas
            eventTitle={selectedClient.name}
            days={canvasDays}
            onOpenStep={(eventId, bookingId) => openBooking(eventId, bookingId)}
          />
          <p className="mt-3 text-center font-accent text-[10px] uppercase tracking-[0.16em] text-slate/60">
            Drill day → event → vendor pick, then record the offline agreement
          </p>
        </div>
      )}

      <AnimatePresence>
        {editing ? (
          <PricingEditor
            key={editing.booking.id}
            data={editing}
            onClose={() => setEditing(null)}
            onSave={savePricing}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HeroStat({ label, value, gold, muted }: { label: string; value: string; gold?: boolean; muted?: boolean }) {
  return (
    <div className="text-right">
      <p
        className={cn(
          "font-display text-3xl leading-none",
          gold ? "text-gold-primary" : muted ? "text-ivory/60" : "text-ivory"
        )}
      >
        {value}
      </p>
      <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.16em] text-ivory/55">
        {label}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "gold" | "warn" | "good";
}) {
  return (
    <div>
      <p className="font-accent text-[9px] uppercase tracking-[0.14em] text-slate">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-display text-sm",
          tone === "gold" && "text-gold-dark",
          tone === "warn" && "text-rose",
          tone === "good" && "text-sage",
          tone === "neutral" && "text-charcoal"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Pricing editor ─────────────────────────────────────────────────────────

function PricingEditor({
  data,
  onClose,
  onSave,
}: {
  data: { booking: Booking; eventName: string; clientName: string };
  onClose: () => void;
  onSave: (
    bookingId: string,
    patch: {
      vendorPrice?: number | null;
      fee?: number | null;
      pricePublished?: boolean;
      updatedAt: string;
    }
  ) => Promise<boolean>;
}) {
  const { booking, eventName, clientName } = data;
  const [vendorPrice, setVendorPrice] = useState(
    booking.vendorPrice != null ? String(booking.vendorPrice) : ""
  );
  const [fee, setFee] = useState(
    booking.fee != null ? String(booking.fee) : ""
  );
  const [busy, setBusy] = useState(false);

  const vendorPriceN = vendorPrice.trim() ? Number(vendorPrice) : null;
  const feeN = fee.trim() ? Number(fee) : null;
  const vendorPriceInvalid =
    vendorPrice.trim().length > 0 &&
    (vendorPriceN == null ||
      !Number.isFinite(vendorPriceN) ||
      !Number.isInteger(vendorPriceN) ||
      vendorPriceN <= 0);
  const feeInvalid =
    fee.trim().length > 0 &&
    (feeN == null ||
      !Number.isFinite(feeN) ||
      !Number.isInteger(feeN) ||
      feeN < 0);
  const bothBlank = vendorPriceN == null && feeN == null;
  const oneMissing = (vendorPriceN == null) !== (feeN == null);
  const completePricing =
    vendorPriceN != null &&
    feeN != null &&
    !vendorPriceInvalid &&
    !feeInvalid;
  const finalPrice = completePricing ? vendorPriceN + feeN : null;
  const canSave = !oneMissing && !vendorPriceInvalid && !feeInvalid;
  const canPublish = completePricing;

  const save = async (publish?: boolean) => {
    setBusy(true);
    try {
      const saved = await onSave(booking.id, {
        vendorPrice: bothBlank ? null : vendorPriceN,
        fee: bothBlank ? null : feeN,
        updatedAt: booking.updatedAt,
        ...(publish !== undefined ? { pricePublished: publish } : {}),
      });
      if (saved && publish !== undefined) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-midnight/45 p-4 backdrop-blur"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto border border-charcoal/12 bg-ivory shadow-[0_40px_120px_rgba(51,61,41,0.35)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-charcoal/10 px-5 py-4">
          <div className="min-w-0">
            <p className={dashLabel}>{booking.categoryName} · {clientName}</p>
            <p className="mt-0.5 truncate font-display text-lg text-charcoal">
              {booking.vendorName}
            </p>
            <p className="truncate text-xs text-slate">
              {booking.serviceName ?? "Service"} · {eventName}
            </p>
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

        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-charcoal/10 bg-cream/50 px-4 py-3">
            <div>
              <p className="font-accent text-[9px] uppercase tracking-[0.16em] text-gold-dark">
                Offline agreement
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate">
                Confirm the vendor amount outside the portal, then record the fee and
                publish the derived total. The vendor never sends a quote here.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
                Client visibility
              </p>
              <p className={cn("mt-1 font-heading text-sm", booking.pricePublished ? "text-sage" : "text-gold-dark")}>
                {booking.pricePublished ? "Published" : "Admin draft"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                Agreed vendor price
              </span>
              <div
                className={cn(
                  "mt-1.5 flex items-center border px-3 focus-within:border-gold-primary",
                  vendorPriceInvalid || oneMissing
                    ? "border-rose"
                    : "border-gold-primary/50"
                )}
              >
                <IndianRupee className="h-3.5 w-3.5 text-gold-dark" />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  placeholder="Amount agreed offline"
                  className="w-full bg-transparent py-3 font-display text-lg text-charcoal outline-none"
                />
              </div>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate">
                The vendor&apos;s event-specific payout before Elysian&apos;s fee.
              </span>
            </label>

            <label className="block">
              <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                Elysian fee
              </span>
              <div
                className={cn(
                  "mt-1.5 flex items-center border px-3 focus-within:border-gold-primary",
                  feeInvalid || oneMissing
                    ? "border-rose"
                    : "border-gold-primary/50"
                )}
              >
                <IndianRupee className="h-3.5 w-3.5 text-gold-dark" />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="Flat service fee"
                  className="w-full bg-transparent py-3 font-display text-lg text-charcoal outline-none"
                />
              </div>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate">
                A flat INR amount, never a percentage or negotiable margin.
              </span>
            </label>
          </div>

          {vendorPriceInvalid || feeInvalid || oneMissing ? (
            <p className="mt-3 text-xs text-rose">
              {oneMissing
                ? "Enter both the vendor price and Elysian fee, or clear both."
                : "Use whole-rupee amounts. Vendor price must be above zero and the fee cannot be negative."}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between border border-gold-primary/35 bg-gold-primary/[0.08] px-4 py-4">
            <div className="flex items-center gap-2">
              <BadgeIndianRupee className="h-4 w-4 text-gold-dark" />
              <div>
                <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                  Client final price
                </p>
                <p className="mt-1 text-xs text-slate">Vendor price + flat Elysian fee</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("font-display text-2xl", finalPrice == null ? "text-slate" : "text-charcoal")}>
                {finalPrice != null ? formatCurrency(finalPrice) : "Not set"}
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-slate">
            This is the only commercial amount shown to the client after publication.
            Clearing both inputs also unpublishes the price.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy || !canSave}
              onClick={() => void save()}
              className="font-accent border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark disabled:opacity-40"
            >
              {busy
                ? "Saving..."
                : booking.pricePublished
                  ? "Update published price"
                  : bothBlank
                    ? "Clear pricing"
                    : "Save draft"}
            </button>
            {booking.pricePublished ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void save(false)}
                className="font-accent border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-slate transition-colors hover:border-rose hover:text-rose disabled:opacity-40"
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || !canPublish}
                onClick={() => void save(true)}
                className="font-accent inline-flex items-center justify-center border border-gold-primary bg-gold-primary px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-midnight shadow-[0_14px_36px_rgba(201,169,110,0.18)] transition-all hover:bg-gold-dark hover:border-gold-dark disabled:opacity-50"
              >
                {busy ? "Saving..." : "Publish to client"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
