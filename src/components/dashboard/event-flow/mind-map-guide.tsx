"use client";

/**
 * MindMapGuide — an instructional/empty card that walks a first-time user
 * through the celebration board in three taps: pick a day → pick a function
 * branch → pick a step orbit. Presentational; optional CTA via onAction.
 */

import type { ComponentType } from "react";
import { CalendarRange, GitBranch, Orbit } from "lucide-react";
import { dashBtn, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type GuideStep = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  copy: string;
};

const STEPS: GuideStep[] = [
  {
    icon: CalendarRange,
    title: "Pick a day",
    copy: "Start at a celebration day to bring its plan into focus.",
  },
  {
    icon: GitBranch,
    title: "Pick a function branch",
    copy: "Open a function — reception, sangeet, dinner — to see its breakdown.",
  },
  {
    icon: Orbit,
    title: "Pick a step orbit",
    copy: "Tap a step — food, decor, photo, logistics — to customise it.",
  },
];

export type MindMapGuideProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function MindMapGuide({
  title = "Build your celebration board",
  description = "Your event becomes a living map. Work it top-down, one tap at a time.",
  actionLabel,
  onAction,
  className,
}: MindMapGuideProps) {
  return (
    <div
      className={cn("border border-charcoal/10 bg-ivory p-6 md:p-8", className)}
    >
      <p className={dashLabel}>Getting started</p>
      <h3 className="mt-2 font-display text-xl text-charcoal">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate">{description}</p>
      ) : null}

      <ol className="mt-6 list-none space-y-0 pl-0">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const last = index === STEPS.length - 1;
          return (
            <li key={step.title} className="flex gap-4">
              {/* Number rail + connector */}
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-primary/40 bg-gold-primary/10 font-display text-sm text-gold-dark">
                  {index + 1}
                </span>
                {!last ? (
                  <span className="my-1 w-px flex-1 bg-gradient-to-b from-gold-primary/40 to-charcoal/10" />
                ) : null}
              </div>
              <div className={cn("min-w-0", last ? "pb-0" : "pb-6")}>
                <p className="flex items-center gap-2 font-heading text-sm font-medium text-charcoal">
                  <Icon className="h-4 w-4 shrink-0 text-gold-dark" />
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate">{step.copy}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={cn(dashBtn, "mt-2")}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
