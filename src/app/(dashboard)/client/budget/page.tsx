"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Sparkles } from "lucide-react";
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

type EventPlanSpendDay = {
  id: string;
  name: string;
  date: string | null;
  sortOrder: number;
  estimatedSpend: number;
  eventCount: number;
  events: EventPlanSpendEvent[];
};

type EventPlanSpendEvent = {
  id: string;
  name: string;
  eventType: string | null;
  date: string | null;
  startTime: string | null;
  estimatedSpend: number;
};

type EventPlanSpendSummary = {
  weddingName: string;
  totalEstimated: number;
  eventCount: number;
  days: EventPlanSpendDay[];
};

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
};

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

export default function BudgetPage() {
  const hydrated = useBudgetHydrated();

  const budgetName = useBudgetStore((state) => state.budgetName);
  const totalBudget = useBudgetStore((state) => state.totalBudget);
  const categories = useBudgetStore((state) => state.categories);
  const setBudgetName = useBudgetStore((state) => state.setBudgetName);
  const setTotalBudget = useBudgetStore((state) => state.setTotalBudget);
  const hydrateBudget = useBudgetStore((state) => state.hydrateBudget);
  const addItem = useBudgetStore((state) => state.addItem);
  const rebalanceAllocations = useBudgetStore(
    (state) => state.rebalanceAllocations
  );
  const reset = useBudgetStore((state) => state.reset);

  const [mobileTab, setMobileTab] = useState<MobileTab>("canvas");
  const [plannerView, setPlannerView] = useState<PlannerView>("category");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [budgetTitleDraft, setBudgetTitleDraft] = useState("");
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
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load budget");
        }

        if (cancelled) return;

        if (json.needsOnboarding) {
          setNeedsOnboarding(true);
          setLastSavedSnapshot(null);
          setEventPlanSpend(null);
          setPlanLineItems([]);
          return;
        }

        if (json.budget) {
          const budget = json.budget as BudgetApiPayload;
          hydrateBudget(budget);
          setBudgetTitleDraft(budget.budgetName);
          setLastSavedSnapshot(snapshotBudget(budget));
        }

        setEventPlanSpend(
          (json.eventPlanSpend as EventPlanSpendSummary | null | undefined) ?? null
        );
        setPlanLineItems(
          (json.planLineItems as PlanLineItem[] | null | undefined) ?? []
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load budget"
          );
        }
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
    setBudgetTitleDraft(budgetName);
  }, [budgetName, hydrated]);

  const currentSnapshot = useMemo(
    () =>
      snapshotBudget({
        budgetName,
        totalBudget,
        categories,
      }),
    [budgetName, categories, totalBudget]
  );

  const isDirty =
    lastSavedSnapshot !== null && currentSnapshot !== lastSavedSnapshot;

  const totalQuoted = useMemo(
    () =>
      categories.reduce(
        (sum, category) =>
          sum +
          category.items.reduce(
            (categorySum, item) => categorySum + item.estimatedCost * item.quantity,
            0
          ),
        0
      ),
    [categories]
  );

  const categoryTotals = useMemo(
    () =>
      categories
        .map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
          estimated: category.items.reduce(
            (sum, item) => sum + item.estimatedCost * item.quantity,
            0
          ),
        }))
        .filter((category) => category.estimated > 0)
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
    () =>
      categories.reduce(
        (sum, category) =>
          sum + category.items.filter((item) => item.eventId).length,
        0
      ),
    [categories]
  );
  const totalItemCount = useMemo(
    () =>
      categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories]
  );

  // Two-way sync: which vendor picks from the event plan aren't yet line items.
  const pendingImports = useMemo(() => {
    const existing = new Set(
      categories.flatMap((category) =>
        category.items.map(
          (item) => `${item.eventId ?? ""}|${item.name.trim().toLowerCase()}`
        )
      )
    );
    return planLineItems.filter(
      (line) =>
        !existing.has(`${line.eventId}|${line.name.trim().toLowerCase()}`)
    );
  }, [categories, planLineItems]);

  const remaining = totalBudget - totalQuoted;
  const overCap = remaining < 0;
  const usedPercent =
    totalBudget > 0 ? Math.min(999, Math.round((totalQuoted / totalBudget) * 100)) : 0;
  const barDenominator = Math.max(totalBudget, totalQuoted, 1);

  const importFromPlan = () => {
    if (pendingImports.length === 0) {
      toast.message("Every vendor pick is already in your budget");
      return;
    }

    const fallbackCategory =
      categories.find((category) => category.name.toLowerCase() === "miscellaneous") ??
      categories[categories.length - 1] ??
      null;

    let added = 0;
    for (const line of pendingImports) {
      const target =
        categories.find(
          (category) =>
            category.name.toLowerCase() === line.categoryName.toLowerCase()
        ) ?? fallbackCategory;
      if (!target) continue;

      addItem(target.id, {
        eventId: line.eventId,
        name: line.name,
        estimatedCost: line.estimatedCost,
        actualCost: null,
        quantity: 1,
        isPaid: false,
        notes: line.dayName
          ? `From event plan · ${line.dayName}`
          : "From event plan",
      });
      added += 1;
    }

    if (added > 0) {
      toast.success(
        `Imported ${added} vendor ${added === 1 ? "pick" : "picks"} — save to sync back to your plan`
      );
    }
  };

  const saveBudget = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetName,
          totalBudget,
          categories,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save budget");
      }

      const savedBudget = json.budget as BudgetApiPayload;
      hydrateBudget(savedBudget);
      setLastSavedSnapshot(snapshotBudget(savedBudget));
      setBudgetTitleDraft(savedBudget.budgetName);
      if (json.eventPlanSpend !== undefined) {
        setEventPlanSpend(
          (json.eventPlanSpend as EventPlanSpendSummary | null) ?? null
        );
      }
      if (json.planLineItems !== undefined) {
        setPlanLineItems((json.planLineItems as PlanLineItem[] | null) ?? []);
      }
      toast.success("Budget plan saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || loadingRemote) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Loading investment plan...
        </p>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="border border-charcoal/8 bg-ivory p-8">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Budget setup
        </p>
        <h1 className="mt-2 font-display text-3xl text-charcoal">
          Start with your event setup
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          Your budget plan connects to your client profile and event details, so
          complete onboarding first and this planner will be ready with a default
          structure the moment you come back.
        </p>
        <div className="mt-6">
          <Link
            href="/client/onboarding"
            className="font-accent inline-flex items-center border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-all duration-500 hover:bg-gold-primary hover:text-midnight"
          >
            Complete onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Hero: identity + cap + allocation bar + figures ─────────────── */}
      <section className="relative overflow-hidden border border-charcoal/10 bg-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.12),transparent_55%)]"
        />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-dark">
                Investment plan
              </p>
              <input
                id="budget-name"
                aria-label="Plan name"
                value={budgetTitleDraft}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setBudgetTitleDraft(nextValue);
                  setBudgetName(nextValue.trim() || "Event Investment Plan");
                }}
                className="mt-2 w-full max-w-xl border-b border-transparent bg-transparent pb-1 font-display text-3xl leading-tight text-charcoal outline-none transition-colors focus:border-gold-primary md:text-4xl"
              />
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
                One source of truth for every quote. Allocate targets, tag line
                items to events, and keep it in sync with your celebration plan.
              </p>
            </div>

            <div className="shrink-0 border-l-0 lg:border-l lg:border-charcoal/10 lg:pl-8">
              <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                Budget cap
              </p>
              {isEditingBudget ? (
                <input
                  type="number"
                  defaultValue={totalBudget}
                  onBlur={(event) => {
                    setTotalBudget(Math.max(0, Number(event.target.value) || 0));
                    setIsEditingBudget(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setTotalBudget(
                        Math.max(
                          0,
                          Number((event.target as HTMLInputElement).value) || 0
                        )
                      );
                      setIsEditingBudget(false);
                    }
                  }}
                  autoFocus
                  className="mt-1 w-full min-w-[200px] border-b border-gold-primary bg-transparent py-1 font-display text-4xl text-charcoal outline-none lg:text-right"
                />
              ) : (
                <button
                  onClick={() => setIsEditingBudget(true)}
                  className="mt-1 block font-display text-4xl text-charcoal transition-colors hover:text-gold-dark lg:text-right"
                >
                  {formatLakh(totalBudget)}
                </button>
              )}
              <p className="mt-1 text-[11px] text-slate lg:text-right">
                Tap to adjust your ceiling
              </p>
            </div>
          </div>

          {/* allocation bar */}
          <div className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
                Allocation
              </p>
              <p className="font-heading text-xs text-slate">
                <span
                  className={cn(
                    "font-display text-base",
                    overCap ? "text-rose" : "text-charcoal"
                  )}
                >
                  {formatCurrency(totalQuoted)}
                </span>{" "}
                of {formatCurrency(totalBudget)} · {usedPercent}%
              </p>
            </div>
            <div className="mt-2 flex h-3.5 w-full overflow-hidden rounded-full bg-charcoal/8">
              {categoryTotals.map((segment) => (
                <div
                  key={segment.id}
                  title={`${segment.name} · ${formatCurrency(segment.estimated)}`}
                  style={{
                    width: `${(segment.estimated / barDenominator) * 100}%`,
                    backgroundColor: segment.color,
                  }}
                  className="h-full border-r border-ivory/60 transition-all duration-500 first:rounded-l-full last:border-r-0"
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
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    {segment.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate">
                No line items yet — import your vendor picks or drag from the palette
                to start filling the bar.
              </p>
            )}
          </div>

          {/* figures */}
          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden border border-charcoal/10 bg-charcoal/10 sm:grid-cols-4">
            <Figure
              label="Quoted"
              value={formatLakh(totalQuoted)}
              hint={`${totalItemCount} ${totalItemCount === 1 ? "line item" : "line items"}`}
            />
            <Figure
              label={overCap ? "Over cap" : "Headroom"}
              value={formatLakh(Math.abs(remaining))}
              tone={overCap ? "warning" : "healthy"}
              hint={overCap ? "Trim to fit your ceiling" : "Still available to commit"}
            />
            <Figure
              label="Tagged to events"
              value={`${taggedItemCount}/${totalItemCount}`}
              tone={
                totalItemCount > 0 && taggedItemCount < totalItemCount
                  ? "warning"
                  : "healthy"
              }
              hint={
                totalItemCount === 0
                  ? "Add line items to tag"
                  : taggedItemCount === totalItemCount
                    ? "Every line is in an event"
                    : "Switch to By event to tag rest"
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

      {/* ─── Event-plan sync band (with import) ──────────────────────────── */}
      {eventPlanSpend && eventPlanSpend.eventCount > 0 ? (
        <EventSyncBand
          summary={eventPlanSpend}
          budgetCap={totalBudget}
          categories={categories}
          pendingCount={pendingImports.length}
          pendingValue={pendingImports.reduce(
            (sum, line) => sum + line.estimatedCost,
            0
          )}
          onImport={importFromPlan}
        />
      ) : null}

      {/* ─── Planner toolbar ─────────────────────────────────────────────── */}
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
                  plannerView === view.key
                    ? "bg-charcoal text-ivory"
                    : "text-slate hover:text-charcoal"
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
          <p className="hidden font-accent text-[10px] uppercase tracking-[0.14em] text-slate sm:block">
            {plannerView === "event"
              ? "Grouped by celebration day"
              : "Grouped by spend category"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              rebalanceAllocations();
              toast.success("Category targets rebalanced");
            }}
            className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Rebalance
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset the budget planner back to the default structure?"
                )
              ) {
                reset();
                toast.success("Budget plan reset locally");
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

      {/* ─── Mobile section tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 border border-charcoal/10 p-1 lg:hidden">
        {(
          [
            { key: "palette", label: "Add items" },
            { key: "canvas", label: "Planner" },
            { key: "summary", label: "Insights" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              "flex-1 py-2 font-accent text-[10px] uppercase tracking-[0.15em] transition-colors",
              mobileTab === tab.key
                ? "bg-charcoal text-ivory"
                : "text-slate hover:text-charcoal"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Planner body (desktop) ──────────────────────────────────────── */}
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
            <BudgetByEventView
              events={eventOptions}
              weddingName={eventPlanSpend?.weddingName ?? null}
            />
          )}
        </div>
        <div className="border border-charcoal/10 bg-ivory p-4">
          <BudgetSummary />
        </div>
      </div>

      {/* ─── Planner body (mobile) ───────────────────────────────────────── */}
      <div className="space-y-4 lg:hidden">
        {mobileTab === "palette" ? (
          plannerView === "category" ? (
            <div className="border border-charcoal/10 bg-ivory p-4">
              <BudgetItemPalette />
            </div>
          ) : (
            <div className="border border-dashed border-charcoal/15 bg-ivory p-4 text-sm text-slate">
              Switch to <span className="text-charcoal">By category</span> view to
              drag new line items in from the palette.
            </div>
          )
        ) : null}
        {mobileTab === "canvas" ? (
          plannerView === "category" ? (
            <BudgetCanvas eventOptions={eventOptions} />
          ) : (
            <BudgetByEventView
              events={eventOptions}
              weddingName={eventPlanSpend?.weddingName ?? null}
            />
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

function EventSyncBand({
  summary,
  budgetCap,
  categories,
  pendingCount,
  pendingValue,
  onImport,
}: {
  summary: EventPlanSpendSummary;
  budgetCap: number;
  categories: BudgetCategory[];
  pendingCount: number;
  pendingValue: number;
  onImport: () => void;
}) {
  const [showDays, setShowDays] = useState(false);
  const overCap = budgetCap > 0 && summary.totalEstimated > budgetCap;
  const gap = budgetCap > 0 ? budgetCap - summary.totalEstimated : null;
  const daysWithActivity = summary.days.filter(
    (day) => day.eventCount > 0 || day.estimatedSpend > 0
  );
  const assignedByEvent = useMemo(() => {
    const totals = new Map<string, number>();
    for (const category of categories) {
      for (const item of category.items) {
        if (!item.eventId) continue;
        totals.set(
          item.eventId,
          (totals.get(item.eventId) ?? 0) + item.estimatedCost * item.quantity
        );
      }
    }
    return totals;
  }, [categories]);

  return (
    <section className="border border-charcoal/10 bg-ivory">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-primary/12 text-gold-dark sm:flex">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
              Event plan sync
            </p>
            <p className="mt-1 font-display text-lg text-charcoal">
              {summary.weddingName}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate">
              <span className="text-charcoal">
                {formatCurrency(summary.totalEstimated)}
              </span>{" "}
              estimated across {summary.eventCount}{" "}
              {summary.eventCount === 1 ? "event" : "events"}
              {budgetCap > 0 ? (
                <>
                  {" · "}
                  <span className={overCap ? "text-rose" : "text-sage"}>
                    {overCap
                      ? `${formatCurrency(summary.totalEstimated - budgetCap)} over cap`
                      : gap !== null
                        ? `${formatCurrency(gap)} headroom`
                        : ""}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={onImport}
              className="font-accent inline-flex items-center gap-2 border border-gold-primary bg-gold-primary px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-midnight shadow-[0_14px_36px_rgba(201,169,110,0.18)] transition-all duration-500 hover:bg-gold-dark hover:border-gold-dark"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Import {pendingCount} vendor {pendingCount === 1 ? "pick" : "picks"}
              <span className="text-midnight/70">
                {formatLakh(pendingValue)}
              </span>
            </button>
          ) : (
            <span className="font-accent inline-flex items-center gap-1.5 border border-sage/40 bg-sage/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-sage">
              Vendor picks synced
            </span>
          )}
          <Link
            href="/client/wedding"
            className="font-accent inline-flex items-center gap-1.5 border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Edit plan
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {daysWithActivity.length > 0 ? (
        <div className="border-t border-charcoal/8">
          <button
            type="button"
            onClick={() => setShowDays((current) => !current)}
            className="flex w-full items-center justify-between px-5 py-3 font-accent text-[10px] uppercase tracking-[0.18em] text-slate transition-colors hover:text-charcoal"
          >
            <span>Per-day breakdown · {daysWithActivity.length}</span>
            <span aria-hidden>{showDays ? "—" : "+"}</span>
          </button>
          {showDays ? (
            <ul className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
              {daysWithActivity.map((day) => (
                <li
                  key={day.id}
                  className="border border-charcoal/8 bg-cream/30 px-4 py-3"
                >
                  <p className="font-display text-sm text-charcoal">{day.name}</p>
                  <p className="mt-1.5 font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                    {formatCurrency(day.estimatedSpend)} · {day.eventCount}{" "}
                    {day.eventCount === 1 ? "event" : "events"}
                  </p>
                  {(day.events ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-charcoal/8 pt-3">
                      {(day.events ?? []).map((event) => {
                        const assigned = assignedByEvent.get(event.id) ?? 0;
                        return (
                          <div
                            key={event.id}
                            className="flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-charcoal">{event.name}</p>
                              <p className="mt-0.5 text-slate">
                                Plan {formatCurrency(event.estimatedSpend)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 font-accent text-[9px] uppercase tracking-[0.14em]",
                                assigned > 0 ? "text-sage" : "text-slate"
                              )}
                            >
                              {assigned > 0 ? formatCurrency(assigned) : "No lines"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
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
      <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
        {label}
      </p>
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
