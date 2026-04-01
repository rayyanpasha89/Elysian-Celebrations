"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Destination = {
  name?: string;
  country?: string;
  tagline?: string | null;
};

type PackageTier = { name?: string; slug?: string };

type WeddingPayload = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    status: string;
    destination: Destination | null;
    package_tier: PackageTier | null;
  } | null;
  events: {
    id: string;
    name: string;
    date: string | null;
    venue: string | null;
  }[];
};

type EventStatus = "CONFIRMED" | "PLANNING" | "PENDING";

function eventStatusClass(s: EventStatus) {
  if (s === "CONFIRMED") return "border-sage/60 text-sage";
  if (s === "PLANNING") return "border-gold-primary/60 text-gold-dark";
  return "border-charcoal/25 text-slate";
}

function eventStatusLabel(s: EventStatus) {
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "PLANNING") return "Planning";
  return "Pending";
}

function inferEventStatus(
  event: WeddingPayload["events"][number],
  weddingDate: string | null
): EventStatus {
  if (!event.date) return "PENDING";
  if (event.venue) return "CONFIRMED";
  if (weddingDate) {
    const eventTime = new Date(event.date).getTime();
    const weddingTime = new Date(weddingDate).getTime();
    if (Number.isFinite(eventTime) && Number.isFinite(weddingTime) && eventTime <= weddingTime) {
      return "CONFIRMED";
    }
  }
  return "PLANNING";
}

export default function ClientWeddingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeddingPayload | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    date: "",
    venue: "",
    notes: "",
  });

  const loadWedding = useCallback(async () => {
    const res = await fetch("/api/wedding");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json as WeddingPayload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await loadWedding();
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) {
          setData({ wedding: null, events: [] });
          toast.error("Could not load wedding details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWedding]);

  const addEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim()) return;

    setSavingEvent(true);
    try {
      const res = await fetch("/api/wedding/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          date: draft.date || null,
          venue: draft.venue.trim() || null,
          notes: draft.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const created = json.event as WeddingPayload["events"][number];
      setData((current) =>
        current
          ? {
              ...current,
              events: [...current.events, created].sort((a, b) => {
                const left = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
                const right = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
                return left - right;
              }),
            }
          : current
      );

      setDraft({ name: "", date: "", venue: "", notes: "" });
      setShowEventForm(false);
      toast.success("Event added");
    } catch {
      toast.error("Failed to add event");
    } finally {
      setSavingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-12 w-64 bg-charcoal/10" />
        <div className="h-48 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  const wedding = data?.wedding;
  const events = data?.events ?? [];

  if (!wedding) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
          <p className={dashLabel}>Wedding</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal md:text-4xl">
            No wedding yet
          </h2>
          <p className="font-heading mt-2 text-sm text-slate">
            Complete onboarding to add your wedding details.
          </p>
        </motion.header>
        <div className="mt-12">
          <ListEmptyState hint="Go to onboarding from the dashboard to create your wedding." />
        </div>
      </motion.div>
    );
  }

  const dest = wedding.destination;
  const tier = wedding.package_tier;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
        <p className={dashLabel}>Wedding</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal md:text-4xl">
          {wedding.name}
        </h2>
        <p className="font-heading mt-2 text-sm text-slate">
          {wedding.date
            ? new Date(wedding.date).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Date TBD"}
        </p>
      </motion.header>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <motion.div variants={fadeUp} className={cn(dashCard, "lg:col-span-1")}>
          <p className={dashLabel}>Destination</p>
          <div className="mt-4 aspect-[4/3] border border-charcoal/10 bg-gradient-to-br from-midnight/80 to-charcoal/40" />
          <h3 className="font-display mt-4 text-xl text-charcoal">
            {dest?.name ?? "Not set"}
          </h3>
          <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-dark">
            {dest?.country ?? ""}
          </p>
          <p className="font-heading mt-3 text-sm font-light text-slate">
            {dest?.tagline ?? "Choose a destination to see details here."}
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className={cn(dashCard, "lg:col-span-2")}>
          <p className={dashLabel}>Package tier</p>
          <p className="font-display mt-6 text-4xl font-semibold tracking-tight text-charcoal">
            {tier?.name ?? "—"}
          </p>
          <p className="font-heading mt-4 max-w-xl text-sm font-light leading-relaxed text-slate">
            Your package tier is used for budgeting and vendor matching when you book through Elysian.
          </p>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Events</p>
          <h3 className="font-display mt-2 text-2xl text-charcoal">Weekend programme</h3>
        </div>
        <button type="button" className={dashBtn} onClick={() => setShowEventForm((v) => !v)}>
          {showEventForm ? "Close form" : "Add Event"}
        </button>
      </motion.div>

      {showEventForm ? (
        <motion.form
          variants={fadeUp}
          onSubmit={addEvent}
          className="mt-6 border border-charcoal/8 bg-ivory p-5"
        >
          <p className={dashLabel}>New event</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Event name"
              className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((current) => ({ ...current, date: event.target.value }))
              }
              className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
            <input
              type="text"
              value={draft.venue}
              onChange={(event) =>
                setDraft((current) => ({ ...current, venue: event.target.value }))
              }
              placeholder="Venue"
              className="border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
            <div className="border border-charcoal/15 px-4 py-3 text-sm text-slate">
              This will save into your active wedding timeline.
            </div>
          </div>
          <textarea
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Notes, vendor reminders, timeline details..."
            className="mt-4 min-h-[96px] w-full border border-charcoal/15 bg-transparent px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className={dashBtn} disabled={savingEvent}>
              {savingEvent ? "Saving..." : "Save event"}
            </button>
            <button
              type="button"
              className="font-accent border border-charcoal/15 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary"
              onClick={() => setShowEventForm(false)}
            >
              Cancel
            </button>
          </div>
        </motion.form>
      ) : null}

      {events.length === 0 ? (
        <div className="mt-8">
          <ListEmptyState hint="Add events to your wedding timeline as you confirm venues and dates." />
        </div>
      ) : (
        <motion.ul
          variants={fadeUp}
          className="mt-8 grid list-none grid-cols-1 gap-6 pl-0 md:grid-cols-2"
        >
          {events.map((ev) => {
            const st = inferEventStatus(ev, wedding.date);
            const d = ev.date ?? wedding.date;
            return (
              <li key={ev.id} className={dashCard}>
                <div className="flex items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                  <h4 className="font-display text-xl text-charcoal">{ev.name}</h4>
                  <span
                    className={cn(
                      "shrink-0 border px-3 py-1 font-accent text-[10px] uppercase tracking-[0.15em]",
                      eventStatusClass(st)
                    )}
                  >
                    {eventStatusLabel(st)}
                  </span>
                </div>
                <p className="font-heading mt-4 text-sm text-charcoal">
                  {d
                    ? new Date(d).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Date TBD"}
                </p>
                <p className="font-heading mt-2 text-sm font-light text-slate">
                  {ev.venue ?? "Venue TBD"}
                </p>
              </li>
            );
          })}
        </motion.ul>
      )}
    </motion.div>
  );
}
