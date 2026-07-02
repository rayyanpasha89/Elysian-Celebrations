"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Armchair,
  Check,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { cn } from "@/lib/utils";

// ─── Domain ─────────────────────────────────────────────────────────────────

type GuestSide = "BRIDE" | "GROOM" | "COUPLE";
type RsvpStatus = "PENDING" | "CONFIRMED" | "DECLINED" | "MAYBE";

type Guest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  side: GuestSide;
  rsvp_status: RsvpStatus;
  meal_pref: string | null;
  plus_one: boolean;
  table_number: number | null;
  notes: string | null;
};

const SIDES: { key: GuestSide; label: string; short: string; color: string }[] = [
  { key: "BRIDE", label: "Bride's side", short: "Bride", color: "#D4A0A0" },
  { key: "GROOM", label: "Groom's side", short: "Groom", color: "#A4AC86" },
  { key: "COUPLE", label: "Both / shared", short: "Both", color: "#C9A96E" },
];
const SIDE_MAP = Object.fromEntries(SIDES.map((s) => [s.key, s])) as Record<
  GuestSide,
  (typeof SIDES)[number]
>;

const RSVPS: {
  key: RsvpStatus;
  label: string;
  dot: string;
  text: string;
  chip: string;
}[] = [
  { key: "CONFIRMED", label: "Confirmed", dot: "bg-sage", text: "text-sage", chip: "border-sage/35 bg-sage/10 text-sage" },
  { key: "PENDING", label: "Pending", dot: "bg-gold-primary", text: "text-gold-dark", chip: "border-gold-primary/35 bg-gold-primary/10 text-gold-dark" },
  { key: "MAYBE", label: "Maybe", dot: "bg-slate/50", text: "text-slate", chip: "border-charcoal/15 bg-charcoal/5 text-slate" },
  { key: "DECLINED", label: "Declined", dot: "bg-rose", text: "text-rose", chip: "border-rose/35 bg-rose/10 text-rose" },
];
const RSVP_MAP = Object.fromEntries(RSVPS.map((r) => [r.key, r])) as Record<
  RsvpStatus,
  (typeof RSVPS)[number]
>;

const MEAL_PRESETS = [
  "Vegetarian",
  "Non-vegetarian",
  "Vegan",
  "Jain",
  "Halal",
  "Gluten-free",
  "Kids meal",
];

const SEATS_PER_TABLE = 10;

/** Heads a guest contributes: themselves + a plus-one if flagged. */
function heads(guest: Guest) {
  return 1 + (guest.plus_one ? 1 : 0);
}

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

// ─── Page ───────────────────────────────────────────────────────────────────

