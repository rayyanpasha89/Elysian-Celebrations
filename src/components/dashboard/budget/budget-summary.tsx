"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useBudgetStore } from "@/stores/budget-store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BudgetSummary() {
  const totalBudget = useBudgetStore((s) => s.totalBudget);
  const categories = useBudgetStore((s) => s.categories);

  const totalSpent = useMemo(
    () =>
      categories.reduce(
        (total, cat) =>
          total +
          cat.items.reduce(
            (catTotal, item) => catTotal + item.estimatedCost * item.quantity,
            0
          ),
        0
      ),
    [categories]
  );

  const remaining = totalBudget - totalSpent;
  const usedPercent =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const isOverBudget = totalSpent > totalBudget;

  const categoryTotals = useMemo(
    () =>
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        estimated: cat.items.reduce(
          (total, item) => total + item.estimatedCost * item.quantity,
          0
        ),
        itemCount: cat.items.length,
      })),
    [categories]
  );

  return (
    <div className="space-y-6">
      {/* Total Budget */}
      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-1">
          Total Budget
        </p>
        <div className="font-display text-3xl font-bold text-charcoal">
          <AnimatedCounter
            target={totalBudget}
            formatter={(v) => formatCurrency(v)}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
            Used
          </p>
          <p
            className={cn(
              "font-accent text-[10px] uppercase tracking-[0.15em]",
              isOverBudget ? "text-red-600" : "text-gold-primary"
            )}
          >
            {usedPercent}%
          </p>
        </div>
        <div className="h-1.5 w-full bg-charcoal/8">
          <motion.div
            className={cn(
              "h-full",
              isOverBudget ? "bg-red-500" : "bg-gold-primary"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usedPercent, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Spent / Remaining */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-charcoal/8 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-1">
            Spent
          </p>
          <p className="font-display text-lg font-bold text-charcoal">
            <AnimatedCounter
              target={totalSpent}
              formatter={(v) => formatCurrency(v)}
            />
          </p>
        </div>
        <div className="border border-charcoal/8 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-1">
            Remaining
          </p>
          <p
            className={cn(
              "font-display text-lg font-bold",
              isOverBudget ? "text-red-600" : "text-charcoal"
            )}
          >
            <AnimatedCounter
              target={Math.abs(remaining)}
              prefix={isOverBudget ? "-" : ""}
              formatter={(v) => formatCurrency(v)}
            />
          </p>
        </div>
      </div>

      {/* Donut Chart */}
      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-4">
          Breakdown
        </p>
        <div className="flex items-center gap-6">
          <DonutChart data={categoryTotals} total={totalSpent || 1} />
          <div className="flex-1 space-y-2">
            {categoryTotals
              .filter((c) => c.estimated > 0)
              .map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2 w-2 flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate truncate">{cat.name}</span>
                  <span className="ml-auto font-accent text-[10px] text-charcoal tabular-nums">
                    {formatCurrency(cat.estimated)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoryTotal {
  id: string;
  name: string;
  color: string;
  estimated: number;
  itemCount: number;
}

function DonutChart({
  data,
  total,
}: {
  data: CategoryTotal[];
  total: number;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const segments = data.filter((d) => d.estimated > 0);

  return (
    <svg
      width="110"
      height="110"
      viewBox="0 0 110 110"
      className="flex-shrink-0"
    >
      {/* Background ring */}
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        stroke="#F5F0E8"
        strokeWidth="14"
      />
      {segments.map((segment, i) => {
        const percent = (segment.estimated / total) * 100;
        const strokeDasharray = (percent / 100) * circumference;
        const strokeDashoffset = -(cumulativePercent / 100) * circumference;
        cumulativePercent += percent;

        return (
          <motion.circle
            key={segment.id}
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="14"
            strokeDasharray={`${strokeDasharray} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 55 55)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          />
        );
      })}
    </svg>
  );
}
