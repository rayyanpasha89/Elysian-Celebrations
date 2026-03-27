"use client";

import { motion } from "framer-motion";
import { textRevealContainer, textRevealChar } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

interface TextRevealProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  delay?: number;
}

export function TextReveal({
  text,
  className,
  as: Tag = "h1",
  delay = 0,
}: TextRevealProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.3 });

  const words = text.split(" ");

  return (
    <Tag ref={ref as React.Ref<HTMLHeadingElement>} className={cn("overflow-hidden", className)}>
      <motion.span
        variants={textRevealContainer}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        transition={{ delayChildren: delay }}
        className="inline-flex flex-wrap"
      >
        {words.map((word, wordIdx) => (
          <span key={wordIdx} className="inline-flex overflow-hidden mr-[0.25em]">
            {word.split("").map((char, charIdx) => (
              <motion.span
                key={charIdx}
                variants={textRevealChar}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
