"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { SectionHeader } from "@/components/marketing/shared/marketing-primitives";
import { cn } from "@/lib/utils";

const packages = [
  {
    name: "Intimate",
    tagline: "Essential Elegance",
    mood: "For smaller gatherings with a highly considered finish",
    tier: "01",
    startingPrice: 1500000,
    featured: false,
    image:
      "https://images.unsplash.com/photo-1506014299253-3725319c7749?auto=format&fit=crop&w=1200&q=80",
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
    mood: "For a complete multi-moment celebration with one clear thread",
    tier: "02",
    startingPrice: 3500000,
    featured: true,
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
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
    mood: "For destination weekends that need full design direction",
    tier: "03",
    startingPrice: 7500000,
    featured: false,
    image:
      "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1200&q=80",
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
  eyebrow = "Curated offerings",
  title = "Packages designed like a collection, not a price list.",
  subtitle =
    "Every tier starts with a clear editorial shape, then expands into the exact mix of design, logistics, and celebration support your weekend needs.",
}: PackageSectionProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });

  return (
    <section
      id="packages"
      className="relative overflow-hidden bg-cream py-[var(--section-padding-y)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(201,169,110,0.08),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(123,167,201,0.07),transparent_24%),linear-gradient(180deg,rgba(250,247,242,1)_0%,rgba(245,240,232,0.92)_100%)]" />
      <div ref={ref} className="mx-auto max-w-7xl px-[var(--section-padding-x)]">
        {showHeader && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative mb-16"
          >
            <SectionHeader
              chapter="04"
              eyebrow={eyebrow}
              title={title}
              intro={subtitle}
              align="center"
            />
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
  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        "group relative overflow-hidden p-0 transition-all duration-500",
        pkg.featured
          ? "bg-ivory shadow-[0_36px_100px_rgba(26,26,46,0.14)] ring-1 ring-gold-primary/30 hover:shadow-[0_44px_120px_rgba(26,26,46,0.18)] md:-mt-4 md:mb-4"
          : "border border-charcoal/5 bg-cream/80 shadow-[0_18px_60px_rgba(26,26,46,0.06)] hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(26,26,46,0.1)]"
      )}
    >
      <div className="relative">
        <div
          className="min-h-[200px] bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.12), rgba(17,24,39,0.72)), url(${pkg.image})`,
          }}
        >
          <div className="flex h-full min-h-[200px] flex-col justify-between p-5 text-ivory">
            <div className="flex items-start justify-between gap-4">
              {pkg.featured ? (
                <span className="border border-gold-primary/55 bg-gold-primary/20 px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.22em] text-gold-light backdrop-blur-md">
                  Recommended
                </span>
              ) : (
                <span />
              )}
              <div className="text-right">
                <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light/85">
                  Starting from
                </p>
                <p className="mt-1 font-display text-xl text-ivory">
                  <AnimatedCounter
                    target={pkg.startingPrice}
                    prefix="₹"
                    formatter={(v) => `${(v / 100000).toFixed(0)}L`}
                  />
                </p>
              </div>
            </div>

            <div className="max-w-[20rem]">
              <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-light/80">
                Tier {pkg.tier}
              </p>
              <h3 className="mt-2 font-display text-3xl leading-none text-ivory">
                {pkg.name}
              </h3>
              <p className="mt-2 font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light/85">
                {pkg.tagline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ivory/78">
                {pkg.mood}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 border-b border-charcoal/8 pb-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            Curated for
          </p>
          <p className="max-w-[13rem] text-right text-sm leading-relaxed text-charcoal/78">
            {pkg.mood}
          </p>
        </div>

        <ul className="grid gap-3">
          {pkg.inclusions.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-slate"
            >
              <Check size={16} className="mt-0.5 flex-shrink-0 text-gold-primary" />
              {item}
            </motion.li>
          ))}
        </ul>

        <Link
          href={`/contact?tier=${pkg.name.toLowerCase()}`}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 py-3.5 text-center font-accent text-[11px] uppercase tracking-[0.2em] transition-all duration-500",
            pkg.featured
              ? "border border-gold-primary bg-transparent text-gold-primary hover:bg-gold-primary hover:text-midnight"
              : "border border-charcoal/20 bg-transparent text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-ivory"
          )}
        >
          Shape this tier with us
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