export default function GuestStudioPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "seating">("list");

  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<GuestSide | "ALL">("ALL");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | "ALL">("ALL");

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/guests");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load guests");
      setGuests((json.guests ?? []) as Guest[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load guests");
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Optimistic patch — update locally, persist, revert on failure.
  const mutateGuest = useCallback(async (id: string, patch: Partial<Guest>) => {
    let snapshot: Guest | undefined;
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        snapshot = g;
        return { ...g, ...patch };
      })
    );
    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Could not update guest");
      }
    } catch (error) {
      if (snapshot) {
        const restore = snapshot;
        setGuests((prev) => prev.map((g) => (g.id === id ? restore : g)));
      }
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }, []);

  const addGuest = useCallback(
    async (payload: { name: string; side: GuestSide; plusOne: boolean }) => {
      try {
        const res = await fetch("/api/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            side: payload.side,
            plusOne: payload.plusOne,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not add guest");
        setGuests((prev) => [...prev, json as Guest]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add guest");
      }
    },
    []
  );

  const removeGuest = useCallback(async (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    try {
      const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Could not remove guest");
      }
      toast.success("Guest removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove guest");
      void refetchRef.current();
    }
  }, []);

  // ── Derived insight ──
  const stats = useMemo(() => {
    const invitedHeads = guests.reduce((sum, g) => sum + heads(g), 0);
    const confirmed = guests.filter((g) => g.rsvp_status === "CONFIRMED");
    const confirmedHeads = confirmed.reduce((sum, g) => sum + heads(g), 0);
    const byStatus = (s: RsvpStatus) =>
      guests.filter((g) => g.rsvp_status === s).length;
    const bySide = (s: GuestSide) => guests.filter((g) => g.side === s).length;
    const responded = guests.filter((g) => g.rsvp_status !== "PENDING").length;
    const meals = new Map<string, number>();
    for (const g of confirmed) {
      if (!g.meal_pref) continue;
      meals.set(g.meal_pref, (meals.get(g.meal_pref) ?? 0) + heads(g));
    }
    return {
      total: guests.length,
      invitedHeads,
      confirmedHeads,
      confirmed: byStatus("CONFIRMED"),
      pending: byStatus("PENDING"),
      maybe: byStatus("MAYBE"),
      declined: byStatus("DECLINED"),
      bride: bySide("BRIDE"),
      groom: bySide("GROOM"),
      both: bySide("COUPLE"),
      respondedPct:
        guests.length > 0 ? Math.round((responded / guests.length) * 100) : 0,
      meals: [...meals.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [guests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (sideFilter !== "ALL" && g.side !== sideFilter) return false;
      if (rsvpFilter !== "ALL" && g.rsvp_status !== rsvpFilter) return false;
      if (
        term &&
        !`${g.name} ${g.email ?? ""} ${g.meal_pref ?? ""}`.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [guests, search, sideFilter, rsvpFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading guest studio...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <SummaryBand stats={stats} />

      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-3 border border-charcoal/10 bg-cream/40 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="inline-flex items-center gap-1 border border-charcoal/10 bg-ivory p-1">
          {(
            [
              { key: "list", label: "Guest list", icon: Users },
              { key: "seating", label: "Seating", icon: Armchair },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 font-accent text-[10px] uppercase tracking-[0.18em] transition-colors",
                  view === tab.key
                    ? "bg-charcoal text-ivory"
                    : "text-slate hover:text-charcoal"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
          {stats.total} {stats.total === 1 ? "guest" : "guests"} ·{" "}
          {stats.invitedHeads} {stats.invitedHeads === 1 ? "head" : "heads"} invited
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <QuickAdd onAdd={addGuest} />
            <FilterBar
              search={search}
              setSearch={setSearch}
              sideFilter={sideFilter}
              setSideFilter={setSideFilter}
              rsvpFilter={rsvpFilter}
              setRsvpFilter={setRsvpFilter}
              total={guests.length}
              shown={filtered.length}
            />
            <GuestList
              guests={filtered}
              onMutate={mutateGuest}
              onRemove={removeGuest}
              emptyAll={guests.length === 0}
            />
          </motion.div>
        ) : (
          <motion.div
            key="seating"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <SeatingPlanner guests={guests} onMutate={mutateGuest} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type Stats = {
  total: number;
  invitedHeads: number;
  confirmedHeads: number;
  confirmed: number;
  pending: number;
  maybe: number;
  declined: number;
  bride: number;
  groom: number;
  both: number;
  respondedPct: number;
  meals: [string, number][];
};

// ─── Summary band ───────────────────────────────────────────────────────────

function SummaryBand({ stats }: { stats: Stats }) {
  const rsvpSegments = [
    { key: "CONFIRMED" as const, value: stats.confirmed },
    { key: "PENDING" as const, value: stats.pending },
    { key: "MAYBE" as const, value: stats.maybe },
    { key: "DECLINED" as const, value: stats.declined },
  ].filter((s) => s.value > 0);
  const denom = Math.max(stats.total, 1);
  const sideDenom = Math.max(stats.bride + stats.groom + stats.both, 1);
  const countByStatus: Record<string, number> = {
    confirmed: stats.confirmed,
    pending: stats.pending,
    maybe: stats.maybe,
    declined: stats.declined,
  };

  return (
    <motion.section
      variants={fadeUp}
      className="relative overflow-hidden border border-charcoal/10 bg-ivory"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.12),transparent_55%)]"
      />
      <div className="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:p-8">
        <div>
          <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-dark">
            Guest studio
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-5xl leading-none text-charcoal">
              {stats.confirmedHeads}
            </span>
            <span className="pb-1 font-heading text-sm text-slate">
              confirmed heads
              <span className="block text-xs text-slate/70">
                of {stats.invitedHeads} invited
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate">
            Track every reply, balance both sides, plan the seating, and keep a
            live dietary count your caterer can actually use.
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className={dashLabel}>RSVP progress</p>
              <p className="font-heading text-xs text-slate">
                {stats.respondedPct}% replied
              </p>
            </div>
            <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-charcoal/8">
              {rsvpSegments.map((s) => (
                <div
                  key={s.key}
                  title={`${RSVP_MAP[s.key].label} · ${s.value}`}
                  style={{ width: `${(s.value / denom) * 100}%` }}
                  className={cn("h-full border-r border-ivory/60 last:border-r-0", RSVP_MAP[s.key].dot)}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {RSVPS.map((r) => (
                <span
                  key={r.key}
                  className="inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.12em] text-slate"
                >
                  <span className={cn("h-2 w-2 rounded-full", r.dot)} />
                  {r.label} · {countByStatus[r.key.toLowerCase()] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-charcoal/10 bg-cream/30 p-4">
            <p className={dashLabel}>Both sides</p>
            <div className="mt-3 space-y-3">
              {SIDES.map((side) => {
                const value =
                  side.key === "BRIDE"
                    ? stats.bride
                    : side.key === "GROOM"
                      ? stats.groom
                      : stats.both;
                return (
                  <div key={side.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading text-charcoal">{side.short}</span>
                      <span className="text-slate">{value}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(value / sideDenom) * 100}%`,
                          backgroundColor: side.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-charcoal/10 bg-cream/30 p-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-gold-dark" />
              <p className={dashLabel}>Catering count</p>
            </div>
            {stats.meals.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {stats.meals.slice(0, 6).map(([meal, count]) => (
                  <li key={meal} className="flex items-center justify-between text-xs">
                    <span className="truncate text-charcoal">{meal}</span>
                    <span className="font-display text-sm text-gold-dark">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-slate">
                Set meal preferences on confirmed guests and a live plate count
                rolls up here for your caterer.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

// ─── Quick add ──────────────────────────────────────────────────────────────

function QuickAdd({
  onAdd,
}: {
  onAdd: (p: { name: string; side: GuestSide; plusOne: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [side, setSide] = useState<GuestSide>("COUPLE");
  const [plusOne, setPlusOne] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    await onAdd({ name: trimmed, side, plusOne });
    setBusy(false);
    setName("");
    setPlusOne(false);
    inputRef.current?.focus();
  };

  return (
    <motion.form
      variants={fadeUp}
      onSubmit={submit}
      className="flex flex-col gap-3 border border-charcoal/10 bg-ivory p-4 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-2 border border-charcoal/15 bg-transparent px-3 focus-within:border-gold-primary">
        <UserPlus className="h-4 w-4 shrink-0 text-slate" />
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a guest by name…"
          className="w-full bg-transparent py-2.5 font-heading text-sm text-charcoal outline-none placeholder:text-slate/60"
        />
      </div>
      <div className="inline-flex items-center border border-charcoal/12 bg-cream/40 p-1">
        {SIDES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSide(s.key)}
            className={cn(
              "px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
              side === s.key ? "bg-charcoal text-ivory" : "text-slate hover:text-charcoal"
            )}
          >
            {s.short}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPlusOne((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
          plusOne
            ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
            : "border-charcoal/15 text-slate hover:border-gold-primary/50"
        )}
      >
        <Plus className="h-3 w-3" /> One
      </button>
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 border px-5 py-2.5 font-accent text-[10px] uppercase tracking-[0.18em] transition-all",
          busy || !name.trim()
            ? "border-charcoal/10 text-slate"
            : "border-gold-primary bg-gold-primary text-midnight hover:bg-gold-dark hover:border-gold-dark"
        )}
      >
        Add guest
      </button>
    </motion.form>
  );
}

// ─── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  search,
  setSearch,
  sideFilter,
  setSideFilter,
  rsvpFilter,
  setRsvpFilter,
  total,
  shown,
}: {
  search: string;
  setSearch: (v: string) => void;
  sideFilter: GuestSide | "ALL";
  setSideFilter: (v: GuestSide | "ALL") => void;
  rsvpFilter: RsvpStatus | "ALL";
  setRsvpFilter: (v: RsvpStatus | "ALL") => void;
  total: number;
  shown: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col gap-3 border border-charcoal/10 bg-ivory p-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex items-center gap-2 border border-charcoal/15 px-3 lg:w-64">
        <Search className="h-4 w-4 shrink-0 text-slate" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests…"
          className="w-full bg-transparent py-2 font-heading text-sm text-charcoal outline-none placeholder:text-slate/60"
        />
        {search ? (
          <button type="button" onClick={() => setSearch("")} aria-label="Clear">
            <X className="h-3.5 w-3.5 text-slate" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={[
            { key: "ALL", label: "All sides" },
            ...SIDES.map((s) => ({ key: s.key, label: s.short })),
          ]}
          value={sideFilter}
          onChange={(v) => setSideFilter(v as GuestSide | "ALL")}
        />
        <Segmented
          options={[
            { key: "ALL", label: "All RSVP" },
            ...RSVPS.map((r) => ({ key: r.key, label: r.label })),
          ]}
          value={rsvpFilter}
          onChange={(v) => setRsvpFilter(v as RsvpStatus | "ALL")}
        />
        <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
          {shown}/{total}
        </span>
      </div>
    </motion.div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center border border-charcoal/12 bg-cream/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "px-2.5 py-1.5 font-accent text-[9px] uppercase tracking-[0.12em] transition-colors",
            value === o.key ? "bg-charcoal text-ivory" : "text-slate hover:text-charcoal"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Guest list ─────────────────────────────────────────────────────────────

function GuestList({
  guests,
  onMutate,
  onRemove,
  emptyAll,
}: {
  guests: Guest[];
  onMutate: (id: string, patch: Partial<Guest>) => void;
  onRemove: (id: string) => void;
  emptyAll: boolean;
}) {
  if (guests.length === 0) {
    return (
      <div className="border border-dashed border-charcoal/15 bg-ivory p-10 text-center">
        <Users className="mx-auto h-8 w-8 text-slate/40" />
        <p className="mt-3 font-display text-lg text-charcoal">
          {emptyAll ? "No guests yet" : "No guests match those filters"}
        </p>
        <p className="mt-1 text-sm text-slate">
          {emptyAll
            ? "Add your first guest above to start the list."
            : "Try clearing the side or RSVP filter."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {guests.map((guest) => (
        <GuestRow key={guest.id} guest={guest} onMutate={onMutate} onRemove={onRemove} />
      ))}
    </div>
  );
}

function GuestRow({
  guest,
  onMutate,
  onRemove,
}: {
  guest: Guest;
  onMutate: (id: string, patch: Partial<Guest>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const side = SIDE_MAP[guest.side];
  const rsvp = RSVP_MAP[guest.rsvp_status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-charcoal/10 bg-ivory"
    >
      <div className="flex items-center gap-3 p-3">
        <span
          className="h-9 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: side.color }}
          title={side.label}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-heading text-sm text-charcoal">{guest.name}</p>
            {guest.plus_one ? (
              <span className="border border-gold-primary/30 bg-gold-primary/10 px-1.5 py-0.5 font-accent text-[9px] uppercase tracking-[0.12em] text-gold-dark">
                +1
              </span>
            ) : null}
            {guest.table_number ? (
              <span className="inline-flex items-center gap-1 border border-charcoal/12 px-1.5 py-0.5 font-accent text-[9px] uppercase tracking-[0.12em] text-slate">
                <Armchair className="h-2.5 w-2.5" /> T{guest.table_number}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate">
            {side.label}
            {guest.meal_pref ? ` · ${guest.meal_pref}` : ""}
            {guest.email ? ` · ${guest.email}` : ""}
          </p>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {RSVPS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onMutate(guest.id, { rsvp_status: r.key })}
              title={r.label}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border transition-all",
                guest.rsvp_status === r.key
                  ? cn(r.chip, "scale-110")
                  : "border-charcoal/12 hover:border-charcoal/30"
              )}
            >
              <span className={cn("block h-2 w-2 rounded-full", r.dot)} />
            </button>
          ))}
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 border px-2 py-1 font-accent text-[9px] uppercase tracking-[0.12em] sm:hidden",
            rsvp.chip
          )}
        >
          {rsvp.label}
        </span>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate transition-colors hover:text-gold-dark"
        >
          {expanded ? "Close" : "Edit"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-charcoal/8"
          >
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Side">
                <div className="inline-flex border border-charcoal/12 bg-cream/30 p-0.5">
                  {SIDES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onMutate(guest.id, { side: s.key })}
                      className={cn(
                        "px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.12em] transition-colors",
                        guest.side === s.key ? "bg-charcoal text-ivory" : "text-slate"
                      )}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Plus one">
                <button
                  type="button"
                  onClick={() => onMutate(guest.id, { plus_one: !guest.plus_one })}
                  className={cn(
                    "inline-flex items-center gap-2 border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors",
                    guest.plus_one
                      ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                      : "border-charcoal/15 text-slate"
                  )}
                >
                  {guest.plus_one ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {guest.plus_one ? "Bringing a guest" : "No plus one"}
                </button>
              </Field>

              <Field label="Meal preference" className="md:col-span-2">
                <div className="flex flex-wrap gap-1.5">
                  {MEAL_PRESETS.map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() =>
                        onMutate(guest.id, {
                          meal_pref: guest.meal_pref === meal ? null : meal,
                        })
                      }
                      className={cn(
                        "border px-2.5 py-1.5 font-accent text-[9px] uppercase tracking-[0.1em] transition-colors",
                        guest.meal_pref === meal
                          ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                          : "border-charcoal/12 text-slate hover:border-gold-primary/40"
                      )}
                    >
                      {meal}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Email">
                <input
                  defaultValue={guest.email ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (guest.email ?? "")) onMutate(guest.id, { email: v || null });
                  }}
                  placeholder="guest@email.com"
                  className="w-full border border-charcoal/15 bg-transparent px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
              </Field>
              <Field label="Phone">
                <input
                  defaultValue={guest.phone ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (guest.phone ?? "")) onMutate(guest.id, { phone: v || null });
                  }}
                  placeholder="+91…"
                  className="w-full border border-charcoal/15 bg-transparent px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
              </Field>

              <Field label="Notes" className="md:col-span-2">
                <input
                  defaultValue={guest.notes ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (guest.notes ?? "")) onMutate(guest.id, { notes: v || null });
                  }}
                  placeholder="Allergies, accessibility, family grouping…"
                  className="w-full border border-charcoal/15 bg-transparent px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                />
              </Field>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => onRemove(guest.id)}
                  className="inline-flex items-center gap-1.5 border border-rose/35 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.14em] text-rose transition-colors hover:bg-rose hover:text-ivory"
                >
                  <Trash2 className="h-3 w-3" /> Remove guest
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Seating planner (drag & drop) ──────────────────────────────────────────

function SeatingPlanner({
  guests,
  onMutate,
}: {
  guests: Guest[];
  onMutate: (id: string, patch: Partial<Guest>) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverTable, setHoverTable] = useState<number | "pool" | null>(null);

  const seated = guests.filter((g) => g.table_number != null);
  const unseated = guests.filter((g) => g.table_number == null);

  const maxTable = seated.reduce((max, g) => Math.max(max, g.table_number ?? 0), 0);
  const [tableCount, setTableCount] = useState(() => Math.max(6, maxTable));
  const effectiveTableCount = Math.max(tableCount, maxTable);
  const tables = Array.from({ length: effectiveTableCount }, (_, i) => i + 1);

  const assign = (id: string, table: number | null) => {
    onMutate(id, { table_number: table });
    setDragId(null);
    setHoverTable(null);
  };

  const guestsAt = (table: number) => seated.filter((g) => g.table_number === table);
  const seatsAt = (table: number) =>
    guestsAt(table).reduce((sum, g) => sum + heads(g), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHoverTable("pool");
        }}
        onDragLeave={() => setHoverTable((h) => (h === "pool" ? null : h))}
        onDrop={() => dragId && assign(dragId, null)}
        className={cn(
          "h-fit border bg-ivory p-4 transition-colors",
          hoverTable === "pool"
            ? "border-gold-primary bg-gold-primary/5"
            : "border-charcoal/10"
        )}
      >
        <div className="flex items-center justify-between">
          <p className={dashLabel}>Unseated</p>
          <span className="font-display text-lg text-charcoal">{unseated.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate">Drag a guest onto a table.</p>
        <div className="mt-3 space-y-2">
          {unseated.length === 0 ? (
            <p className="border border-dashed border-charcoal/12 px-3 py-6 text-center text-xs text-slate">
              Everyone has a seat
            </p>
          ) : (
            unseated.map((g) => (
              <SeatChip
                key={g.id}
                guest={g}
                onDragStart={() => setDragId(g.id)}
                onDragEnd={() => setDragId(null)}
              />
            ))
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border border-charcoal/10 bg-cream/40 p-3">
          <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            {seated.length} seated · {tables.length} tables · {SEATS_PER_TABLE} seats each
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTableCount((c) => Math.max(maxTable, c - 1))}
              disabled={effectiveTableCount <= Math.max(1, maxTable)}
              className="h-7 w-7 border border-charcoal/15 font-display text-charcoal transition-colors hover:border-gold-primary disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setTableCount((c) => c + 1)}
              className="h-7 w-7 border border-charcoal/15 font-display text-charcoal transition-colors hover:border-gold-primary"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => {
            const here = guestsAt(table);
            const seats = seatsAt(table);
            const full = seats >= SEATS_PER_TABLE;
            const isHover = hoverTable === table;
            return (
              <div
                key={table}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoverTable(table);
                }}
                onDragLeave={() => setHoverTable((h) => (h === table ? null : h))}
                onDrop={() => dragId && assign(dragId, table)}
                className={cn(
                  "flex min-h-[150px] flex-col border bg-ivory p-3 transition-colors",
                  isHover
                    ? "border-gold-primary bg-gold-primary/5"
                    : full
                      ? "border-sage/40"
                      : "border-charcoal/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-display text-base text-charcoal">
                    <Armchair className="h-4 w-4 text-gold-dark" /> Table {table}
                  </span>
                  <span
                    className={cn(
                      "font-accent text-[10px] uppercase tracking-[0.12em]",
                      full ? "text-sage" : "text-slate"
                    )}
                  >
                    {seats}/{SEATS_PER_TABLE}
                  </span>
                </div>
                <div className="mt-2 flex-1 space-y-1.5">
                  {here.length === 0 ? (
                    <p className="mt-4 text-center text-[11px] text-slate/60">
                      Drop guests here
                    </p>
                  ) : (
                    here.map((g) => (
                      <SeatChip
                        key={g.id}
                        guest={g}
                        compact
                        onDragStart={() => setDragId(g.id)}
                        onDragEnd={() => setDragId(null)}
                        onRemove={() => assign(g.id, null)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SeatChip({
  guest,
  compact,
  onDragStart,
  onDragEnd,
  onRemove,
}: {
  guest: Guest;
  compact?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemove?: () => void;
}) {
  const side = SIDE_MAP[guest.side];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex cursor-grab items-center gap-2 border bg-cream/40 px-2.5 py-2 transition-colors active:cursor-grabbing",
        compact ? "border-charcoal/10" : "border-charcoal/12 hover:border-gold-primary/40"
      )}
    >
      <span
        className="h-5 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: side.color }}
      />
      <span className="min-w-0 flex-1 truncate font-heading text-xs text-charcoal">
        {guest.name}
        {guest.plus_one ? <span className="text-gold-dark"> +1</span> : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Unseat"
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3 text-slate" />
        </button>
      ) : null}
    </div>
  );
}
