"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BudgetCanvas } from "@/components/dashboard/budget/budget-canvas";
import { BudgetItemPalette } from "@/components/dashboard/budget/budget-item-palette";
import { BudgetSummary } from "@/components/dashboard/budget/budget-summary";
import { useBudgetHydrated } from "@/hooks/use-budget-hydrated";
import { cn } from "@/lib/utils";
import { useBudgetStore, type BudgetCategory } from "@/stores/budget-store";

type MobileTab = "palette" | "canvas" | "summary";

type BudgetApiPayload = {
  budgetName: string;
  totalBudget: number;
  categories: BudgetCategory[];
};

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
  const rebalanceAllocations = useBudgetStore(
    (state) => state.rebalanceAllocations
  );
  const reset = useBudgetStore((state) => state.reset);

  const [mobileTab, setMobileTab] = useState<MobileTab>("canvas");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [budgetTitleDraft, setBudgetTitleDraft] = useState("");

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
          return;
        }

        if (json.budget) {
          const budget = json.budget as BudgetApiPayload;
          hydrateBudget(budget);
          setBudgetTitleDraft(budget.budgetName);
          setLastSavedSnapshot(snapshotBudget(budget));
        }
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
          Start with your wedding setup
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          Your budget plan connects to your client profile and wedding details, so
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
    <div className="space-y-6">
      <div className="border border-charcoal/8 bg-cream/40 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
              Budget strategy
            </p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="budget-name"
                  className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate"
                >
                  Plan name
                </label>
                <input
                  id="budget-name"
                  value={budgetTitleDraft}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setBudgetTitleDraft(nextValue);
                    setBudgetName(nextValue.trim() || "Wedding Investment Plan");
                  }}
                  className="mt-2 w-full border-b border-charcoal/12 bg-transparent py-2 font-display text-2xl text-charcoal outline-none transition-colors focus:border-gold-primary"
                />
              </div>
              <div className="shrink-0">
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
                    className="mt-2 w-full min-w-[220px] border-b border-gold-primary bg-transparent py-2 text-right font-display text-2xl text-charcoal outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingBudget(true)}
                    className="mt-2 text-right font-display text-2xl text-charcoal transition-colors hover:text-gold-dark"
                  >
                    ₹{(totalBudget / 100000).toFixed(1)}L
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
              This is now an investment planner, not just a calculator. Set target
              allocations, drag real line items into categories, and compare quotes
              with actual spend before the weekend gets away from you.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[460px]">
            <QuickStat
              label="Categories"
              value={`${categories.length}`}
              hint="Target buckets in plan"
            />
            <QuickStat
              label="Quoted"
              value={`₹${(totalQuoted / 100000).toFixed(1)}L`}
              hint="Current committed estimate"
            />
            <QuickStat
              label="Status"
              value={isDirty ? "Unsaved" : "Saved"}
              hint={isDirty ? "Draft has local edits" : "Synced with backend"}
              tone={isDirty ? "warning" : "healthy"}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <button
            type="button"
            onClick={() => {
              rebalanceAllocations();
              toast.success("Category targets rebalanced");
            }}
            className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Rebalance targets
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
            className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-error hover:text-error"
          >
            Reset planner
          </button>
          <button
            type="button"
            onClick={() => void saveBudget()}
            disabled={saving || !isDirty}
            className={cn(
              "font-accent inline-flex items-center justify-center border px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] transition-all duration-500",
              saving || !isDirty
                ? "border-charcoal/10 text-slate"
                : "border-gold-primary text-gold-primary hover:bg-gold-primary hover:text-midnight"
            )}
          >
            {saving ? "Saving..." : isDirty ? "Save draft" : "Saved"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border border-charcoal/8 p-1 lg:hidden">
        {(
          [
            { key: "palette", label: "Add Items" },
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

      <div className="hidden lg:grid lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:gap-6">
        <div className="border border-charcoal/8 bg-ivory p-4">
          <BudgetItemPalette />
        </div>
        <div>
          <BudgetCanvas />
        </div>
        <div className="border border-charcoal/8 bg-ivory p-4">
          <BudgetSummary />
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {mobileTab === "palette" ? (
          <div className="border border-charcoal/8 bg-ivory p-4">
            <BudgetItemPalette />
          </div>
        ) : null}
        {mobileTab === "canvas" ? <BudgetCanvas /> : null}
        {mobileTab === "summary" ? (
          <div className="border border-charcoal/8 bg-ivory p-4">
            <BudgetSummary />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "healthy";
}) {
  return (
    <div className="border border-charcoal/8 bg-ivory/80 p-4">
      <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-xl",
          tone === "warning" && "text-gold-dark",
          tone === "healthy" && "text-sage",
          tone === "neutral" && "text-charcoal"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate">{hint}</p>
    </div>
  );
}
