"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

const packages = [
  {
    name: "Intimate",
    tagline: "Essential Elegance",
    tier: "01",
    startingPrice: 1500000,
    featured: false,
    inclusions: [
      "Venue coordination",
      "Basic decor & floral",
      "Photography (1 photographer)",
      "Catering coordination",
      "Event day management",
      "Guest management support",
    ],
  },
  {
    name: "Grand",
    tagline: "Full Curation",
    tier: "02",
    startingPrice: 3500000,
    featured: true,
    inclusions: [
      "Premium venue selection",
      "Full decor & design",
      "Photo + Video team",
      "Multi-event catering",
      "Makeup & styling",
      "Entertainment & DJ",
      "End-to-end coordination",
      "Budget management",
    ],
  },
  {
    name: "Royal",
    tagline: "Bespoke Luxury",
    tier: "03",
    startingPrice: 7500000,
    featured: false,
    inclusions: [
      "Exclusive luxury venues",
      "Bespoke design & decor",
      "Celebrity photo + video",
      "Gourmet multi-cuisine",
      "Celebrity makeup artists",
      "Live performances & MC",
      "Travel & logistics",
      "Dedicated planner team",
      "Complimentary pre-wedding",
      "Honeymoon coordination",
    ],
  },
];

type PackageSectionProps = {
  showHeader?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
};

export function PackageSection({
  showHeader = true,
  eyebrow = "Curated Packages",
  title = "Choose Your Tier",
  subtitle = "Every tier is a starting point — fully customizable to match your vision and budget.",
}: PackageSectionProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });

  return (
    <section id="packages" className="relative overflow-hidden bg-cream py-[var(--section-padding-y)]">
      <div ref={ref} className="mx-auto max-w-7xl px-[var(--section-padding-x)]">
        {showHeader && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mb-16 text-center"
          >
            <p className="font-accent mb-4 text-xs uppercase tracking-[0.3em] text-gold-primary">
              {eyebrow}
            </p>
            <h2
              className="font-display font-bold text-charcoal"
              style={{ fontSize: "var(--text-display)" }}
            >
              {title}
            </h2>
            <p className="font-heading mx-auto mt-4 max-w-2xl text-lg font-light text-slate">
              {subtitle}
            </p>
          </motion.div>
        )}

        {/* Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-8 md:grid-cols-3"
        >
          {packages.map((pkg) => (
            <PackageCard key={pkg.name} pkg={pkg} isInView={isInView} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PackageCard({
  pkg,
  isInView,
}: {
  pkg: (typeof packages)[0];
  isInView: boolean;
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  return (
    <motion.div
      variants={staggerItem}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${-mousePos.y * 5}deg) rotateY(${mousePos.x * 5}deg)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.2s ease-out",
      }}
      className={cn(
        "relative p-8 transition-shadow duration-300",
        pkg.featured
          ? "bg-ivory shadow-xl ring-1 ring-gold-primary/30 md:-mt-4 md:mb-4 md:py-12"
          : "bg-cream/80 border border-charcoal/5 shadow-sm hover:shadow-md"
      )}
    >
      {/* Featured Badge */}
      {pkg.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="block border border-gold-primary bg-ivory px-5 py-1.5 font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
            Recommended
          </span>
        </div>
      )}

      {/* Tier Number */}
      <span className="font-accent text-[10px] uppercase tracking-[0.3em] text-gold-primary/40 mb-4 block">
        {pkg.tier}
      </span>

      {/* Title */}
      <h3 className="font-display text-2xl font-semibold text-charcoal">
        {pkg.name}
      </h3>
      <p className="font-accent text-xs uppercase tracking-[0.15em] text-slate mt-1">
        {pkg.tagline}
      </p>

      {/* Price */}
      <div className="mt-6 mb-8">
        <span className="font-accent text-xs text-slate">Starting from</span>
        <div className="font-display text-3xl font-bold text-charcoal mt-1">
          <AnimatedCounter
            target={pkg.startingPrice}
            prefix="₹"
            formatter={(v) => `${(v / 100000).toFixed(0)}L`}
          />
        </div>
      </div>

      {/* Inclusions */}
      <ul className="space-y-3 mb-8">
        {pkg.inclusions.map((item, i) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
            className="flex items-start gap-2.5 text-sm text-slate"
          >
            <Check size={16} className="mt-0.5 flex-shrink-0 text-gold-primary" />
            {item}
          </motion.li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className={cn(
          "w-full py-3.5 font-accent text-[11px] uppercase tracking-[0.2em] transition-all duration-500",
          pkg.featured
            ? "border border-gold-primary bg-transparent text-gold-primary hover:bg-gold-primary hover:text-midnight"
            : "border border-charcoal/20 bg-transparent text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-ivory"
        )}
      >
        Select Tier
      </button>
    </motion.div>
  );
}
