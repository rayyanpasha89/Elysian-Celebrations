"use client";

/**
 * Dashboard UI kit — the shared, editorial-luxury primitives every portal
 * (vendor / manager / admin, and the planner) composes from, so screens stay
 * consistent without each page reinventing tables, stats, drawers, and tabs.
 *
 * Pairs with `planner-inputs.tsx` (inputs) and `finalization-board.tsx`.
 * Conventions match `lib/dashboard-styles.ts`.
 */

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * ProgressRing — circular completeness indicator.
 * ------------------------------------------------------------------ */
export function ProgressRing({
  percent,
  size = 96,
  stroke = 5,
  label = "Ready",
  className,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-charcoal/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-gold-primary transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl leading-none text-charcoal">
          {clamped}%
        </span>
        {label ? (
          <span className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * DonutChart — proportional ring for category breakdowns.
 * ------------------------------------------------------------------ */
export type DonutSegment = { label: string; value: number; color: string };

export function DonutChart({
  segments,
  size = 160,
  thickness = 18,
  centerLabel,
  centerValue,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-charcoal/8"
          />
          {total > 0
            ? segments.map((segment) => {
                const fraction = Math.max(0, segment.value) / total;
                const dash = fraction * circumference;
                const circle = (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return circle;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl leading-none text-charcoal">
            {centerValue ?? total}
          </span>
          {centerLabel ? (
            <span className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">
              {centerLabel}
            </span>
          ) : null}
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-charcoal">{segment.label}</span>
            </span>
            <span className="font-heading text-charcoal">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * BarChart — simple vertical bars for a small series.
 * ------------------------------------------------------------------ */
export function BarChart({
  data,
  height = 180,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div
      className={cn("flex items-end gap-3 border-b border-charcoal/15 pb-2", className)}
      style={{ height }}
    >
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="group/bar relative w-full border border-charcoal/10 bg-gold-primary/25 transition-colors hover:bg-gold-primary/45"
              style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }}
            >
              <span className="absolute inset-x-0 -top-5 text-center font-accent text-[10px] text-charcoal opacity-0 transition-opacity group-hover/bar:opacity-100">
                {d.value}
              </span>
            </div>
          </div>
          <span className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * StatCard — a single metric tile.
 * ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  className?: string;
}) {
  return (
    <div className={cn("border border-charcoal/8 bg-ivory p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={dashLabel}>{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-gold-dark" /> : null}
      </div>
      <p className="mt-3 font-display text-3xl leading-none text-charcoal">{value}</p>
      {sub ? <p className="mt-2 text-xs leading-relaxed text-slate">{sub}</p> : null}
      {trend ? (
        <p
          className={cn(
            "mt-3 inline-flex items-center gap-1 font-accent text-[10px] uppercase tracking-[0.14em]",
            trend.direction === "up" && "text-sage",
            trend.direction === "down" && "text-rose",
            trend.direction === "flat" && "text-slate"
          )}
        >
          {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"}
          {trend.text}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * EmptyState — consistent "nothing here yet" with an optional action.
 * ------------------------------------------------------------------ */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-charcoal/15 bg-cream/40 px-6 py-16 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-gold-primary/30 bg-gold-primary/10 text-gold-dark">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="font-display text-xl text-charcoal">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toolbar — section header with eyebrow/title and right-aligned actions.
 * ------------------------------------------------------------------ */
export function Toolbar({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-charcoal/10 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        {eyebrow ? <p className={dashLabel}>{eyebrow}</p> : null}
        <h2 className="mt-1.5 font-display text-2xl text-charcoal">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * SegmentedTabs — single-select tab bar.
 * ------------------------------------------------------------------ */
export type TabItem<T extends string> = { value: T; label: string; count?: number };

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("-mx-1 flex gap-1.5 overflow-x-auto pb-1", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
              active
                ? "border-gold-primary bg-gold-primary/10 text-charcoal"
                : "border-charcoal/10 bg-ivory/70 text-slate hover:border-gold-primary/50 hover:text-charcoal"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "inline-flex h-4 min-w-4 items-center justify-center px-1 text-[9px]",
                  active ? "bg-gold-primary text-midnight" : "bg-charcoal/10 text-slate"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * FilterBar — search box + arbitrary filter controls in one row.
 * ------------------------------------------------------------------ */
export function FilterBar({
  search,
  onSearch,
  placeholder = "Search…",
  children,
  className,
}: {
  search?: string;
  onSearch?: (next: string) => void;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      {onSearch ? (
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <input
            value={search ?? ""}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
            className="w-full border border-charcoal/15 bg-ivory py-2 pl-9 pr-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
          />
        </div>
      ) : null}
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Drawer — right-side slide-over panel.
 * ------------------------------------------------------------------ */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10040] flex justify-end bg-midnight/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: `min(${width}px, 100%)` }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-full flex-col border-l border-charcoal/10 bg-ivory shadow-[0_0_120px_rgba(51,61,41,0.25)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-charcoal/10 p-6">
              <div>
                {eyebrow ? <p className={dashLabel}>{eyebrow}</p> : null}
                {title ? (
                  <h3 className="mt-1.5 font-display text-xl text-charcoal">{title}</h3>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center border border-charcoal/15 text-slate transition-colors hover:border-charcoal/30 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            {footer ? (
              <div className="border-t border-charcoal/10 p-6">{footer}</div>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ *
 * DataTable — generic, sortable, with optional row click.
 * ------------------------------------------------------------------ */
export type Column<Row> = {
  key: string;
  header: string;
  /** cell renderer */
  render: (row: Row) => ReactNode;
  /** value used for sorting; omit to make the column unsortable */
  sortValue?: (row: Row) => string | number;
  className?: string;
  align?: "left" | "right" | "center";
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  empty?: ReactNode;
  className?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sort.dir === "asc" ? sorted : sorted.reverse();
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("overflow-x-auto border border-charcoal/8 bg-ivory", className)}>
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-charcoal/10 bg-cream/40">
            {columns.map((col) => {
              const sortable = Boolean(col.sortValue);
              const isSorted = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 font-accent text-[10px] uppercase tracking-[0.16em] text-slate",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    sortable && "cursor-pointer select-none hover:text-charcoal"
                  )}
                  onClick={sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortable && isSorted ? (
                      sort!.dir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-charcoal/6 transition-colors last:border-0",
                onRowClick && "cursor-pointer hover:bg-gold-primary/[0.04]"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-sm text-charcoal",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
