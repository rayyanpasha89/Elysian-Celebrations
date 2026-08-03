"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  variant?: "primary" | "outline" | "text";
  onClick?: () => void;
  href?: string;
}

const SPRING_CONFIG = { stiffness: 200, damping: 20, mass: 0.5 };

const VARIANT_CLASSES = {
  primary:
    "border border-gold-primary bg-transparent text-gold-primary transition-colors duration-500 hover:bg-gold-primary hover:text-midnight",
  outline:
    "border border-charcoal/30 bg-transparent text-charcoal transition-colors duration-500 hover:border-charcoal hover:bg-charcoal hover:text-ivory",
  text: "border-none bg-transparent text-gold-primary after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-gold-primary after:transition-all after:duration-500 hover:after:w-full",
} satisfies Record<NonNullable<MagneticButtonProps["variant"]>, string>;

export function MagneticButton({
  children,
  className,
  strength = 20,
  variant = "primary",
  onClick,
  href,
}: MagneticButtonProps) {
  const bounds = useRef<DOMRect | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING_CONFIG);
  const springY = useSpring(y, SPRING_CONFIG);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!prefersReducedMotion) return;
    x.set(0);
    y.set(0);
  }, [prefersReducedMotion, x, y]);

  const handlePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || event.pointerType === "touch") return;
    bounds.current = event.currentTarget.getBoundingClientRect();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || event.pointerType === "touch") return;

    const rect = bounds.current ?? event.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = event;
    const { left, top, width, height } = rect;
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    x.set(((clientX - centerX) / width) * strength);
    y.set(((clientY - centerY) / height) * strength);
  };

  const handlePointerLeave = () => {
    bounds.current = null;
    x.set(0);
    y.set(0);
  };

  const sharedClassName = cn(
    "relative inline-flex items-center justify-center",
    "px-8 py-4",
    "font-accent text-[11px] tracking-[0.25em] uppercase",
    VARIANT_CLASSES[variant],
    className
  );

  const motionProps = {
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
    onPointerCancel: handlePointerLeave,
    style: { x: springX, y: springY },
  };

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link
          href={href}
          onClick={onClick}
          className={sharedClassName}
        >
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={sharedClassName}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
}
