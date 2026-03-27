"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  PartyPopper,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";

const steps = [
  {
    title: "Share Your Vision",
    body:
      "Tell us how you want the weekend to feel—intimate or grand, rooted in tradition or boldly contemporary. We translate mood boards into a clear plan.",
    icon: Sparkles,
  },
  {
    title: "Choose Your Destination",
    body:
      "Explore handpicked cities and venues matched to season, scale, and guest experience. We narrow the world to the places that fit your story.",
    icon: MapPin,
  },
  {
    title: "Curate Your Vendors",
    body:
      "We introduce you to teams we trust—florists, photographers, chefs—so every creative partner aligns with your taste and timeline.",
    icon: UsersRound,
  },
  {
    title: "Refine Your Budget",
    body:
      "Transparent categories, scenario planning, and honest trade-offs. You always know where the investment goes before you commit.",
    icon: Wallet,
  },
  {
    title: "Celebrate Your Day",
    body:
      "On the ground, we choreograph arrivals, cues, and contingencies—so you stay present while we hold the frame.",
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
      className="relative bg-ivory px-[var(--section-padding-x)] py-[var(--section-padding-y)] text-charcoal overflow-hidden"
      aria-labelledby="how-it-works-heading"
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
          <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary mb-4">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-display text-[length:var(--text-h1)] leading-tight text-charcoal"
          >
            From first conversation to last dance
          </h2>
          <p className="font-sans mx-auto mt-4 max-w-2xl text-[length:var(--text-body)] text-slate">
            Five deliberate steps—each one designed to protect your time, your guests, and the
            feeling you want to carry home.
          </p>
          {/* Gold divider */}
          <div className="mx-auto mt-8 h-[1px] w-16 bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
        </motion.div>

        {/* Central vertical thread */}
        <div className="hidden md:block absolute left-1/2 top-[280px] bottom-[120px] w-[1px] -translate-x-1/2 bg-gradient-to-b from-transparent via-gold-primary/15 to-transparent z-0" />

        <motion.ol
          className="relative list-none pl-0 flex flex-col gap-12 md:gap-20"
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
                className={`flex flex-col gap-6 md:flex-row md:items-center md:gap-16 ${
                  isRight ? "md:flex-row-reverse" : ""
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
                  <div className="group relative flex h-28 w-28 items-center justify-center border border-gold-primary/20 bg-cream/60 transition-all duration-500 hover:border-gold-primary/40 hover:bg-cream">
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gold-light/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 h-3 w-[1px] bg-gold-primary/30" />
                    <div className="absolute top-0 left-0 h-[1px] w-3 bg-gold-primary/30" />
                    <div className="absolute bottom-0 right-0 h-3 w-[1px] bg-gold-primary/30" />
                    <div className="absolute bottom-0 right-0 h-[1px] w-3 bg-gold-primary/30" />
                    <Icon
                      className="relative h-10 w-10 text-gold-dark transition-colors duration-300 group-hover:text-gold-primary"
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
    </section>
  );
}
