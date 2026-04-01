"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DestinationCardProps {
  slug: string;
  name: string;
  country: string;
  tagline: string;
  heroImage: string;
  startingPrice: number;
  venueCount: number;
  index: number;
  vibe?: string;
}

export function DestinationCard({
  slug,
  name,
  country,
  tagline,
  heroImage,
  startingPrice,
  venueCount,
  index,
  vibe,
}: DestinationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-[76vh] min-h-[560px] w-[min(88vw,460px)] flex-shrink-0 cursor-pointer overflow-hidden border border-white/10 md:w-[460px]"
    >
      <motion.div
        animate={{ scale: isHovered ? 1.06 : 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,18,0.02)_0%,rgba(10,12,18,0.18)_32%,rgba(10,12,18,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.18),transparent_28%)]" />

      <div className="absolute left-6 right-6 top-6 z-20 flex items-start justify-between gap-4">
        <div className="flex max-w-[70%] flex-wrap gap-2">
          <div className="border border-white/12 bg-midnight/55 px-3 py-2 backdrop-blur-xl">
            <span className="font-accent text-[9px] uppercase tracking-[0.28em] text-ivory/62">
              {country}
            </span>
          </div>
          {vibe ? (
            <div className="hidden border border-gold-primary/18 bg-gold-primary/10 px-3 py-2 backdrop-blur-xl sm:block">
              <span className="font-accent text-[9px] uppercase tracking-[0.28em] text-gold-light">
                {vibe}
              </span>
            </div>
          ) : null}
        </div>
        <span className="font-display text-5xl font-bold text-ivory/[0.08]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-7">
        <motion.div
          animate={{ width: isHovered ? 76 : 40 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 h-px bg-gold-primary"
        />

        <h3 className="font-display text-4xl font-bold text-ivory">{name}</h3>
        <p className="mt-3 max-w-sm font-heading text-[0.98rem] font-light leading-relaxed text-ivory/70">
          {tagline}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="border border-white/10 bg-white/[0.05] px-4 py-4 backdrop-blur-xl">
            <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light/84">
              Venue depth
            </p>
            <p className="mt-2 font-display text-2xl text-ivory">{venueCount}+</p>
          </div>
          <div className="border border-white/10 bg-white/[0.05] px-4 py-4 backdrop-blur-xl">
            <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light/84">
              Starting from
            </p>
            <p className="mt-2 font-display text-2xl text-ivory">
              {formatCurrency(startingPrice)}
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-6 inline-flex items-center gap-3 font-accent text-[10px] uppercase tracking-[0.22em] text-gold-primary"
        >
          Explore the destination
          <ArrowUpRight className="h-4 w-4" />
        </motion.div>
      </div>

      <Link
        href={`/destinations/${slug}`}
        className="absolute inset-0 z-30"
        aria-label={`Explore ${name}`}
      />

      <motion.div
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-none absolute inset-0 z-20 ring-1 ring-inset ring-gold-primary/28"
      />
    </motion.div>
  );
}
