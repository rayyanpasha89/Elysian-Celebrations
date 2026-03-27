"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";

export function PhilosophySection() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  return (
    <section className="border-t border-charcoal/10 bg-ivory px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2 md:items-end md:gap-24"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <p className="font-accent text-[11px] uppercase tracking-[0.25em] text-gold-dark">Philosophy</p>
          <h2 className="font-display mt-6 text-3xl font-semibold leading-tight text-charcoal md:text-4xl">
            Mission
          </h2>
          <div className="font-heading mt-8 space-y-6 text-base font-light leading-relaxed text-slate">
            <p>
              We exist to remove the noise from destination planning—replacing endless threads with a
              single roadmap, and vendor guesswork with shortlists you can trust.
            </p>
            <p>
              Our work is equal parts creative direction and operational discipline: budgets you can
              defend to family, timelines that respect light and tradition, and teams who know how
              to execute when the stakes are emotional.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="border-l border-gold-primary/35 pl-8 md:pl-12"
        >
          <p className="font-display text-[clamp(4rem,12vw,8rem)] font-semibold leading-none tracking-tight text-charcoal">
            150<span className="text-gold-primary">+</span>
          </p>
          <p className="font-heading mt-6 max-w-xs text-sm font-light uppercase tracking-[0.12em] text-slate">
            Couples who have trusted us with their destination chapter—each celebration distinct,
            each plan documented.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
