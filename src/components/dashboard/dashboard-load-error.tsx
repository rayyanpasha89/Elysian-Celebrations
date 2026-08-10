"use client";

import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type DashboardLoadErrorProps = {
  eyebrow: string;
  pageTitle: string;
  label: string;
  title: string;
  description: string;
  onRetry: () => void;
};

export function DashboardLoadError({
  eyebrow,
  pageTitle,
  label,
  title,
  description,
  onRetry,
}: DashboardLoadErrorProps) {
  return (
    <div>
      <p className={dashLabel}>{eyebrow}</p>
      <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
        {pageTitle}
      </h2>
      <div
        role="alert"
        className={cn(
          dashCard,
          "mt-10 border-dashed border-gold-primary/45 bg-gold-primary/[0.04]"
        )}
      >
        <p className={dashLabel}>{label}</p>
        <h3 className="mt-3 font-display text-2xl text-charcoal">{title}</h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
          {description}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={cn(dashBtn, "mt-6")}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
