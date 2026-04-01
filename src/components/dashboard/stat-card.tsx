"use client";

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  formatter,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "border border-charcoal/8 bg-ivory p-6 transition-colors hover:border-gold-primary/30",
        className
      )}
    >
      <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-3">
        {label}
      </p>
      <div className="font-display text-3xl font-bold text-charcoal">
        <AnimatedCounter
          target={value}
          prefix={prefix}
          suffix={suffix}
          formatter={formatter}
        />
      </div>
      {trend && (
        <p
          className={cn(
            "mt-2 font-accent text-[10px] uppercase tracking-[0.15em]",
            trend.isPositive ? "text-sage" : "text-rose"
          )}
        >
          {trend.isPositive ? "+" : ""}
          {trend.value}% from last month
        </p>
      )}
    </div>
  );
}
