"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, MapPin } from "lucide-react";
import { staggerContainer, staggerItem } from "@/animations/variants";
import { destinations } from "@/data/destinations";
import { formatCurrency } from "@/lib/utils";

export function DestinationsGrid() {
  return (
    <div className="mx-auto max-w-7xl px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14 text-center md:mb-20"
      >
        <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">
          Destinations
        </p>
        <h1
          className="font-display mt-3 text-charcoal"
          style={{ fontSize: "var(--text-display)" }}
        >
          Where love finds its stage
        </h1>
        <p className="font-heading mx-auto mt-4 max-w-2xl text-lg font-light text-slate">
          Handpicked cities and landscapes for celebrations that feel unmistakably yours.
        </p>
      </motion.header>

      <motion.ul
        className="grid list-none grid-cols-1 gap-8 pl-0 sm:grid-cols-2 xl:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {destinations.map((d, index) => (
          <motion.li key={d.id} variants={staggerItem} className="h-full">
            <Link
              href={`/destinations/${d.slug}`}
              data-cursor="pointer"
              className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
            >
              <article className="glass-light flex h-full flex-col overflow-hidden rounded-2xl border border-white/40 shadow-md transition-shadow duration-300 hover:shadow-xl">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(${135 + index * 28}deg,
                        hsl(${28 + index * 35}, 35%, 22%) 0%,
                        hsl(${52 + index * 25}, 28%, 12%) 100%)`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/85 via-midnight/15 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="font-accent inline-flex items-center gap-1.5 rounded-full bg-ivory/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ivory backdrop-blur-md">
                      <MapPin size={12} className="text-gold-light" aria-hidden />
                      {d.country}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-display text-2xl font-semibold text-charcoal group-hover:text-gold-dark">
                    {d.name}
                  </h2>
                  <p className="font-accent mt-3 text-xs uppercase tracking-[0.15em] text-gold-primary">
                    From {formatCurrency(d.startingPrice)}
                  </p>
                  <div className="font-accent mt-6 flex items-center gap-2 text-xs text-slate">
                    <Building2 size={14} className="text-gold-primary" aria-hidden />
                    <span>{d.venueCount} curated venues</span>
                  </div>
                </div>
              </article>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
