"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
  noPadding?: boolean;
}

export function SectionWrapper({
  children,
  className,
  id,
  dark = false,
  noPadding = false,
}: SectionWrapperProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.1 });

  return (
    <motion.section
      ref={ref}
      id={id}
      variants={fadeUp}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={cn(
        "relative w-full",
        !noPadding && "px-[var(--section-padding-x)] py-[var(--section-padding-y)]",
        dark ? "bg-midnight text-ivory" : "bg-ivory text-charcoal",
        className
      )}
    >
      <div className={cn("mx-auto w-full", !noPadding && "max-w-7xl")}>
        {children}
      </div>
    </motion.section>
  );
}
