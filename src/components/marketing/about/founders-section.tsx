"use client";

import { motion } from "framer-motion";
import { fadeUp, fadeLeft, fadeRight, staggerContainer, staggerItem } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const stats = [
  { label: "Couples", value: 150, suffix: "+" },
  { label: "Destinations", value: 7 },
  { label: "Vendors", value: 200, suffix: "+" },
  { label: "Years", value: 5, suffix: "+" },
];

export function FoundersSection() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });

  return (
    <section id="about" className="relative overflow-hidden bg-ivory py-[var(--section-padding-y)]">
      {/* Atmospheric depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 50%, rgba(201,169,110,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(212,160,160,0.04) 0%, transparent 40%)",
        }}
      />

      <div ref={ref} className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left — Photo Placeholder */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden img-placeholder">
              {/* Diagonal texture overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 10.5px)",
                }}
              />
              {/* Placeholder — replace with real founders photo */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold-primary/15 via-rose/8 to-midnight/8" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="font-display text-7xl font-bold text-gold-primary/20 leading-none">D & N</span>
                  <div className="mx-auto mt-3 h-[1px] w-8 bg-gold-primary/20" />
                  <p className="font-accent text-[10px] uppercase tracking-[0.3em] text-charcoal/25 mt-3">
                    Deeksha & Nithin
                  </p>
                </div>
              </div>
            </div>
            {/* Decorative offset frame */}
            <div className="absolute -bottom-4 -right-4 h-full w-full border border-gold-primary/15 -z-10" />
            {/* Corner accents on main image */}
            <div className="absolute top-0 left-0 h-5 w-[1px] bg-gold-primary/30" />
            <div className="absolute top-0 left-0 h-[1px] w-5 bg-gold-primary/30" />
            <div className="absolute bottom-0 right-0 h-5 w-[1px] bg-gold-primary/30" />
            <div className="absolute bottom-0 right-0 h-[1px] w-5 bg-gold-primary/30" />
          </motion.div>

          {/* Right — Story */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary mb-4">
              Our Story
            </p>
            <h2
              className="font-display font-bold text-charcoal mb-6"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Meet Deeksha
              <br />
              <span className="text-gold-primary">& Nithin</span>
            </h2>
            {/* Gold divider */}
            <div className="mb-6 h-[1px] w-12 bg-gradient-to-r from-gold-primary/40 to-transparent" />
            <div className="space-y-4 font-heading text-base font-light leading-relaxed text-slate">
              <p className="first-letter:text-4xl first-letter:font-display first-letter:font-bold first-letter:text-gold-primary first-letter:float-left first-letter:mr-2 first-letter:mt-1">
                We believe every love story deserves a celebration that matches
                its uniqueness. That&apos;s why we started Elysian Celebrations — not
                as another wedding planning company, but as a bridge between
                your vision and the perfect execution.
              </p>
              <p>
                With hands-on involvement in every wedding we take on, we ensure
                that no detail is overlooked and no moment is left to chance.
                From the first conversation to the last dance, we&apos;re there —
                not just as planners, but as partners in making your celebration
                truly extraordinary.
              </p>
            </div>

            {/* SVG Signature */}
            <motion.svg
              viewBox="0 0 200 50"
              className="mt-8 h-12 w-auto text-gold-primary"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
            >
              <motion.path
                d="M10 35 C 30 10, 50 10, 60 25 S 80 45, 90 30 S 110 10, 130 25 S 150 45, 170 20 L 190 25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
              />
            </motion.svg>

            {/* Stats */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4"
            >
              {stats.map(({ label, value, suffix }) => (
                <motion.div key={label} variants={staggerItem}>
                  <div className="font-display text-3xl font-bold text-charcoal">
                    <AnimatedCounter target={value} suffix={suffix} />
                  </div>
                  <div className="mt-1 h-[1px] w-6 bg-gold-primary/40" />
                  <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate mt-2">
                    {label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
