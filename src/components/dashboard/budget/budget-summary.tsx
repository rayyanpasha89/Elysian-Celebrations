"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useBudgetStore } from "@/stores/budget-store";
import { cn, formatCurrency } from "@/lib/utils";

type CategoryInsight = {
  id: string;
  name: string;
  color: string;
  allocated: number;
  quoted: number;
  actual: number;
  paid: number;
};

export function BudgetSummary() {
  const budgetName = useBudgetStore((state) => state.budgetName);
  const totalBudget = useBudgetStore((state) => state.totalBudget);
  const categories = useBudgetStore((state) => state.categories);

  const metrics = useMemo(() => {
    const categoryInsights: CategoryInsight[] = categories.map((category) => {
      const quoted = category.items.reduce(
        (sum, item) => sum + item.estimatedCost * item.quantity,
        0
      );
      const actual = category.items.reduce(
        (sum, item) => sum + (item.actualCost ?? 0) * item.quantity,
        0
      );
      const paid = category.items.reduce((sum, item) => {
        if (!item.isPaid) return sum;
        return sum + (item.actualCost ?? item.estimatedCost) * item.quantity;
      }, 0);

      return {
        id: category.id,
        name: category.name,
        color: category.color,
        allocated: category.allocated,
        quoted,
        actual,
        paid,
      };
    });

    const totalAllocated = categoryInsights.reduce(
      (sum, category) => sum + category.allocated,
      0
    );
    const totalQuoted = categoryInsights.reduce(
      (sum, category) => sum + category.quoted,
      0
    );
    const totalActual = categoryInsights.reduce(
      (sum, category) => sum + category.actual,
      0
    );
    const totalPaid = categoryInsights.reduce(
      (sum, category) => sum + category.paid,
      0
    );
    const activeSpend = Math.max(totalQuoted, totalActual);
    const runway = totalBudget - activeSpend;
    const usedPercent =
      totalBudget > 0 ? Math.min(100, Math.round((activeSpend / totalBudget) * 100)) : 0;

    const attention = categoryInsights
      .map((category) => {
        if (category.quoted > category.allocated) {
          return {
            ...category,
            message: `${formatCurrency(
              category.quoted - category.allocated
            )} over target`,
            severity: 2,
          };
        }

        if (category.actual > category.quoted) {
          return {
            ...category,
            message: `${formatCurrency(
              category.actual - category.quoted
            )} above quoted spend`,
            severity: 1,
          };
        }

        if (category.quoted === 0 && category.allocated > 0) {
          return {
            ...category,
            message: "No quote captured yet",
            severity: 0,
          };
        }

        return null;
      })
      .filter((value): value is CategoryInsight & { message: string; severity: number } =>
        Boolean(value)
      )
      .sort((left, right) => right.severity - left.severity)
      .slice(0, 4);

    return {
      categoryInsights,
      totalAllocated,
      totalQuoted,
      totalActual,
      totalPaid,
      activeSpend,
      runway,
      usedPercent,
      attention,
    };
  }, [categories, totalBudget]);

  const postureLabel =
    metrics.activeSpend > totalBudget
      ? "Overextended"
      : metrics.activeSpend > totalBudget * 0.85
        ? "Watch carefully"
        : "Healthy runway";

  return (
    <div className="space-y-6">
      <div className="border border-charcoal/8 bg-cream/40 p-4">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Budget posture
        </p>
        <h3 className="mt-2 font-display text-2xl text-charcoal">
          {budgetName}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate">
          Your target plan, live quotes, and final spend are all visible in one
          place so decisions stay grounded.
        </p>
      </div>

      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Total investment
        </p>
        <div className="mt-2 font-display text-4xl font-semibold text-charcoal">
          <AnimatedCounter
            target={totalBudget}
            formatter={(value) => formatCurrency(value)}
          />
        </div>
      </div>

      <div className="border border-charcoal/8 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
              Active spend
            </p>
            <p className="mt-2 text-lg font-medium text-charcoal">
              {formatCurrency(metrics.activeSpend)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
              Posture
            </p>
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                postureLabel === "Overextended" && "text-error",
                postureLabel === "Watch carefully" && "text-gold-dark",
                postureLabel === "Healthy runway" && "text-sage"
              )}
            >
              {postureLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-charcoal/8">
          <motion.div
            className={cn(
              "h-full rounded-full",
              metrics.activeSpend > totalBudget
                ? "bg-error"
                : metrics.activeSpend > totalBudget * 0.85
                  ? "bg-gold-primary"
                  : "bg-sage"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${metrics.usedPercent}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate">
          <span>{metrics.usedPercent}% of target committed</span>
          <span>
            {metrics.runway < 0 ? "-" : ""}
            {formatCurrency(Math.abs(metrics.runway))} runway
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Allocated" value={metrics.totalAllocated} />
        <SummaryCard label="Quoted" value={metrics.totalQuoted} />
        <SummaryCard label="Actual" value={metrics.totalActual} />
        <SummaryCard label="Paid" value={metrics.totalPaid} />
      </div>

      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Category mix
        </p>
        <div className="mt-4 space-y-3">
          {metrics.categoryInsights.map((category) => {
            const share =
              metrics.totalQuoted > 0
                ? Math.max(4, Math.round((category.quoted / metrics.totalQuoted) * 100))
                : 0;

            return (
              <div key={category.id}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-charcoal">{category.name}</span>
                  </div>
                  <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {formatCurrency(category.quoted)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-charcoal/8">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: category.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${share}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-charcoal/8 p-4">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Attention areas
        </p>
        {metrics.attention.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-slate">
            The plan is balanced right now. Keep capturing real quotes and actual
            spends to protect this runway.
          </p>
        ) : (
          <ul className="mt-4 list-none space-y-3 pl-0">
            {metrics.attention.map((category) => (
              <li
                key={category.id}
                className="flex items-start gap-3 border-b border-charcoal/6 pb-3 last:border-0 last:pb-0"
              >
                <div
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm text-charcoal">{category.name}</p>
                  <p className="mt-1 text-xs text-slate">{category.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-charcoal/8 p-4">
      <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </p>
      <p className="mt-2 font-display text-lg text-charcoal">
        <AnimatedCounter
          target={value}
          formatter={(amount) => formatCurrency(amount)}
        />
      </p>
    </div>
  );
}
