"use client";

import { motion } from "framer-motion";

export function PackagesHero() {
  return (
    <section className="relative overflow-hidden bg-midnight px-[var(--section-padding-x)] pb-16 pt-[clamp(5rem,12vh,8rem)] text-ivory md:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,169,110,0.15),_transparent_55%)]" />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="font-accent text-xs uppercase tracking-[0.35em] text-gold-light">Packages</p>
        <motion.h1
          className="font-display mt-5 text-ivory"
          style={{ fontSize: "var(--text-display)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] as const }}
        >
          Find Your Perfect Package
        </motion.h1>
        <motion.p
          className="font-heading mx-auto mt-6 max-w-2xl text-lg font-light text-ivory/75 md:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] as const }}
        >
          Three curated tiers—each a foundation you can shape. Compare inclusions, then let us tailor
          the details to your destination and guest list.
        </motion.p>
      </div>
    </section>
  );
}
