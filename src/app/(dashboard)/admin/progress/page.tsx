"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Booking = { id: string; vendorName: string; categoryName: string; finalPrice: number | null; pricePublished: boolean };
type AdminEvent = {
  id: string;
  name: string;
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
  readiness: { percent: number; eventCount: number; eventsReady: number };
  totals: { bookingCount: number; pricedCount: number };
  days: AdminDay[];
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

function tone(p: number) {
  if (p >= 100) return { bar: "bg-sage", text: "text-sage", chip: "border-sage/35 bg-sage/10 text-sage" };
  if (p >= 50) return { bar: "bg-gold-primary", text: "text-gold-dark", chip: "border-gold-primary/35 bg-gold-primary/10 text-gold-dark" };
  return { bar: "bg-rose", text: "text-rose", chip: "border-rose/35 bg-rose/10 text-rose" };
}

export default function AdminProgressPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "stalled" | "ready">("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/pricing");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setClients((json.clients ?? []) as AdminClient[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load progress");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withWedding = useMemo(() => clients.filter((c) => c.wedding), [clients]);

  const summary = useMemo(() => {
    const events = withWedding.reduce((s, c) => s + c.readiness.eventCount, 0);
    const ready = withWedding.reduce((s, c) => s + c.readiness.eventsReady, 0);
    const avg =
      withWedding.length > 0
        ? Math.round(withWedding.reduce((s, c) => s + c.readiness.percent, 0) / withWedding.length)
        : 0;
    return { clients: withWedding.length, events, ready, avg };
  }, [withWedding]);

  const filtered = useMemo(() => {
    return withWedding.filter((c) => {
      if (filter === "ready") return c.readiness.percent >= 100;
      if (filter === "active") return c.readiness.percent > 0 && c.readiness.percent < 100;
      if (filter === "stalled") return c.readiness.percent === 0;
      return true;
    });
  }, [withWedding, filter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading client progress...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden border border-charcoal/10 bg-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.12),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-dark">
              Client progress
            </p>
            <h1 className="mt-2 font-display text-3xl text-charcoal md:text-4xl">
              Every celebration, at a glance
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
              How far each client has come — function by function — so you know
              exactly who to nudge and who is ready to price.
            </p>
          </div>
          <div className="flex gap-6">
            <Stat label="Clients" value={String(summary.clients)} />
            <Stat label="Functions ready" value={`${summary.ready}/${summary.events}`} />
            <Stat label="Avg readiness" value={`${summary.avg}%`} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "All" },
            { key: "active", label: "In progress" },
            { key: "ready", label: "100% ready" },
            { key: "stalled", label: "Not started" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
              filter === f.key
                ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                : "border-charcoal/12 text-slate hover:border-gold-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
          {filtered.length} {filtered.length === 1 ? "client" : "clients"}
        </span>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => {
          const t = tone(c.readiness.percent);
          const isOpen = open === c.id;
          return (
            <div key={c.id} className="border border-charcoal/10 bg-ivory">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-lg text-charcoal">{c.name}</p>
                    <span className="text-xs text-slate">· {c.wedding?.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate">
                    {c.readiness.eventCount} functions · {c.totals.bookingCount} vendor picks
                    {c.totals.pricedCount > 0 ? ` · ${c.totals.pricedCount} priced` : ""}
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
                    <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${c.readiness.percent}%` }} />
                  </div>
                </div>
                <span className={cn("shrink-0 border px-2.5 py-1 font-accent text-[10px] uppercase tracking-[0.14em]", t.chip)}>
                  {c.readiness.percent}%
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-slate transition-transform", isOpen && "rotate-180")}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-charcoal/8"
                  >
                    <div className="space-y-4 p-4">
                      {c.days.length === 0 ? (
                        <p className="text-sm text-slate">No days added yet.</p>
                      ) : (
                        c.days.map((day) => (
                          <div key={day.id}>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-gold-dark" />
                              <p className="font-heading text-sm text-charcoal">{day.name}</p>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {day.events.map((ev) => {
                                const et = tone(ev.readiness);
                                return (
                                  <div key={ev.id} className="border border-charcoal/10 bg-cream/30 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="truncate font-heading text-sm text-charcoal">{ev.name}</p>
                                      <span className={cn("shrink-0 font-accent text-[10px] uppercase tracking-[0.12em]", et.text)}>
                                        {ev.readiness}%
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <Signal ok={Boolean(ev.venue)} icon={MapPin} label="Venue" />
                                      <Signal ok={Boolean(ev.guestCount)} icon={Users} label="Guests" />
                                      <Signal ok={Boolean(ev.startTime)} label="Time" />
                                      <Signal ok={ev.bookings.length > 0} label={`${ev.bookings.length} vendors`} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <div className="border border-dashed border-charcoal/15 bg-ivory p-10 text-center text-sm text-slate">
            No clients match this filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="font-display text-3xl leading-none text-charcoal">{value}</p>
      <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.16em] text-slate">{label}</p>
    </div>
  );
}

function Signal({
  ok,
  label,
  icon: Icon,
}: {
  ok: boolean;
  label: string;
  icon?: typeof MapPin;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-accent text-[9px] uppercase tracking-[0.1em]",
        ok ? "border-sage/35 bg-sage/10 text-sage" : "border-charcoal/12 text-slate/60"
      )}
    >
      {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
      {label}
    </span>
  );
}
