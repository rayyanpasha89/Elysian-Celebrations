"use client";

import { motion } from "framer-motion";
import { lineSlideUp, lineMaskContainer } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

interface LineMaskProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function LineMask({ children, className, delay = 0 }: LineMaskProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.3 });

  return (
    <motion.div
      ref={ref}
      variants={lineMaskContainer}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={cn("overflow-hidden", className)}
    >
      <motion.div variants={lineSlideUp} transition={{ delay }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
