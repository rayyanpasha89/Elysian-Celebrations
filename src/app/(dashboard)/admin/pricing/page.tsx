"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, IndianRupee, TrendingUp } from "lucide-react";
import {
  CelebrationCanvas,
  type CanvasDay,
  type FlowStatus,
} from "@/components/dashboard/event-flow";
import { cn, formatCurrency } from "@/lib/utils";

// ─── API shapes ─────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  status: string;
  vendorName: string;
  serviceName: string | null;
  categoryName: string;
  listedPrice: number | null;
  totalAmount: number | null;
  vendorCost: number | null;
  finalPrice: number | null;
  pricePublished: boolean;
  margin: number | null;
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
  bookings: Booking[];
};
type AdminDay = { id: string; name: string; date: string | null; events: AdminEvent[] };
type AdminClient = {
  id: string;
  name: string;
  email: string | null;
  wedding: { id: string; name: string; date: string | null } | null;
  totals: { revenue: number; cost: number; margin: number; bookingCount: number; pricedCount: number };
  readiness: { percent: number; eventCount: number; eventsReady: number };
  days: AdminDay[];
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

function flowStatus(readiness: number, hasContent = true): FlowStatus {
  if (!hasContent) return "planned";
  if (readiness >= 100) return "ready";
  if (readiness >= 50) return "active";
  return "gap";
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
      const events = day.events.map((ev) => ({
        id: ev.id,
        title: ev.name,
        timeLabel: ev.startTime ?? undefined,
        meta: `${ev.bookings.length} picks`,
        status: flowStatus(ev.readiness, ev.bookings.length > 0),
        readiness: ev.readiness,
        steps: ev.bookings.map((b) => ({
          id: b.id,
          label: b.vendorName,
          status: bookingStatus(b),
        })),
      }));
      const avg =
        events.length > 0
          ? Math.round(events.reduce((s, e) => s + e.readiness, 0) / events.length)
          : 0;
      return {
        id: day.id,
        title: day.name,
        dateLabel: day.date
          ? new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : undefined,
        status: flowStatus(avg, events.length > 0),
        readiness: avg,
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
    async (bookingId: string, patch: { vendorCost?: number | null; finalPrice?: number | null; pricePublished?: boolean }) => {
      try {
        const res = await fetch("/api/admin/pricing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, ...patch }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to save");
        const updated = json.booking as {
          vendorCost: number | null;
          finalPrice: number | null;
          pricePublished: boolean;
          margin: number | null;
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
        // recompute client totals after a moment (cheap: refetch)
        toast.success("Pricing saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
      }
    },
    []
  );

  // Recompute totals locally whenever bookings change (keeps headline live).
  const recomputed = useMemo(() => {
    return clients.map((c) => {
      let revenue = 0,
        cost = 0,
        bookingCount = 0,
        pricedCount = 0;
      for (const d of c.days)
        for (const e of d.events)
          for (const b of e.bookings) {
            bookingCount += 1;
            if (b.finalPrice != null) {
              revenue += b.finalPrice;
              pricedCount += 1;
            }
            if (b.vendorCost != null) cost += b.vendorCost;
          }
      return { ...c, totals: { revenue, cost, margin: revenue - cost, bookingCount, pricedCount } };
    });
  }, [clients]);
  const liveGrand = useMemo(
    () =>
      recomputed.reduce(
        (a, c) => {
          a.revenue += c.totals.revenue;
          a.cost += c.totals.cost;
          a.margin += c.totals.margin;
          a.priced += c.totals.pricedCount;
          a.bookings += c.totals.bookingCount;
          return a;
        },
        { revenue: 0, cost: 0, margin: 0, priced: 0, bookings: 0 }
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
      {/* Hero — grand margin */}
      <section className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
              Pricing &amp; margin board
            </p>
            <h1 className="mt-2 font-display text-3xl text-ivory md:text-4xl">
              What we&apos;re making
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ivory/70">
              Negotiate the vendor cost and set the final client price on every
              pick. Margin rolls up by event, day, client, and across all clients.
            </p>
          </div>
          <div className="flex gap-6">
            <HeroStat label="Revenue" value={lakh(liveGrand.revenue)} />
            <HeroStat label="Vendor cost" value={lakh(liveGrand.cost)} muted />
            <HeroStat label="Margin" value={lakh(liveGrand.margin)} gold />
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
          <p className={dashLabel}>Select a client to price their picks</p>
        )}
      </div>

      {!selectedClient ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recomputed
            .filter((c) => c.wedding)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClientId(c.id)}
                className="group flex flex-col border border-charcoal/10 bg-ivory p-4 text-left transition-all hover:-translate-y-0.5 hover:border-gold-primary/40 hover:shadow-[0_14px_36px_rgba(26,26,46,0.08)]"
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
                  <MiniStat label="Margin" value={lakh(c.totals.margin)} tone="gold" />
                  <MiniStat label="Revenue" value={lakh(c.totals.revenue)} />
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
            ))}
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
              <MiniStat label="Margin" value={formatCurrency(
                recomputed.find((c) => c.id === selectedClient.id)?.totals.margin ?? 0
              )} tone="gold" />
              <MiniStat label="Revenue" value={formatCurrency(
                recomputed.find((c) => c.id === selectedClient.id)?.totals.revenue ?? 0
              )} />
            </div>
          </div>
          <CelebrationCanvas
            eventTitle={selectedClient.name}
            days={canvasDays}
            onOpenStep={(eventId, bookingId) => openBooking(eventId, bookingId)}
          />
          <p className="mt-3 text-center font-accent text-[10px] uppercase tracking-[0.16em] text-slate/60">
            Drill day → event → vendor pick, then tap a pick to set its price
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
    patch: { vendorCost?: number | null; finalPrice?: number | null; pricePublished?: boolean }
  ) => Promise<void>;
}) {
  const { booking, eventName, clientName } = data;
  const [cost, setCost] = useState(booking.vendorCost != null ? String(booking.vendorCost) : "");
  const [price, setPrice] = useState(booking.finalPrice != null ? String(booking.finalPrice) : "");
  const [busy, setBusy] = useState(false);

  const costN = cost.trim() ? Number(cost) : null;
  const priceN = price.trim() ? Number(price) : null;
  const margin = priceN != null && costN != null ? priceN - costN : null;
  const marginPct = margin != null && costN ? Math.round((margin / costN) * 100) : null;

  const save = async (publish?: boolean) => {
    setBusy(true);
    await onSave(booking.id, {
      vendorCost: costN,
      finalPrice: priceN,
      ...(publish !== undefined ? { pricePublished: publish } : {}),
    });
    setBusy(false);
    if (publish !== undefined) onClose();
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
        className="w-full max-w-lg border border-charcoal/12 bg-ivory shadow-[0_40px_120px_rgba(17,24,39,0.35)]"
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

        <div className="px-5 py-5">
          {booking.listedPrice != null ? (
            <div className="mb-4 flex items-center justify-between border border-charcoal/10 bg-cream/30 px-3 py-2">
              <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                Vendor listed price
              </span>
              <span className="font-heading text-sm text-charcoal">
                {formatCurrency(booking.listedPrice)}
              </span>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                Negotiated vendor cost
              </span>
              <div className="mt-1.5 flex items-center border border-charcoal/15 px-3 focus-within:border-gold-primary">
                <IndianRupee className="h-3.5 w-3.5 text-slate" />
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent py-2.5 font-heading text-sm text-charcoal outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                Final client price
              </span>
              <div className="mt-1.5 flex items-center border border-gold-primary/50 px-3 focus-within:border-gold-primary">
                <IndianRupee className="h-3.5 w-3.5 text-gold-dark" />
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent py-2.5 font-heading text-sm text-charcoal outline-none"
                />
              </div>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between border border-charcoal/10 bg-charcoal/[0.03] px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-4 w-4", margin != null && margin >= 0 ? "text-sage" : "text-rose")} />
              <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                Your margin
              </span>
            </div>
            <div className="text-right">
              <p className={cn("font-display text-xl", margin == null ? "text-slate" : margin >= 0 ? "text-sage" : "text-rose")}>
                {margin != null ? formatCurrency(margin) : "—"}
              </p>
              {marginPct != null ? (
                <p className="text-[11px] text-slate">{marginPct}% on cost</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 border border-charcoal/10 px-4 py-2.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                booking.pricePublished ? "bg-sage" : "bg-slate/40"
              )}
            />
            <span className="flex-1 text-xs text-slate">
              {booking.pricePublished
                ? "Published — client sees this once their event is 100% ready."
                : "Not published — hidden from the client until you publish."}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="font-accent border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark disabled:opacity-40"
            >
              Save draft
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
                disabled={busy || priceN == null}
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
