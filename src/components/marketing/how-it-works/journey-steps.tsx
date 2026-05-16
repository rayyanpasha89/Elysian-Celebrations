"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  MapPin,
  PartyPopper,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  OrnamentRule,
  SectionEyebrow,
  SectionHeader,
} from "@/components/marketing/shared/marketing-primitives";

const steps = [
  {
    title: "Frame the atmosphere",
    body:
      "We begin with the emotional brief: how the arrival should feel, what kind of energy the ceremony needs, and how the weekend should live in memory and in photographs.",
    icon: Sparkles,
  },
  {
    title: "Reduce the world",
    body:
      "Then we narrow destinations, venues, and timing until only the places that truly fit your guest flow, budget, and visual language remain.",
    icon: MapPin,
  },
  {
    title: "Assemble the cast",
    body:
      "Photographers, florists, hospitality teams, and production partners are chosen for chemistry, not just availability, so the wedding feels coherent instead of crowded.",
    icon: UsersRound,
  },
  {
    title: "Model the investment",
    body:
      "Before scope expands, we make the investment legible through target categories, scenario planning, and trade-offs that protect what matters most.",
    icon: Wallet,
  },
  {
    title: "Conduct the weekend",
    body:
      "On site, every cue, arrival, contingency, and late-night shift is conducted in sequence so you can stay present while the experience holds together around you.",
    icon: PartyPopper,
  },
] as const;

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.18, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function JourneySteps() {
  return (
    <section
      id="how-it-works"
      className="relative bg-ivory px-[var(--section-padding-x)] py-[var(--section-padding-y)] text-charcoal overflow-hidden"
    >
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none" />

      {/* Atmospheric light */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 30%, rgba(201,169,110,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(201,169,110,0.04) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 text-center md:mb-20"
        >
          <SectionHeader
            chapter="03"
            eyebrow="How it works"
            title="The planning unfolds in five deliberate acts."
            intro="Each act reduces noise, strengthens taste, and keeps the wedding readable from the first brief through the final dance."
            align="center"
          />
        </motion.div>

        <div className="relative">
          {/* Central vertical thread */}
          <div className="absolute inset-y-12 left-1/2 z-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gold-primary/15 to-transparent md:block" />

          <motion.ol
            className="relative z-10 list-none pl-0 flex flex-col gap-12 md:gap-20"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isRight = index % 2 === 1;

              return (
                <motion.li
                  key={step.title}
                  variants={itemVariants}
                  className={`flex flex-col-reverse gap-3 md:items-center md:gap-6 ${
                    isRight ? "md:flex-row-reverse" : "md:flex-row"
                  }`}
                >
                  <div
                    className={`flex flex-1 flex-col gap-3 ${
                      isRight ? "md:text-right" : "md:text-left"
                    }`}
                  >
                    {/* Large ghost step number */}
                    <span className="font-display text-5xl font-bold text-gold-primary/[0.08] leading-none select-none">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <SectionEyebrow
                      size="sm"
                      label={`Act ${String(index + 1).padStart(2, "0")}`}
                      className={isRight ? "md:self-end" : undefined}
                    />
                    <h3 className="font-display text-[length:var(--text-h2)] text-charcoal -mt-2">
                      {step.title}
                    </h3>
                    <p className="font-sans text-[length:var(--text-body)] leading-relaxed text-slate">
                      {step.body}
                    </p>
                  </div>

                  <div
                    className={`flex shrink-0 justify-center md:w-[280px] ${
                      isRight ? "md:justify-start" : "md:justify-end"
                    }`}
                  >
                    <div className="group relative flex h-16 w-16 items-center justify-center border border-gold-primary/20 bg-cream/60 transition-all duration-500 hover:border-gold-primary/40 hover:bg-cream md:h-28 md:w-28">
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-gold-light/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 h-3 w-[1px] bg-gold-primary/30" />
                      <div className="absolute top-0 left-0 h-[1px] w-3 bg-gold-primary/30" />
                      <div className="absolute bottom-0 right-0 h-3 w-[1px] bg-gold-primary/30" />
                      <div className="absolute bottom-0 right-0 h-[1px] w-3 bg-gold-primary/30" />
                      <Icon
                        className="relative h-6 w-6 text-gold-dark transition-colors duration-300 group-hover:text-gold-primary md:h-10 md:w-10"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>

        <div className="mt-20 flex flex-col items-center gap-6 text-center md:mt-28">
          <OrnamentRule align="center" width={96} />
          <p className="max-w-xl font-heading text-base leading-relaxed text-slate">
            Once these five acts hold together, the planning surface itself starts
            doing the heavy lifting — vendors, budget, and the weekend programme
            move as one.
          </p>
          <Link
            href="/contact"
            className="font-accent inline-flex items-center gap-2 border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
          >
            Begin the planning
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
