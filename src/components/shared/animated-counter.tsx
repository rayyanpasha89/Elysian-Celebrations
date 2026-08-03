"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({
  target,
  duration = 2,
  prefix = "",
  suffix = "",
  className,
  formatter,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();
  const previousTargetRef = useRef(target);
  const hasAnimatedRef = useRef(false);
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    if (!isInView) {
      previousTargetRef.current = target;
      return;
    }

    if (prefersReducedMotion) {
      previousTargetRef.current = target;
      hasAnimatedRef.current = true;
      return;
    }

    const startValue = hasAnimatedRef.current ? previousTargetRef.current : 0;
    previousTargetRef.current = target;
    hasAnimatedRef.current = true;

    const controls = animate(startValue, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplayValue(Math.round(value)),
    });

    return () => controls.stop();
  }, [duration, isInView, prefersReducedMotion, target]);

  const visibleValue = !isInView || prefersReducedMotion ? target : displayValue;
  const formatted = formatter ? formatter(visibleValue) : visibleValue.toLocaleString("en-IN");
  const accessibleValue = formatter ? formatter(target) : target.toLocaleString("en-IN");

  return (
    <span
      ref={ref}
      className={cn("tabular-nums", className)}
      aria-label={`${prefix}${accessibleValue}${suffix}`}
    >
      <span aria-hidden>
        {prefix}
        {formatted}
        {suffix}
      </span>
    </span>
  );
}
