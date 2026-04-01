"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
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

export function MagneticButton({
  children,
  className,
  strength = 20,
  variant = "primary",
  onClick,
  href,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    setPosition({
      x: ((clientX - centerX) / width) * strength,
      y: ((clientY - centerY) / height) * strength,
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variants = {
    primary: cn(
      "border border-gold-primary bg-transparent text-gold-primary",
      "hover:bg-gold-primary hover:text-midnight",
      "transition-colors duration-500"
    ),
    outline: cn(
      "border border-charcoal/30 bg-transparent text-charcoal",
      "hover:border-charcoal hover:bg-charcoal hover:text-ivory",
      "transition-colors duration-500"
    ),
    text: cn(
      "border-none bg-transparent text-gold-primary",
      "after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-gold-primary",
      "after:transition-all after:duration-500 hover:after:w-full"
    ),
  };

  const sharedClassName = cn(
    "relative inline-flex items-center justify-center",
    "px-8 py-4",
    "font-accent text-[11px] tracking-[0.25em] uppercase",
    variants[variant],
    className
  );

  const motionProps = {
    onMouseMove: handleMouse,
    onMouseLeave: handleMouseLeave,
    animate: { x: position.x, y: position.y },
    transition: { type: "spring" as const, stiffness: 200, damping: 20, mass: 0.5 },
  };

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link
          ref={ref as React.RefObject<HTMLAnchorElement>}
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
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      className={sharedClassName}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
}
