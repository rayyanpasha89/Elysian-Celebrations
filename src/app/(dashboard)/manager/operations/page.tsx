"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, MapPin, Radio } from "lucide-react";
import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type OperationsEvent = {
  id: string;
  name: string;
  date: string | null;
  status: string;
  eventType: string;
  destination: string | null;
  country: string | null;
  heroImage: string | null;
  functionCount: number;
  nextFunctionAt: string | null;
  openItems: number;
  criticalItems: number;
  overdueItems: number;
};

function dateLabel(value: string | null) {
  if (!value) return "Date being finalized";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function OperationsEventsPage() {
  const [events, setEvents] = useState<OperationsEvent[]>([]);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const response = await fetch("/api/operations/events", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Events could not be loaded");
    return json as { events: OperationsEvent[]; needsProfile: boolean };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const result = await load();
        if (!cancelled) {
          setEvents(result.events);
          setNeedsProfile(result.needsProfile);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const pulse = useMemo(
    () => ({
      open: events.reduce((sum, event) => sum + event.openItems, 0),
      urgent: events.reduce((sum, event) => sum + event.criticalItems, 0),
      overdue: events.reduce((sum, event) => sum + event.overdueItems, 0),
      functions: events.reduce((sum, event) => sum + event.functionCount, 0),
    }),
    [events]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-56 bg-charcoal/5" />
        <div className="grid gap-5 md:grid-cols-2"><div className="h-72 bg-charcoal/5" /><div className="h-72 bg-charcoal/5" /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <DashboardLoadError
        eyebrow="Live delivery"
        pageTitle="Operations"
        label="Operations feed unavailable"
        title="We could not load your assigned events"
        description="No event or incident counts have been inferred. Retry to reconnect to the operations source of truth."
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative min-h-[18rem] overflow-hidden border border-charcoal/10 bg-charcoal-brown text-ivory">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(51,61,41,.96),rgba(51,61,41,.5)),url(${events[0]?.heroImage ?? "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1800&q=80"})`,
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(182,173,144,0.3),transparent_45%)]" />
        <div className="relative grid min-h-[18rem] gap-8 p-7 md:grid-cols-[1fr_auto] md:items-end md:p-10">
          <div>
            <div className="flex items-center gap-2 font-accent text-[10px] uppercase tracking-[0.24em] text-khaki-beige"><Radio className="h-4 w-4" /> Live delivery</div>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight md:text-6xl">Keep the room calm while the operation stays exact.</h1>
            <p className="mt-4 max-w-2xl font-heading text-sm leading-7 text-ivory/68">Every assigned event, open incident, function handoff, partner contact, and next decision in one command surface.</p>
          </div>
          <div className="grid grid-cols-2 gap-px border border-ivory/12 bg-ivory/12">
            {[
              ["Assigned", events.length],
              ["Functions", pulse.functions],
              ["Open", pulse.open],
              ["Urgent", pulse.urgent],
            ].map(([label, value]) => (
              <div key={label} className="min-w-28 bg-charcoal-brown/85 px-5 py-4 backdrop-blur-sm"><p className="font-display text-3xl">{value}</p><p className="mt-1 font-accent text-[9px] uppercase tracking-[0.18em] text-ivory/50">{label}</p></div>
            ))}
          </div>
        </div>
      </section>

      {needsProfile ? (
        <section className="border border-dashed border-gold-primary/40 bg-cream p-7">
          <p className={dashLabel}>Access setup</p>
          <h2 className="mt-2 font-display text-2xl text-charcoal">Your operations profile is not active yet</h2>
          <p className="mt-2 max-w-2xl font-heading text-sm leading-6 text-slate">An administrator must choose your role template and activate your employee profile before event assignments appear.</p>
        </section>
      ) : events.length === 0 ? (
        <section className="border border-dashed border-gold-primary/40 bg-cream p-10 text-center">
          <CalendarClock className="mx-auto h-9 w-9 text-camel" />
          <h2 className="mt-4 font-display text-3xl text-charcoal">No event is assigned to you</h2>
          <p className="mx-auto mt-2 max-w-xl font-heading text-sm leading-6 text-slate">Your portal is ready. An administrator can assign you to an event with a role, shift window, and handoff notes.</p>
        </section>
      ) : (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className={dashLabel}>Assigned event rooms</p><h2 className="mt-2 font-display text-3xl text-charcoal">Choose a command center</h2></div>
            {pulse.overdue > 0 ? <span className={cn(statusBadgeBase, "border-saddle-brown/35 bg-saddle-brown/8 text-saddle-brown")}>{pulse.overdue} overdue</span> : null}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {events.map((event, index) => (
              <Link key={event.id} href={`/manager/operations/${event.id}`} className="group relative min-h-[21rem] overflow-hidden border border-charcoal/10 bg-charcoal-brown text-ivory shadow-[0_20px_70px_rgba(51,61,41,0.08)]">
                <div aria-hidden className="absolute inset-0 bg-cover bg-center transition duration-700 motion-safe:group-hover:scale-105" style={{ backgroundImage: `linear-gradient(180deg,rgba(51,61,41,.12),rgba(51,61,41,.94)),url(${event.heroImage ?? "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80"})` }} />
                <div className="relative flex min-h-[21rem] flex-col justify-between p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-accent text-[10px] uppercase tracking-[0.22em] text-khaki-beige">{String(index + 1).padStart(2, "0")} · {event.eventType}</span>
                    <span className={cn(statusBadgeBase, "border-ivory/18 bg-charcoal-brown/40 text-ivory/75 backdrop-blur")}>{event.status}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-4xl leading-tight">{event.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-heading text-xs text-ivory/64">
                      <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />{dateLabel(event.date)}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.destination ?? "Destination pending"}</span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-px bg-ivory/12">
                      <div className="bg-charcoal-brown/72 px-3 py-3"><p className="font-display text-xl">{event.functionCount}</p><p className="font-accent text-[8px] uppercase tracking-[0.16em] text-ivory/45">Functions</p></div>
                      <div className="bg-charcoal-brown/72 px-3 py-3"><p className="font-display text-xl">{event.openItems}</p><p className="font-accent text-[8px] uppercase tracking-[0.16em] text-ivory/45">Open items</p></div>
                      <div className="bg-charcoal-brown/72 px-3 py-3"><p className={cn("font-display text-xl", event.criticalItems > 0 && "text-khaki-beige")}>{event.criticalItems}</p><p className="font-accent text-[8px] uppercase tracking-[0.16em] text-ivory/45">Urgent</p></div>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-ivory/14 pt-4"><span className="font-accent text-[9px] uppercase tracking-[0.2em] text-ivory/55">Open operations room</span><ArrowUpRight className="h-5 w-5 text-khaki-beige transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
                  </div>
                </div>
                {event.criticalItems > 0 ? <span className="absolute right-5 top-14 flex items-center gap-1 font-accent text-[9px] uppercase tracking-[0.14em] text-khaki-beige"><AlertTriangle className="h-3.5 w-3.5" /> attention</span> : null}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
