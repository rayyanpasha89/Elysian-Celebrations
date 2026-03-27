"use client";

import { motion } from "framer-motion";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageRevealProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

export function ImageReveal({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: ImageRevealProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      {/* Gold curtain overlay */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={isInView ? { scaleX: 0 } : { scaleX: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "right" }}
        className="absolute inset-0 z-10 bg-gold-primary"
      />
      {/* Image with scale-in */}
      <motion.div
        initial={{ scale: 1.2 }}
        animate={isInView ? { scale: 1 } : { scale: 1.2 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className="w-full h-full object-cover"
        />
      </motion.div>
    </div>
  );
}
