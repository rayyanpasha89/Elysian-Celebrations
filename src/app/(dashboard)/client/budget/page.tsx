"use client";

import { useState, useEffect } from "react";
import { useBudgetStore } from "@/stores/budget-store";
import { BudgetCanvas } from "@/components/dashboard/budget/budget-canvas";
import { BudgetItemPalette } from "@/components/dashboard/budget/budget-item-palette";
import { BudgetSummary } from "@/components/dashboard/budget/budget-summary";
import { cn } from "@/lib/utils";

type MobileTab = "palette" | "canvas" | "summary";

export default function BudgetPage() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useBudgetStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const totalBudget = useBudgetStore((s) => s.totalBudget);
  const setTotalBudget = useBudgetStore((s) => s.setTotalBudget);
  const reset = useBudgetStore((s) => s.reset);
  const [mobileTab, setMobileTab] = useState<MobileTab>("canvas");
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Loading budget...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">
            Budget Calculator
          </h1>
          <p className="mt-1 text-sm text-slate">
            Drag items from the palette, organize by category, track every rupee.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Total Budget Input */}
          <div className="flex items-center gap-2">
            <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
              Total Budget
            </span>
            {isEditingBudget ? (
              <input
                type="number"
                defaultValue={totalBudget}
                onBlur={(e) => {
                  setTotalBudget(Number(e.target.value) || 0);
                  setIsEditingBudget(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setTotalBudget(
                      Number((e.target as HTMLInputElement).value) || 0
                    );
                    setIsEditingBudget(false);
                  }
                }}
                autoFocus
                className="w-32 border-b border-gold-primary bg-transparent px-1 py-0.5 text-right font-display text-sm font-bold text-charcoal focus:outline-none tabular-nums"
              />
            ) : (
              <button
                onClick={() => setIsEditingBudget(true)}
                className="font-display text-sm font-bold text-charcoal tabular-nums transition-colors hover:text-gold-primary"
              >
                ₹{(totalBudget / 100000).toFixed(1)}L
              </button>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              if (window.confirm("Reset all budget items? This cannot be undone.")) {
                reset();
              }
            }}
            className="border border-charcoal/10 px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.15em] text-slate transition-colors hover:border-red-300 hover:text-red-500"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex gap-1 border border-charcoal/8 p-1 lg:hidden">
        {(
          [
            { key: "palette", label: "Add Items" },
            { key: "canvas", label: "Categories" },
            { key: "summary", label: "Summary" },
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

      {/* Three-Panel Layout */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_300px] lg:gap-6">
        {/* Left — Palette */}
        <div className="border border-charcoal/8 bg-ivory p-4">
          <BudgetItemPalette />
        </div>

        {/* Center — Canvas */}
        <div>
          <BudgetCanvas />
        </div>

        {/* Right — Summary */}
        <div className="border border-charcoal/8 bg-ivory p-4">
          <BudgetSummary />
        </div>
      </div>

      {/* Mobile Single-Panel */}
      <div className="lg:hidden">
        {mobileTab === "palette" && (
          <div className="border border-charcoal/8 bg-ivory p-4">
            <BudgetItemPalette />
          </div>
        )}
        {mobileTab === "canvas" && <BudgetCanvas />}
        {mobileTab === "summary" && (
          <div className="border border-charcoal/8 bg-ivory p-4">
            <BudgetSummary />
          </div>
        )}
      </div>
    </div>
  );
}
