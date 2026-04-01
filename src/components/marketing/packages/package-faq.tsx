"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Are package prices fixed?",
    a: "Figures are indicative starting points. Your final investment depends on destination, guest count, season, and creative scope—we build a line-item budget before you commit.",
  },
  {
    q: "Can we mix services across tiers?",
    a: "Yes. Tiers describe baseline support; we often bolt on à la carte production, talent, or hospitality layers to match your weekend.",
  },
  {
    q: "How far in advance should we book?",
    a: "Prime venues and crews book 9–18 months ahead for peak season. If your date is sooner, we still move quickly with pre-vetted alternates.",
  },
  {
    q: "Do you work outside India?",
    a: "Absolutely. Royal and many Grand engagements include international vendor coordination, travel logistics, and on-site leadership.",
  },
  {
    q: "What does coordination include on the wedding day?",
    a: "Cueing, vendor management, guest movement, contingency handling, and a single command chain so you are never the point of contact in a crisis.",
  },
  {
    q: "Is the budget tool available for every tier?",
    a: "Yes. Intimate includes category-level transparency; Grand and Royal add scenario planning, payment schedules, and live revisions as scope shifts.",
  },
];

export function PackageFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="border-t border-gold-light/40 bg-cream/50 px-[var(--section-padding-x)] py-[var(--section-padding-y)]"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="faq-heading"
          className="font-display text-center text-charcoal"
          style={{ fontSize: "var(--text-h2)" }}
        >
          Questions
        </h2>
        <p className="font-heading mt-3 text-center text-slate">
          Straight answers about how tiers translate into real weekends.
        </p>

        <ul className="mt-10 list-none space-y-3 pl-0">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q} className="rounded-xl border border-charcoal/10 bg-ivory/90 shadow-sm">
                <button
                  type="button"
                  data-cursor="pointer"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="font-heading flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base text-charcoal transition hover:bg-cream/80"
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-gold-primary transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
                    >
                      <p className="font-sans border-t border-gold-light/30 px-5 pb-5 pt-3 text-sm leading-relaxed text-slate">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
