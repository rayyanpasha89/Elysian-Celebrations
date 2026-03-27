"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";

const values = [
  {
    n: "01",
    title: "Clarity",
    body: "Line-item budgets, honest trade-offs, and one source of truth—so you always know what ships when.",
  },
  {
    n: "02",
    title: "Craft",
    body: "Venues and creatives are chosen for taste and temperament, not algorithms—production values that match your scale.",
  },
  {
    n: "03",
    title: "Calm",
    body: "Contingency without drama: rehearsals, weather plans, and guest movement handled before the day asks for them.",
  },
];

export function ValuesTiersSection() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });

  return (
    <section className="border-t border-charcoal/10 bg-ivory px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
      <div ref={ref} className="mx-auto max-w-6xl">
        <p className="font-accent text-center text-[11px] uppercase tracking-[0.25em] text-gold-dark">
          Values
        </p>
        <h2 className="font-display mt-6 text-center text-3xl font-semibold text-charcoal md:text-4xl">
          How we work
        </h2>

        <motion.ul
          className="mt-16 grid list-none grid-cols-1 gap-0 border border-charcoal/15 pl-0 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {values.map((v) => (
            <motion.li
              key={v.n}
              variants={staggerItem}
              className="border-b border-charcoal/15 px-8 py-12 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <p className="font-display text-5xl font-semibold tabular-nums text-gold-primary/90 md:text-6xl">
                {v.n}
              </p>
              <h3 className="font-display mt-8 text-xl font-semibold tracking-tight text-charcoal">
                {v.title}
              </h3>
              <p className="font-heading mt-4 text-sm font-light leading-relaxed text-slate">{v.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
