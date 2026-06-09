"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { cn } from "@/lib/utils";

// ─── API shapes ─────────────────────────────────────────────────────────────

type ScheduleEvent = {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  timeBlock: string | null;
  sortOrder: number;
  logistics: {
    guest_arrival_time: string | null;
    vendor_load_in_time: string | null;
    family_call_time: string | null;
  } | null;
};
type ScheduleDay = {
  id: string;
  name: string;
  date: string | null;
  sortOrder: number;
  events: ScheduleEvent[];
};
type TimelineItem = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  source?: "timeline" | "event";
};

// ─── Time helpers (wall-clock, TZ-stable via UTC) ───────────────────────────

function clockToMinutes(value: string | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(":");
  const hh = Number(h);
  const mm = Number(m ?? "0");
  if (Number.isNaN(hh)) return null;
  return hh * 60 + (Number.isNaN(mm) ? 0 : mm);
}
function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function dayKey(date: string | null): string | null {
  return date ? date.slice(0, 10) : null;
}
/** Read a stored ISO datetime back as a stable wall-clock (UTC accessors). */
function isoToWall(iso: string | null): { key: string; minutes: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { key, minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function makeDueIso(dateKey: string, minutes: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(
    Date.UTC(y, (m ?? 1) - 1, d ?? 1, Math.floor(minutes / 60), minutes % 60)
  ).toISOString();
}
function formatDayDate(date: string | null): string {
  if (!date) return "Date flexible";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Date flexible";
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Moment model ───────────────────────────────────────────────────────────

type MomentKind = "loadin" | "call" | "arrival" | "event" | "custom";

type Moment = {
  key: string;
  kind: MomentKind;
  minutes: number | null;
  title: string;
  subtitle?: string | null;
  endMinutes?: number | null;
  // custom-only
  itemId?: string;
  done?: boolean;
};

const KIND_META: Record<
  MomentKind,
  { label: string; dot: string; ring: string; icon: typeof Clock }
> = {
  loadin: { label: "Vendor load-in", dot: "bg-slate/50", ring: "border-slate/30", icon: Truck },
  call: { label: "Family call", dot: "bg-gold-primary", ring: "border-gold-primary/40", icon: Users },
  arrival: { label: "Guests arrive", dot: "bg-sage", ring: "border-sage/40", icon: Users },
  event: { label: "Function", dot: "bg-gold-primary", ring: "border-gold-primary/50", icon: Sparkles },
  custom: { label: "Moment", dot: "bg-charcoal/60", ring: "border-charcoal/25", icon: Clock },
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RunOfShowPage() {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [weddingName, setWeddingName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/timeline");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load timeline");
      const sched = (json.schedule ?? []) as ScheduleDay[];
      setSchedule(sched);
      setItems((json.items ?? []) as TimelineItem[]);
      setWeddingName(json.wedding?.name ?? null);
      setSelectedDayId((current) =>
        current && sched.some((d) => d.id === current)
          ? current
          : sched[0]?.id ?? null
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const customItems = useMemo(
    () => items.filter((i) => (i.source ?? "timeline") === "timeline"),
    [items]
  );

  const addMoment = useCallback(
    async (payload: { title: string; dueIso: string | null }) => {
      try {
        const res = await fetch("/api/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: payload.title, dueDate: payload.dueIso }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not add moment");
        setItems((prev) => [...prev, { ...(json as TimelineItem), source: "timeline" }]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add moment");
      }
    },
    []
  );

  const toggleItem = useCallback(async (id: string, done: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_completed: done } : i))
    );
    try {
      const res = await fetch(`/api/timeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: done }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_completed: !done } : i))
      );
      toast.error("Could not update moment");
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/timeline/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      toast.error("Could not remove moment");
      void refetch();
    }
  }, [refetch]);

  const selectedDay = schedule.find((d) => d.id === selectedDayId) ?? null;

  // Build moments for the selected day.
  const dayMoments = useMemo<Moment[]>(() => {
    if (!selectedDay) return [];
    const moments: Moment[] = [];
    for (const ev of selectedDay.events) {
      const l = ev.logistics;
      if (l?.vendor_load_in_time)
        moments.push({
          key: `${ev.id}-loadin`,
          kind: "loadin",
          minutes: clockToMinutes(l.vendor_load_in_time),
          title: "Vendor load-in",
          subtitle: ev.name,
        });
      if (l?.family_call_time)
        moments.push({
          key: `${ev.id}-call`,
          kind: "call",
          minutes: clockToMinutes(l.family_call_time),
          title: "Family call time",
          subtitle: ev.name,
        });
      if (l?.guest_arrival_time)
        moments.push({
          key: `${ev.id}-arrival`,
          kind: "arrival",
          minutes: clockToMinutes(l.guest_arrival_time),
          title: "Guests arrive",
          subtitle: ev.name,
        });
      moments.push({
        key: `${ev.id}-event`,
        kind: "event",
        minutes: clockToMinutes(ev.startTime),
        endMinutes: clockToMinutes(ev.endTime),
        title: ev.name,
        subtitle: ev.venue,
      });
    }
    const key = dayKey(selectedDay.date);
    for (const item of customItems) {
      const wall = isoToWall(item.due_date);
      if (!wall || !key || wall.key !== key) continue;
      moments.push({
        key: `item-${item.id}`,
        kind: "custom",
        minutes: wall.minutes,
        title: item.title,
        subtitle: item.description,
        itemId: item.id,
        done: item.is_completed,
      });
    }
    return moments.sort((a, b) => {
      const am = a.minutes ?? 24 * 60 + 1;
      const bm = b.minutes ?? 24 * 60 + 1;
      return am - bm;
    });
  }, [selectedDay, customItems]);

  // Overlap detection between event blocks.
  const overlapKeys = useMemo(() => {
    const events = dayMoments.filter(
      (m) => m.kind === "event" && m.minutes != null && m.endMinutes != null
    );
    const flagged = new Set<string>();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (a.minutes! < b.endMinutes! && b.minutes! < a.endMinutes!) {
          flagged.add(a.key);
          flagged.add(b.key);
        }
      }
    }
    return flagged;
  }, [dayMoments]);

  // Untimed custom to-dos (no due_date) → prep checklist.
  const prepItems = useMemo(
    () => customItems.filter((i) => !i.due_date),
    [customItems]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Composing your run of show...</p>
      </div>
    );
  }

  if (schedule.length === 0 && customItems.length === 0) {
    return (
      <div className="border border-charcoal/10 bg-ivory p-8">
        <p className={dashLabel}>Run of show</p>
        <h1 className="mt-2 font-display text-3xl text-charcoal">
          Build your event plan first
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
          Your run of show composes itself from your celebration days, function
          times, and vendor call-times. Add days and functions in the planner and
          they will flow onto this schedule automatically.
        </p>
        <Link
          href="/client/wedding"
          className="mt-6 inline-flex items-center gap-2 border border-gold-primary px-6 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-all hover:bg-gold-primary hover:text-midnight"
        >
          Open the planner <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const totalEvents = schedule.reduce((sum, d) => sum + d.events.length, 0);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Hero */}
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden border border-charcoal/10 bg-ivory"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.12),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-dark">
              Run of show
            </p>
            <h1 className="mt-2 font-display text-3xl text-charcoal md:text-4xl">
              {weddingName ?? "Your celebration"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
              A minute-by-minute schedule composed from your function times and
              vendor call-times. Add bespoke moments and check them off on the day.
            </p>
          </div>
          <div className="flex gap-6">
            <Stat label="Days" value={schedule.length} />
            <Stat label="Functions" value={totalEvents} />
            <Stat label="Moments" value={customItems.length} />
          </div>
        </div>
      </motion.section>

      {/* Day tabs */}
      {schedule.length > 0 ? (
        <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1">
          {schedule.map((day, index) => {
            const active = day.id === selectedDayId;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={cn(
                  "shrink-0 border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-gold-primary bg-gold-primary/10"
                    : "border-charcoal/12 bg-ivory hover:border-gold-primary/40"
                )}
              >
                <span className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-dark">
                  Day {index + 1}
                </span>
                <span className="mt-0.5 block font-display text-base text-charcoal">
                  {day.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate">
                  {day.events.length} {day.events.length === 1 ? "function" : "functions"}
                </span>
              </button>
            );
          })}
        </motion.div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Timeline rail */}
        <motion.div variants={fadeUp} className="space-y-4">
          {selectedDay ? (
            <div className="border border-charcoal/10 bg-ivory">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/8 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gold-dark" />
                  <div>
                    <p className="font-display text-lg text-charcoal">{selectedDay.name}</p>
                    <p className="text-xs text-slate">{formatDayDate(selectedDay.date)}</p>
                  </div>
                </div>
                {overlapKeys.size > 0 ? (
                  <span className="border border-rose/35 bg-rose/10 px-2.5 py-1 font-accent text-[9px] uppercase tracking-[0.14em] text-rose">
                    Overlapping functions
                  </span>
                ) : null}
              </div>

              {dayMoments.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate">
                  No timed moments on this day yet. Add function times in the
                  planner, or add a custom moment on the right.
                </p>
              ) : (
                <ol className="relative p-5">
                  <span
                    aria-hidden
                    className="absolute bottom-6 left-[6.25rem] top-6 w-px bg-charcoal/12"
                  />
                  {dayMoments.map((m) => (
                    <MomentRow
                      key={m.key}
                      moment={m}
                      overlap={overlapKeys.has(m.key)}
                      onToggle={
                        m.itemId
                          ? () => toggleItem(m.itemId!, !m.done)
                          : undefined
                      }
                      onDelete={m.itemId ? () => deleteItem(m.itemId!) : undefined}
                    />
                  ))}
                </ol>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-charcoal/15 bg-ivory p-8 text-center text-sm text-slate">
              Select a day to view its run of show.
            </div>
          )}
        </motion.div>

        {/* Right column: add moment + prep */}
        <motion.div variants={fadeUp} className="space-y-4">
          <AddMoment
            day={selectedDay}
            onAdd={addMoment}
          />
          <PrepPanel
            items={prepItems}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onAdd={(title) => addMoment({ title, dueIso: null })}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="font-display text-3xl leading-none text-charcoal">{value}</p>
      <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
        {label}
      </p>
    </div>
  );
}

// ─── Moment row ─────────────────────────────────────────────────────────────

function MomentRow({
  moment,
  overlap,
  onToggle,
  onDelete,
}: {
  moment: Moment;
  overlap: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  const meta = KIND_META[moment.kind];
  const Icon = meta.icon;
  const isEvent = moment.kind === "event";
  const timeLabel =
    moment.minutes != null ? minutesToLabel(moment.minutes) : "Any time";
  const range =
    isEvent && moment.endMinutes != null
      ? `${timeLabel} – ${minutesToLabel(moment.endMinutes)}`
      : timeLabel;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex gap-4 pb-4 last:pb-0"
    >
      {/* time */}
      <div className="w-[5.5rem] shrink-0 pt-1 text-right">
        <p
          className={cn(
            "font-accent text-[11px] uppercase tracking-[0.1em]",
            moment.done ? "text-slate/50 line-through" : "text-charcoal"
          )}
        >
          {timeLabel}
        </p>
      </div>

      {/* marker */}
      <div className="relative z-10 flex w-3 shrink-0 justify-center pt-1.5">
        <span
          className={cn(
            "h-3 w-3 rounded-full ring-4 ring-ivory",
            moment.done ? "bg-sage" : meta.dot
          )}
        />
      </div>

      {/* card */}
      <div
        className={cn(
          "min-w-0 flex-1 border bg-ivory p-3 transition-colors",
          overlap
            ? "border-rose/40"
            : isEvent
              ? "border-gold-primary/30 bg-gold-primary/[0.04]"
              : "border-charcoal/10",
          moment.done && "opacity-60"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-gold-dark" />
              <p
                className={cn(
                  "truncate font-heading text-sm text-charcoal",
                  isEvent && "font-display text-base",
                  moment.done && "line-through"
                )}
              >
                {moment.title}
              </p>
            </div>
            {moment.subtitle ? (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate">
                {isEvent ? <MapPin className="h-3 w-3 shrink-0" /> : null}
                {moment.subtitle}
              </p>
            ) : null}
            {isEvent ? (
              <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.12em] text-gold-dark">
                {range}
              </p>
            ) : (
              <p className="mt-0.5 font-accent text-[9px] uppercase tracking-[0.14em] text-slate/70">
                {meta.label}
              </p>
            )}
          </div>

          {onToggle || onDelete ? (
            <div className="flex shrink-0 items-center gap-1">
              {onToggle ? (
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label="Toggle done"
                  className={cn(
                    "grid h-6 w-6 place-items-center border transition-colors",
                    moment.done
                      ? "border-sage bg-sage text-ivory"
                      : "border-charcoal/20 text-transparent hover:border-sage"
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete moment"
                  className="grid h-6 w-6 place-items-center border border-charcoal/15 text-slate transition-colors hover:border-rose hover:text-rose"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

// ─── Add moment ─────────────────────────────────────────────────────────────

function AddMoment({
  day,
  onAdd,
}: {
  day: ScheduleDay | null;
  onAdd: (p: { title: string; dueIso: string | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("18:00");
  const [busy, setBusy] = useState(false);
  const canTime = Boolean(day?.date);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    let dueIso: string | null = null;
    if (canTime && day?.date) {
      const key = day.date.slice(0, 10);
      const mins = clockToMinutes(time) ?? 18 * 60;
      dueIso = makeDueIso(key, mins);
    }
    await onAdd({ title: trimmed, dueIso });
    setBusy(false);
    setTitle("");
  };

  return (
    <form onSubmit={submit} className="border border-charcoal/10 bg-ivory p-4">
      <p className={dashLabel}>Add a moment</p>
      <p className="mt-1 text-xs leading-relaxed text-slate">
        {canTime
          ? `Drops onto ${day?.name} at the time you set.`
          : "Add this day's date in the planner to time-anchor moments."}
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="First dance, cake cutting, baraat…"
        className="mt-3 w-full border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
      />
      <div className="mt-3 flex items-center gap-2">
        {canTime ? (
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border border-charcoal/15 bg-transparent px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
          />
        ) : null}
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 border px-4 py-2.5 font-accent text-[10px] uppercase tracking-[0.18em] transition-all",
            busy || !title.trim()
              ? "border-charcoal/10 text-slate"
              : "border-gold-primary bg-gold-primary text-midnight hover:bg-gold-dark hover:border-gold-dark"
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Add to schedule
        </button>
      </div>
    </form>
  );
}

// ─── Prep panel ─────────────────────────────────────────────────────────────

function PrepPanel({
  items,
  onToggle,
  onDelete,
  onAdd,
}: {
  items: TimelineItem[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const done = items.filter((i) => i.is_completed).length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setTitle("");
  };

  return (
    <div className="border border-charcoal/10 bg-ivory p-4">
      <div className="flex items-center justify-between">
        <p className={dashLabel}>Prep checklist</p>
        <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
          {done}/{items.length}
        </span>
      </div>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untimed to-do…"
          className="w-full border border-charcoal/15 bg-transparent px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          aria-label="Add to-do"
          className="grid h-9 w-9 shrink-0 place-items-center border border-charcoal/15 text-slate transition-colors hover:border-gold-primary hover:text-gold-dark disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      <ul className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <li className="border border-dashed border-charcoal/12 px-3 py-5 text-center text-xs text-slate">
              No loose to-dos. Nice and tidy.
            </li>
          ) : (
            items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-center gap-2 border border-charcoal/10 px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() => onToggle(item.id, !item.is_completed)}
                  aria-label="Toggle"
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center border transition-colors",
                    item.is_completed
                      ? "border-sage bg-sage text-ivory"
                      : "border-charcoal/25 text-transparent hover:border-sage"
                  )}
                >
                  <Check className="h-3 w-3" />
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-heading text-xs text-charcoal",
                    item.is_completed && "text-slate/60 line-through"
                  )}
                >
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  aria-label="Delete"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3 text-slate hover:text-rose" />
                </button>
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
