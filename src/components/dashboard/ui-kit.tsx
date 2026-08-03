"use client";

/** Shared dashboard data-visualization primitives. */

import { cn } from "@/lib/utils";

export function ProgressRing({
  percent,
  size = 96,
  stroke = 5,
  label = "Ready",
  showValue = true,
  className,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
  showValue?: boolean;
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
      aria-label={!showValue ? `${clamped}% ${label || "ready"}` : undefined}
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
      {showValue ? (
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
      ) : null}
    </div>
  );
}

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
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`${centerLabel ?? "Total"}: ${centerValue ?? total}`}
        >
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
          <li
            key={segment.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
                aria-hidden="true"
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

export function BarChart({
  data,
  height = 180,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className={className}>
      <div
        role="group"
        aria-label="Bar chart. Focus each bar to reveal its value."
        className="flex items-end gap-3 border-b border-charcoal/15 pb-2"
        style={{ height }}
      >
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                tabIndex={0}
                aria-label={`${item.label}: ${item.value}`}
                className="group/bar relative w-full border border-charcoal/10 bg-gold-primary/25 transition-colors hover:bg-gold-primary/45 focus-visible:bg-gold-primary/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-primary"
                style={{ height: `${Math.max(6, (item.value / max) * 100)}%` }}
              >
                <span className="absolute inset-x-0 -top-5 text-center font-accent text-[10px] text-charcoal opacity-0 transition-opacity group-hover/bar:opacity-100 group-focus/bar:opacity-100">
                  {item.value}
                </span>
              </div>
            </div>
            <span className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
