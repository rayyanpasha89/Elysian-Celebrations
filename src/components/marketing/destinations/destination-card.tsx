"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface DestinationCardProps {
  name: string;
  country: string;
  tagline: string;
  heroImage: string;
  startingPrice: number;
  venueCount: number;
  index: number;
}

export function DestinationCard({
  name,
  country,
  tagline,
  heroImage,
  startingPrice,
  venueCount,
  index,
}: DestinationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-[70vh] w-[400px] flex-shrink-0 cursor-pointer overflow-hidden md:w-[450px]"
    >
      {/* Background Image with Ken Burns */}
      <motion.div
        animate={{ scale: isHovered ? 1.08 : 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        {/* Rich placeholder gradient — replace with real images */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${135 + index * 30}deg,
              hsl(${30 + index * 40}, 35%, 22%) 0%,
              hsl(${50 + index * 30}, 25%, 12%) 100%)`,
          }}
        />
        {/* Diagonal texture overlay for visual interest */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)",
          }}
        />
        {/* Atmospheric light spot */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(ellipse at ${30 + index * 10}% ${40 + index * 5}%, rgba(201,169,110,0.15) 0%, transparent 50%)`,
          }}
        />
      </motion.div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/30 to-transparent z-10" />

      {/* Country Tag — top left */}
      <div className="absolute top-6 left-6 z-20">
        <span className="font-accent text-[9px] uppercase tracking-[0.3em] text-ivory/40">
          {country}
        </span>
      </div>

      {/* Index number — top right */}
      <div className="absolute top-6 right-6 z-20">
        <span className="font-display text-5xl font-bold text-ivory/[0.06]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8">
        {/* Gold accent line */}
        <motion.div
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 h-[1px] w-12 origin-left bg-gold-primary"
        />

        <h3 className="font-display text-4xl font-bold text-ivory mb-2">
          {name}
        </h3>
        <p className="font-heading text-base font-light text-ivory/50 mb-6 leading-relaxed">
          {tagline}
        </p>

        {/* Details row */}
        <div className="flex items-center gap-6">
          <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-ivory/40">
            {venueCount} Venues
          </span>
          <span className="h-3 w-[1px] bg-ivory/15" />
          <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-gold-primary/70">
            From {formatCurrency(startingPrice)}
          </span>
        </div>

        {/* Hover CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-6"
        >
          <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary">
            Explore
            <span className="ml-2 inline-block h-[1px] w-8 bg-gold-primary align-middle transition-all duration-500 group-hover:w-12" />
          </span>
        </motion.div>
      </div>

      {/* Hover border — sharp rectangle */}
      <motion.div
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-30 pointer-events-none ring-1 ring-inset ring-gold-primary/20"
      />
    </motion.div>
  );
}
