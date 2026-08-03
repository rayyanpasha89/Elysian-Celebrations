"use client";

import { useMemo, useState } from "react";
import { ChevronDown, PieChart, WalletCards } from "lucide-react";
import { DASHBOARD_CHART_PALETTE } from "@/lib/dashboard-styles";
import { cn, formatCurrency } from "@/lib/utils";

type SpendDimension =
  | "event"
  | "day"
  | "category"
  | "vendor"
  | "pricing"
  | "payment";

type SpendFunction = {
  eventId: string;
  name: string;
  display: number;
};

type SpendDay = {
  id: string;
  name: string;
  dayTotal: number;
  functions: SpendFunction[];
};

type SpendPick = {
  bookingId?: string;
  vendorName: string;
  categoryName: string;
  displayCost: number;
  costState: "estimate" | "final";
  paidAmount: number;
};

type SpendRow = {
  label: string;
  value: number;
  color: string;
};

const DIMENSIONS: { value: SpendDimension; label: string }[] = [
  { value: "event", label: "Event / function" },
  { value: "day", label: "Day" },
  { value: "category", label: "Food and category" },
  { value: "vendor", label: "Vendor" },
  { value: "pricing", label: "Final vs estimate" },
  { value: "payment", label: "Paid vs due" },
];

const DIMENSION_COPY: Record<SpendDimension, string> = {
  event: "See which individual function is carrying the most cost.",
  day: "Compare the full investment across each day of the celebration.",
  category: "Understand food, decor, photography, hospitality, and every service layer.",
  vendor: "See the current contribution of every selected vendor and service partner.",
  pricing: "Separate final prices published by Elysian from estimates still moving.",
  payment: "Track what is already paid against the amount still due or estimated.",
};

function groupPicks(
  picks: SpendPick[],
  labelFor: (pick: SpendPick) => string
) {
  const grouped = new Map<string, number>();
  for (const pick of picks) {
    const label = labelFor(pick).trim() || "Uncategorized";
    grouped.set(label, (grouped.get(label) ?? 0) + Math.max(0, pick.displayCost));
  }
  return [...grouped].map(([label, value]) => ({ label, value }));
}

function collapseRows(
  rows: { label: string; value: number }[],
  maximum: number,
  remainderLabel: string
) {
  const sorted = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= maximum) return sorted;
  return [
    ...sorted.slice(0, maximum - 1),
    {
      label: remainderLabel,
      value: sorted.slice(maximum - 1).reduce((sum, row) => sum + row.value, 0),
    },
  ];
}

