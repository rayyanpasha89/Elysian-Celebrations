"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MagneticButton } from "@/components/shared/magnetic-button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: video pushes back on scroll
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Video Background with Parallax */}
      <motion.div
        style={{ y: videoY, scale: videoScale }}
        className="absolute inset-0 z-0"
      >
        {/* Multi-layer gradient for cinematic depth */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-midnight/80 via-midnight/40 to-midnight/90" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-midnight/60 via-transparent to-midnight/60" />

        {/* Placeholder — replace with real video later */}
        <div className="absolute inset-0 bg-midnight">
          {/* Atmospheric light bleed */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 25% 40%, rgba(201,169,110,0.12) 0%, transparent 50%), radial-gradient(ellipse at 75% 55%, rgba(212,160,160,0.08) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(201,169,110,0.06) 0%, transparent 40%)",
            }}
          />
          {/* Diagonal lines pattern for visual texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px)",
            }}
          />
        </div>
        {/* Film grain overlay */}
        <div className="absolute inset-0 z-10 noise-dark" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-20 flex h-full flex-col items-center justify-center px-[var(--section-padding-x)] text-center"
      >
        {/* Overline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="font-accent text-xs uppercase tracking-[0.4em] text-gold-light mb-6"
        >
          Luxury Destination Weddings
        </motion.p>

        {/* Main Headline — character reveal */}
        <HeroHeadline />

        {/* Gold divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 h-[1px] w-24 origin-center bg-gradient-to-r from-transparent via-gold-primary to-transparent"
        />

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-lg font-heading text-lg font-light text-ivory/60 md:text-xl leading-relaxed"
        >
          Destination weddings, curated with precision.
          <br className="hidden md:block" />
          Transparent budgets. Handpicked vendors. Zero compromise.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex items-center gap-8"
        >
          <MagneticButton className="text-sm px-10 py-4">
            Explore Destinations
          </MagneticButton>
          <a
            href="#contact"
            className="group font-accent text-[11px] uppercase tracking-[0.2em] text-ivory/60 transition-colors hover:text-gold-primary"
          >
            Get in Touch
            <span className="block h-[1px] w-0 bg-gold-primary transition-all duration-500 group-hover:w-full" />
          </a>
        </motion.div>
      </motion.div>

      {/* Side vertical text — editorial accent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1.2 }}
        className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 xl:block"
      >
        <span
          className="font-accent text-[9px] uppercase tracking-[0.5em] text-ivory/15"
          style={{ writingMode: "vertical-rl" }}
        >
          Est. 2024 — India
        </span>
      </motion.div>

      {/* Right side thin gold line */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 2.8, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-8 top-[20%] z-20 hidden h-[20vh] w-[1px] origin-top bg-gradient-to-b from-gold-primary/30 to-transparent xl:block"
      />

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3"
        >
          <span className="font-accent text-[10px] uppercase tracking-[0.3em] text-ivory/30">
            Scroll
          </span>
          <div className="h-10 w-[1px] bg-gradient-to-b from-gold-primary/60 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// === Character-by-character headline reveal ===
function HeroHeadline() {
  const line1 = "Where Dreams";
  const line2 = "Become Celebrations";

  return (
    <h1 className="font-display font-bold text-ivory" style={{ fontSize: "var(--text-hero)" }}>
      <AnimatedLine text={line1} delay={0.6} />
      <br />
      <AnimatedLine text={line2} delay={1.0} className="text-gold-primary" />
    </h1>
  );
}

function AnimatedLine({
  text,
  delay,
  className,
}: {
  text: string;
  delay: number;
  className?: string;
}) {
  const words = text.split(" ");

  return (
    <span className={cn("inline-flex flex-wrap justify-center gap-x-[0.25em]", className)}>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-flex overflow-hidden" style={{ perspective: "1000px" }}>
          {word.split("").map((char, charIdx) => (
            <motion.span
              key={charIdx}
              initial={{ rotateX: 90, opacity: 0, y: "40%" }}
              animate={{ rotateX: 0, opacity: 1, y: "0%" }}
              transition={{
                duration: 0.6,
                delay: delay + (wordIdx * word.length + charIdx) * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformOrigin: "bottom center" }}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}
