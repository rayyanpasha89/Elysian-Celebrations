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

/** Colour a node by margin health: green = all priced (no loss), amber = some
 *  still to price, red = a loss somewhere, grey = no picks. */
function marginHealth(picks: number, priced: number, loss: boolean): FlowStatus {
  if (picks === 0) return "planned";
  if (loss) return "gap";
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
      let dayMargin = 0;
      let dayPicks = 0;
      let dayPriced = 0;
      let dayLoss = false;
      const events = day.events.map((ev) => {
        const margin = ev.bookings.reduce((s, b) => s + (b.margin ?? 0), 0);
        const priced = ev.bookings.filter((b) => b.finalPrice != null).length;
        const loss = ev.bookings.some((b) => b.margin != null && b.margin < 0);
        dayMargin += margin;
        dayPicks += ev.bookings.length;
        dayPriced += priced;
        if (loss) dayLoss = true;
        return {
          id: ev.id,
          title: ev.name,
          // money shown right on the node
          timeLabel:
            ev.bookings.length === 0
              ? undefined
              : priced < ev.bookings.length
                ? `${ev.bookings.length - priced} to price`
                : `${lakh(margin)} margin`,
          meta: `${ev.bookings.length} picks`,
          status: marginHealth(ev.bookings.length, priced, loss),
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
            ? `${lakh(dayMargin)} margin`
            : undefined,
        status: marginHealth(dayPicks, dayPriced, dayLoss),
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
            onRefresh={refetch}
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

type NegEntry = {
  id: string;
  stage: string;
  amount: number | null;
  note: string | null;
  created_at: string;
};
const GST_RATE = 0.18;
const TARGET_MARGIN = 0.3;
const NEG_META: Record<string, { label: string; dot: string }> = {
  QUOTED: { label: "Quoted", dot: "bg-slate/50" },
  COUNTERED: { label: "Countered", dot: "bg-gold-primary" },
  AGREED: { label: "Agreed", dot: "bg-sage" },
};

function PricingEditor({
  data,
  onClose,
  onSave,
  onRefresh,
}: {
  data: { booking: Booking; eventName: string; clientName: string };
  onClose: () => void;
  onSave: (
    bookingId: string,
    patch: { vendorCost?: number | null; finalPrice?: number | null; pricePublished?: boolean }
  ) => Promise<void>;
  onRefresh: () => void;
}) {
  const { booking, eventName, clientName } = data;
  const [cost, setCost] = useState(booking.vendorCost != null ? String(booking.vendorCost) : "");
  const [price, setPrice] = useState(booking.finalPrice != null ? String(booking.finalPrice) : "");
  const [busy, setBusy] = useState(false);

  const [entries, setEntries] = useState<NegEntry[]>([]);
  const [negStage, setNegStage] = useState<"QUOTED" | "COUNTERED" | "AGREED">("COUNTERED");
  const [negAmount, setNegAmount] = useState("");
  const [negNote, setNegNote] = useState("");
  const [negBusy, setNegBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/negotiation?bookingId=${booking.id}`);
        const json = await res.json();
        if (res.ok) setEntries((json.entries ?? []) as NegEntry[]);
      } catch {
        /* non-fatal */
      }
    })();
  }, [booking.id]);

  const costN = cost.trim() ? Number(cost) : null;
  const priceN = price.trim() ? Number(price) : null;
  const margin = priceN != null && costN != null ? priceN - costN : null;
  const marginPct = margin != null && costN ? Math.round((margin / costN) * 100) : null;
  const gst = priceN != null ? Math.round(priceN * GST_RATE) : null;
  const suggested =
    costN != null && costN > 0 ? Math.round((costN * (1 + TARGET_MARGIN)) / 1000) * 1000 : null;

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

  const addEntry = async () => {
    const amt = negAmount.trim() ? Number(negAmount) : null;
    setNegBusy(true);
    try {
      const res = await fetch("/api/admin/negotiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, stage: negStage, amount: amt, note: negNote || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add entry");
      setEntries((e) => [...e, json.entry as NegEntry]);
      setNegAmount("");
      setNegNote("");
      if (negStage === "AGREED" && amt != null) {
        setCost(String(amt)); // agreeing locks the cost
        onRefresh();
        toast.success("Agreed — cost locked");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add entry");
    } finally {
      setNegBusy(false);
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
        className="w-full max-w-lg border border-charcoal/12 bg-ivory shadow-[0_40px_120px_rgba(51,61,41,0.35)]"
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
              <span className="flex items-center justify-between gap-2">
                <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark">
                  Final client price
                </span>
                {suggested != null ? (
                  <button
                    type="button"
                    onClick={() => setPrice(String(suggested))}
                    className="font-accent text-[9px] uppercase tracking-[0.1em] text-gold-dark underline-offset-2 hover:underline"
                  >
                    +30% → {formatCurrency(suggested)}
                  </button>
                ) : null}
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

          {gst != null ? (
            <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate">
              <span>+ GST (18%)</span>
              <span>
                {formatCurrency(gst)} · client pays{" "}
                <span className="text-charcoal">{formatCurrency((priceN ?? 0) + gst)}</span>
              </span>
            </div>
          ) : null}

          {/* Negotiation log */}
          <div className="mt-5 border-t border-charcoal/8 pt-4">
            <p className={dashLabel}>Negotiation</p>
            {entries.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", NEG_META[e.stage]?.dot ?? "bg-slate/50")} />
                    <span className="font-accent uppercase tracking-[0.12em] text-slate">
                      {NEG_META[e.stage]?.label ?? e.stage}
                    </span>
                    {e.amount != null ? (
                      <span className="font-heading text-charcoal">{formatCurrency(e.amount)}</span>
                    ) : null}
                    {e.note ? <span className="truncate text-slate">· {e.note}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-slate">No negotiation logged yet.</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex border border-charcoal/12 p-0.5">
                {(["QUOTED", "COUNTERED", "AGREED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNegStage(st)}
                    className={cn(
                      "px-2.5 py-1.5 font-accent text-[9px] uppercase tracking-[0.1em] transition-colors",
                      negStage === st ? "bg-charcoal text-ivory" : "text-slate hover:text-charcoal"
                    )}
                  >
                    {NEG_META[st].label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={negAmount}
                onChange={(e) => setNegAmount(e.target.value)}
                placeholder="Amount"
                className="w-24 border border-charcoal/15 bg-transparent px-2 py-1.5 font-heading text-xs text-charcoal outline-none focus:border-gold-primary"
              />
              <input
                value={negNote}
                onChange={(e) => setNegNote(e.target.value)}
                placeholder="Note"
                className="min-w-0 flex-1 border border-charcoal/15 bg-transparent px-2 py-1.5 font-heading text-xs text-charcoal outline-none focus:border-gold-primary"
              />
              <button
                type="button"
                onClick={() => void addEntry()}
                disabled={negBusy}
                className="font-accent border border-charcoal/15 px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark disabled:opacity-40"
              >
                Log
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate/70">
              Marking &ldquo;Agreed&rdquo; locks that amount as the vendor cost.
            </p>
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
