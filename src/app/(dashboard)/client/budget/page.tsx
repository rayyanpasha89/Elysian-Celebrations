"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, ReceiptText, Sparkles } from "lucide-react";
import { BudgetCanvas } from "@/components/dashboard/budget/budget-canvas";
import {
  BudgetByEventView,
  type BudgetEventBucket,
} from "@/components/dashboard/budget/budget-by-event-view";
import { BudgetItemPalette } from "@/components/dashboard/budget/budget-item-palette";
import { BudgetSummary } from "@/components/dashboard/budget/budget-summary";
import { useBudgetHydrated } from "@/hooks/use-budget-hydrated";
import { cn, formatCurrency } from "@/lib/utils";
import { useBudgetStore, type BudgetCategory } from "@/stores/budget-store";

type MobileTab = "palette" | "canvas" | "summary";
type PlannerView = "category" | "event";

type BudgetApiPayload = {
  budgetName: string;
  totalBudget: number;
  categories: BudgetCategory[];
};

type EventPlanSpendEvent = {
  id: string;
  name: string;
  eventType: string | null;
  date: string | null;
  startTime: string | null;
  estimatedSpend: number;
};
type EventPlanSpendDay = {
  id: string;
  name: string;
  date: string | null;
  sortOrder: number;
  estimatedSpend: number;
  eventCount: number;
  events: EventPlanSpendEvent[];
};
type EventPlanSpendSummary = {
  weddingName: string;
  totalEstimated: number;
  eventCount: number;
  days: EventPlanSpendDay[];
};

type BookingStage = "selected" | "booked" | "confirmed";
type PlanLineItem = {
  bookingId: string;
  eventId: string;
  eventName: string;
  dayName: string | null;
  categoryName: string;
  vendorName: string;
  serviceName: string | null;
  name: string;
  estimatedCost: number;
  status: string;
  stage: BookingStage;
};

const STAGE_META: Record<
  BookingStage,
  { label: string; chip: string; dot: string }
> = {
  confirmed: { label: "Confirmed", chip: "border-sage/35 bg-sage/10 text-sage", dot: "bg-sage" },
  booked: { label: "Booked", chip: "border-gold-primary/40 bg-gold-primary/10 text-gold-dark", dot: "bg-gold-primary" },
  selected: { label: "Selected", chip: "border-charcoal/15 bg-charcoal/5 text-slate", dot: "bg-slate/50" },
};
const STAGE_ORDER: BookingStage[] = ["confirmed", "booked", "selected"];

function formatLakh(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  return `₹${(amount / 100000).toFixed(1)}L`;
}

function snapshotBudget(budget: BudgetApiPayload) {
  return JSON.stringify({
    budgetName: budget.budgetName,
    totalBudget: budget.totalBudget,
    categories: budget.categories.map((category) => ({
      id: category.id,
      name: category.name,
      allocated: category.allocated,
      sortOrder: category.sortOrder,
      color: category.color,
      items: category.items.map((item) => ({
        id: item.id,
        eventId: item.eventId ?? null,
        name: item.name,
        estimatedCost: item.estimatedCost,
        actualCost: item.actualCost,
        quantity: item.quantity,
        isPaid: item.isPaid,
        notes: item.notes,
        sortOrder: item.sortOrder,
      })),
    })),
  });
}

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