export function SpendIntelligence({
  projected,
  days,
  picks,
}: {
  projected: number;
  days: SpendDay[];
  picks: SpendPick[];
}) {
  const [dimension, setDimension] = useState<SpendDimension>("event");

  const rows = useMemo<SpendRow[]>(() => {
    let raw: { label: string; value: number }[];

    if (dimension === "day") {
      raw = days.map((day) => ({ label: day.name, value: day.dayTotal }));
    } else if (dimension === "event") {
      raw = days.flatMap((day) =>
        day.functions.map((event) => ({
          label: `${day.name} · ${event.name}`,
          value: event.display,
        }))
      );
    } else if (dimension === "category") {
      raw = groupPicks(picks, (pick) => pick.categoryName);
      const tracked = raw.reduce((sum, row) => sum + row.value, 0);
      if (projected > tracked) {
        raw.push({ label: "Unassigned plan estimate", value: projected - tracked });
      }
    } else if (dimension === "vendor") {
      raw = groupPicks(picks, (pick) => pick.vendorName);
      const tracked = raw.reduce((sum, row) => sum + row.value, 0);
      if (projected > tracked) {
        raw.push({ label: "Not assigned to a vendor", value: projected - tracked });
      }
    } else if (dimension === "pricing") {
      const finalValue = picks
        .filter((pick) => pick.costState === "final")
        .reduce((sum, pick) => sum + pick.displayCost, 0);
      raw = [
        { label: "Final price", value: finalValue },
        { label: "Live estimate", value: Math.max(0, projected - finalValue) },
      ];
    } else {
      const paid = Math.min(
        projected,
        picks.reduce((sum, pick) => sum + Math.max(0, pick.paidAmount), 0)
      );
      raw = [
        { label: "Paid", value: paid },
        { label: "Still due or estimated", value: Math.max(0, projected - paid) },
      ];
    }

    const maximum = dimension === "vendor" || dimension === "event" ? 8 : 10;
    const collapsed = collapseRows(
      raw,
      maximum,
      dimension === "vendor" ? "Other vendors" : "Other functions"
    );
    return collapsed.map((row, index) => ({
      ...row,
      color: DASHBOARD_CHART_PALETTE[index % DASHBOARD_CHART_PALETTE.length],
    }));
  }, [days, dimension, picks, projected]);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  let cursor = 0;
  const gradientStops = rows.map((row) => {
    const start = total > 0 ? (cursor / total) * 100 : 0;
    cursor += row.value;
    const end = total > 0 ? (cursor / total) * 100 : 0;
    return `${row.color} ${start}% ${end}%`;
  });

  return (
    <section className="overflow-hidden border border-charcoal/10 bg-ivory">
      <div className="flex flex-col gap-4 border-b border-charcoal/8 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-slate">
            Spend intelligence
          </p>
          <h2 className="mt-2 font-display text-2xl text-charcoal md:text-3xl">
            See the same plan from every angle
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">
            {DIMENSION_COPY[dimension]}
          </p>
        </div>
        <label className="block min-w-[220px]">
          <span className="font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
            Break down spending by
          </span>
          <span className="relative mt-1.5 block">
            <select
              value={dimension}
              onChange={(event) => setDimension(event.target.value as SpendDimension)}
              className="w-full appearance-none border border-charcoal/15 bg-cream/40 py-3 pl-3 pr-10 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
            >
              {DIMENSIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          </span>
        </label>
      </div>

      <div className="grid gap-8 p-5 md:p-6 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)] lg:items-center">
        <div className="flex flex-col items-center">
          <div
            role="img"
            aria-label={`${DIMENSIONS.find((option) => option.value === dimension)?.label} spend chart totalling ${formatCurrency(total)}`}
            className="relative h-56 w-56 rounded-full shadow-[0_22px_60px_rgba(51,61,41,0.12)]"
            style={{
              background:
                total > 0
                  ? `conic-gradient(${gradientStops.join(", ")})`
                  : "conic-gradient(#B6AD90 0 100%)",
            }}
          >
            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full border border-charcoal/8 bg-ivory text-center shadow-inner">
              <PieChart className="h-4 w-4 text-gold-dark" />
              <span className="mt-2 font-display text-2xl text-charcoal">
                {formatCurrency(total)}
              </span>
              <span className="mt-1 font-accent text-[8px] uppercase tracking-[0.16em] text-slate">
                Current view
              </span>
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 border border-charcoal/8 bg-cream/35 px-3 py-2 text-xs text-slate">
            <WalletCards className="h-3.5 w-3.5 text-gold-dark" />
            Final prices replace estimates automatically.
          </div>
        </div>

        {rows.length > 0 ? (
          <ol className="space-y-3">
            {rows.map((row) => {
              const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <li key={row.label} className="border-b border-charcoal/7 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="truncate font-heading text-sm text-charcoal">
                        {row.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-base text-charcoal">
                        {formatCurrency(row.value)}
                      </span>
                      <span className="font-accent text-[9px] uppercase tracking-[0.12em] text-slate">
                        {share}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-charcoal/7">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500")}
                      style={{ width: `${share}%`, backgroundColor: row.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="border border-dashed border-charcoal/15 bg-cream/30 p-8 text-center">
            <p className="font-display text-xl text-charcoal">Nothing to chart yet</p>
            <p className="mt-2 text-sm text-slate">
              Add vendor picks or event estimates and this view will build itself.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