export default function CostEstimationPage() {
  const hydrated = useBudgetHydrated();

  const budgetName = useBudgetStore((state) => state.budgetName);
  const totalBudget = useBudgetStore((state) => state.totalBudget);
  const categories = useBudgetStore((state) => state.categories);
  const setBudgetName = useBudgetStore((state) => state.setBudgetName);
  const hydrateBudget = useBudgetStore((state) => state.hydrateBudget);
  const addItem = useBudgetStore((state) => state.addItem);
  const reset = useBudgetStore((state) => state.reset);

  const [mobileTab, setMobileTab] = useState<MobileTab>("canvas");
  const [plannerView, setPlannerView] = useState<PlannerView>("category");
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [eventPlanSpend, setEventPlanSpend] = useState<EventPlanSpendSummary | null>(
    null
  );
  const [planLineItems, setPlanLineItems] = useState<PlanLineItem[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/budget");
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Failed to load estimate");
        if (cancelled) return;
        if (json.needsOnboarding) {
          setNeedsOnboarding(true);
          setLastSavedSnapshot(null);
          return;
        }
        if (json.budget) {
          const budget = json.budget as BudgetApiPayload;
          hydrateBudget(budget);
          setTitleDraft(budget.budgetName);
          setLastSavedSnapshot(snapshotBudget(budget));
        }
        setEventPlanSpend((json.eventPlanSpend as EventPlanSpendSummary | null) ?? null);
        setPlanLineItems((json.planLineItems as PlanLineItem[] | null) ?? []);
      } catch (error) {
        if (!cancelled)
          toast.error(error instanceof Error ? error.message : "Failed to load estimate");
      } finally {
        if (!cancelled) setLoadingRemote(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateBudget, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setTitleDraft(budgetName);
  }, [budgetName, hydrated]);

  const currentSnapshot = useMemo(
    () => snapshotBudget({ budgetName, totalBudget, categories }),
    [budgetName, categories, totalBudget]
  );
  const isDirty = lastSavedSnapshot !== null && currentSnapshot !== lastSavedSnapshot;

  const totalEstimated = useMemo(
    () =>
      categories.reduce(
        (sum, c) =>
          sum + c.items.reduce((cs, i) => cs + i.estimatedCost * i.quantity, 0),
        0
      ),
    [categories]
  );

  const categoryTotals = useMemo(
    () =>
      categories
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          estimated: c.items.reduce((s, i) => s + i.estimatedCost * i.quantity, 0),
        }))
        .filter((c) => c.estimated > 0)
        .sort((a, b) => b.estimated - a.estimated),
    [categories]
  );

  const eventOptions = useMemo<BudgetEventBucket[]>(
    () =>
      eventPlanSpend?.days.flatMap((day) =>
        (day.events ?? []).map((event) => ({
          id: event.id,
          name: event.name,
          dayName: day.name,
          date: event.date ?? day.date,
          eventType: event.eventType,
          startTime: event.startTime,
          estimatedSpend: event.estimatedSpend,
        }))
      ) ?? [],
    [eventPlanSpend]
  );

  const taggedItemCount = useMemo(
    () => categories.reduce((s, c) => s + c.items.filter((i) => i.eventId).length, 0),
    [categories]
  );
  const totalItemCount = useMemo(
    () => categories.reduce((s, c) => s + c.items.length, 0),
    [categories]
  );

  // Bookings funnel from the event plan's vendor picks.
  const bookings = useMemo(() => {
    const byStage: Record<BookingStage, PlanLineItem[]> = {
      confirmed: [],
      booked: [],
      selected: [],
    };
    for (const item of planLineItems) byStage[item.stage].push(item);
    const totalValue = planLineItems.reduce((s, i) => s + i.estimatedCost, 0);
    return { byStage, totalValue, count: planLineItems.length };
  }, [planLineItems]);

  const pendingImports = useMemo(() => {
    const existing = new Set(
      categories.flatMap((c) =>
        c.items.map((i) => `${i.eventId ?? ""}|${i.name.trim().toLowerCase()}`)
      )
    );
    return planLineItems.filter(
      (line) => !existing.has(`${line.eventId}|${line.name.trim().toLowerCase()}`)
    );
  }, [categories, planLineItems]);

  const importFromPlan = () => {
    if (pendingImports.length === 0) {
      toast.message("Every vendor pick is already in your estimate");
      return;
    }
    const fallback =
      categories.find((c) => c.name.toLowerCase() === "miscellaneous") ??
      categories[categories.length - 1] ??
      null;
    let added = 0;
    for (const line of pendingImports) {
      const target =
        categories.find((c) => c.name.toLowerCase() === line.categoryName.toLowerCase()) ??
        fallback;
      if (!target) continue;
      addItem(target.id, {
        eventId: line.eventId,
        name: line.name,
        estimatedCost: line.estimatedCost,
        actualCost: null,
        quantity: 1,
        isPaid: false,
        notes: line.dayName ? `From event plan · ${line.dayName}` : "From event plan",
      });
      added += 1;
    }
    if (added > 0)
      toast.success(`Added ${added} vendor ${added === 1 ? "pick" : "picks"} to your estimate`);
  };

  const saveBudget = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetName, totalBudget, categories }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to save estimate");
      const saved = json.budget as BudgetApiPayload;
      hydrateBudget(saved);
      setLastSavedSnapshot(snapshotBudget(saved));
      setTitleDraft(saved.budgetName);
      if (json.eventPlanSpend !== undefined)
        setEventPlanSpend((json.eventPlanSpend as EventPlanSpendSummary | null) ?? null);
      if (json.planLineItems !== undefined)
        setPlanLineItems((json.planLineItems as PlanLineItem[] | null) ?? []);
      toast.success("Cost estimate saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save estimate");
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || loadingRemote) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading cost estimation...</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="border border-charcoal/8 bg-ivory p-8">
        <p className={dashLabel}>Cost estimation</p>
        <h1 className="mt-2 font-display text-3xl text-charcoal">
          Start with your event setup
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          Your cost estimate connects to your event details, so complete
          onboarding first and this planner will be ready the moment you return.
        </p>
        <div className="mt-6">
          <Link
            href="/client/onboarding"
            className="font-accent inline-flex items-center border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-all hover:bg-gold-primary hover:text-midnight"
          >
            Complete onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero — estimated total + category mix (no cap) */}
      <section className="relative overflow-hidden border border-charcoal/10 bg-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.12),transparent_55%)]"
        />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-dark">
                Cost estimation
              </p>
              <input
                aria-label="Estimate name"
                value={titleDraft}
                onChange={(event) => {
                  const next = event.target.value;
                  setTitleDraft(next);
                  setBudgetName(next.trim() || "Cost Estimate");
                }}
                className="mt-2 w-full max-w-xl border-b border-transparent bg-transparent pb-1 font-display text-3xl leading-tight text-charcoal outline-none transition-colors focus:border-gold-primary md:text-4xl"
              />
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
                A running estimate of what your celebration costs — built from
                vendor picks and line items, with no fixed cap. Add, tag, and
                refine as quotes firm up.
              </p>
            </div>
            <div className="shrink-0 lg:border-l lg:border-charcoal/10 lg:pl-8">
              <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                Estimated total
              </p>
              <p className="mt-1 font-display text-4xl text-charcoal lg:text-right">
                {formatLakh(totalEstimated)}
              </p>
              <p className="mt-1 text-[11px] text-slate lg:text-right">
                {formatCurrency(totalEstimated)}
              </p>
            </div>
          </div>

          {/* category mix */}
          <div className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className={dashLabel}>Where it goes</p>
              <p className="font-heading text-xs text-slate">
                {totalItemCount} {totalItemCount === 1 ? "line item" : "line items"} ·{" "}
                {categoryTotals.length} categories
              </p>
            </div>
            <div className="mt-2 flex h-3.5 w-full overflow-hidden rounded-full bg-charcoal/8">
              {categoryTotals.map((segment) => (
                <div
                  key={segment.id}
                  title={`${segment.name} · ${formatCurrency(segment.estimated)}`}
                  style={{
                    width: `${(segment.estimated / Math.max(totalEstimated, 1)) * 100}%`,
                    backgroundColor: segment.color,
                  }}
                  className="h-full border-r border-ivory/60 first:rounded-l-full last:rounded-r-full last:border-r-0"
                />
              ))}
            </div>
            {categoryTotals.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {categoryTotals.slice(0, 6).map((segment) => (
                  <span
                    key={segment.id}
                    className="inline-flex items-center gap-1.5 font-accent text-[10px] uppercase tracking-[0.12em] text-slate"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                    {segment.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate">
                No costs yet — import your vendor picks below or drag line items
                from the palette to start estimating.
              </p>
            )}
          </div>

          {/* figures */}
          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden border border-charcoal/10 bg-charcoal/10 sm:grid-cols-4">
            <Figure label="Estimated total" value={formatLakh(totalEstimated)} hint={formatCurrency(totalEstimated)} />
            <Figure
              label="Vendor bookings"
              value={`${bookings.count}`}
              hint={bookings.count ? formatLakh(bookings.totalValue) : "None yet"}
            />
            <Figure
              label="Tagged to events"
              value={`${taggedItemCount}/${totalItemCount}`}
              tone={totalItemCount > 0 && taggedItemCount < totalItemCount ? "warning" : "healthy"}
              hint={
                totalItemCount === 0
                  ? "Add line items to tag"
                  : taggedItemCount === totalItemCount
                    ? "Every line is in an event"
                    : "Switch to By event to tag"
              }
            />
            <Figure
              label="Sync status"
              value={isDirty ? "Unsaved" : "Saved"}
              tone={isDirty ? "warning" : "healthy"}
              hint={isDirty ? "Draft has local edits" : "Synced with your plan"}
            />
          </div>
        </div>
      </section>

      {/* Bookings funnel */}
      {bookings.count > 0 || (eventPlanSpend && eventPlanSpend.eventCount > 0) ? (
        <BookingsPanel
          byStage={bookings.byStage}
          totalValue={bookings.totalValue}
          count={bookings.count}
          pendingCount={pendingImports.length}
          pendingValue={pendingImports.reduce((s, l) => s + l.estimatedCost, 0)}
          onImport={importFromPlan}
        />
      ) : null}

      {/* Planner toolbar */}
      <div className="flex flex-col gap-3 border border-charcoal/10 bg-cream/40 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 border border-charcoal/10 bg-ivory p-1">
            {(
              [
                { key: "category", label: "By category" },
                { key: "event", label: "By event" },
              ] as const
            ).map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setPlannerView(view.key)}
                className={cn(
                  "font-accent inline-flex items-center justify-center px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors",
                  plannerView === view.key ? "bg-charcoal text-ivory" : "text-slate hover:text-charcoal"
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
          <p className="hidden font-accent text-[10px] uppercase tracking-[0.14em] text-slate sm:block">
            {plannerView === "event" ? "Grouped by celebration day" : "Grouped by spend category"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset the cost estimate to the default structure?")) {
                reset();
                toast.success("Estimate reset locally");
              }
            }}
            className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-slate/80 transition-colors hover:border-error hover:text-error"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => void saveBudget()}
            disabled={saving || !isDirty}
            className={cn(
              "font-accent inline-flex items-center justify-center border px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] transition-all duration-500",
              saving || !isDirty
                ? "border-charcoal/10 text-slate"
                : "border-gold-primary bg-gold-primary text-midnight shadow-[0_14px_36px_rgba(201,169,110,0.18)] hover:bg-gold-dark hover:border-gold-dark"
            )}
          >
            {saving ? "Saving..." : isDirty ? "Save changes" : "All saved"}
          </button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-1 border border-charcoal/10 p-1 lg:hidden">
        {(
          [
            { key: "palette", label: "Add items" },
            { key: "canvas", label: "Estimate" },
            { key: "summary", label: "Insights" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              "flex-1 py-2 font-accent text-[10px] uppercase tracking-[0.15em] transition-colors",
              mobileTab === tab.key ? "bg-charcoal text-ivory" : "text-slate hover:text-charcoal"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Planner body (desktop) */}
      <div
        className={cn(
          "hidden lg:grid lg:gap-5",
          plannerView === "category"
            ? "lg:grid-cols-[320px_minmax(0,1fr)_340px]"
            : "lg:grid-cols-[minmax(0,1fr)_340px]"
        )}
      >
        {plannerView === "category" ? (
          <div className="border border-charcoal/10 bg-ivory p-4">
            <BudgetItemPalette />
          </div>
        ) : null}
        <div>
          {plannerView === "category" ? (
            <BudgetCanvas eventOptions={eventOptions} />
          ) : (
            <BudgetByEventView events={eventOptions} weddingName={eventPlanSpend?.weddingName ?? null} />
          )}
        </div>
        <div className="border border-charcoal/10 bg-ivory p-4">
          <BudgetSummary />
        </div>
      </div>

      {/* Planner body (mobile) */}
      <div className="space-y-4 lg:hidden">
        {mobileTab === "palette" ? (
          plannerView === "category" ? (
            <div className="border border-charcoal/10 bg-ivory p-4">
              <BudgetItemPalette />
            </div>
          ) : (
            <div className="border border-dashed border-charcoal/15 bg-ivory p-4 text-sm text-slate">
              Switch to <span className="text-charcoal">By category</span> to drag new line items in.
            </div>
          )
        ) : null}
        {mobileTab === "canvas" ? (
          plannerView === "category" ? (
            <BudgetCanvas eventOptions={eventOptions} />
          ) : (
            <BudgetByEventView events={eventOptions} weddingName={eventPlanSpend?.weddingName ?? null} />
          )
        ) : null}
        {mobileTab === "summary" ? (
          <div className="border border-charcoal/10 bg-ivory p-4">
            <BudgetSummary />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BookingsPanel({
  byStage,
  totalValue,
  count,
  pendingCount,
  pendingValue,
  onImport,
}: {
  byStage: Record<BookingStage, PlanLineItem[]>;
  totalValue: number;
  count: number;
  pendingCount: number;
  pendingValue: number;
  onImport: () => void;
}) {
  return (
    <section className="border border-charcoal/10 bg-ivory">
      <div className="flex flex-col gap-4 border-b border-charcoal/8 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-primary/12 text-gold-dark sm:flex">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
              Vendor bookings
            </p>
            <p className="mt-1 font-display text-lg text-charcoal">
              {count > 0
                ? `${count} ${count === 1 ? "pick" : "picks"} · ${formatCurrency(totalValue)}`
                : "No vendor picks yet"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate">
              Vendors you select on functions land here as selected → booked →
              confirmed. Their prices feed your estimate.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={onImport}
              className="font-accent inline-flex items-center gap-2 border border-gold-primary bg-gold-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-midnight shadow-[0_14px_36px_rgba(201,169,110,0.18)] transition-all hover:bg-gold-dark hover:border-gold-dark"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Add {pendingCount} to estimate
              <span className="text-midnight/70">{formatLakh(pendingValue)}</span>
            </button>
          ) : count > 0 ? (
            <span className="font-accent inline-flex items-center gap-1.5 border border-sage/40 bg-sage/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-sage">
              <CheckCircle2 className="h-3.5 w-3.5" /> All picks in estimate
            </span>
          ) : null}
          <Link
            href="/client/wedding"
            className="font-accent inline-flex items-center gap-1.5 border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Pick vendors
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {count > 0 ? (
        <div className="grid gap-px bg-charcoal/8 md:grid-cols-3">
          {STAGE_ORDER.map((stage) => {
            const items = byStage[stage];
            const value = items.reduce((s, i) => s + i.estimatedCost, 0);
            const meta = STAGE_META[stage];
            return (
              <div key={stage} className="bg-ivory p-4">
                <div className="flex items-center justify-between">
                  <span className={cn("inline-flex items-center gap-1.5 border px-2 py-1 font-accent text-[9px] uppercase tracking-[0.14em]", meta.chip)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  <span className="font-display text-sm text-charcoal">
                    {items.length}
                  </span>
                </div>
                <p className="mt-2 font-display text-lg text-charcoal">
                  {value > 0 ? formatCurrency(value) : "—"}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {items.slice(0, 5).map((item) => (
                    <li key={item.bookingId} className="min-w-0">
                      <p className="truncate font-heading text-xs text-charcoal">
                        {item.vendorName}
                      </p>
                      <p className="truncate text-[11px] text-slate">
                        {item.serviceName ?? item.categoryName} ·{" "}
                        {formatCurrency(item.estimatedCost)}
                      </p>
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="text-[11px] text-slate/60">Nothing here yet</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning" | "healthy";
}) {
  return (
    <div className="bg-ivory p-4">
      <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-2xl",
          tone === "warning" && "text-gold-dark",
          tone === "healthy" && "text-sage",
          tone === "neutral" && "text-charcoal"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate">{hint}</p> : null}
    </div>
  );
}
