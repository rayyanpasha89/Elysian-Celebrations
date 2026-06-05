"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { SectionHeader } from "@/components/marketing/shared/marketing-primitives";
import { cn } from "@/lib/utils";

type TierName = "Intimate" | "Grand" | "Royal";

const tiers: {
  name: TierName;
  tagline: string;
  mood: string;
  tier: string;
  startingPrice: number;
  featured: boolean;
  image: string;
}[] = [
  {
    name: "Intimate",
    tagline: "Essential Elegance",
    mood: "For focused gatherings with a highly considered finish",
    tier: "01",
    startingPrice: 1500000,
    featured: false,
    image:
      "https://images.unsplash.com/photo-1506014299253-3725319c7749?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Grand",
    tagline: "Full Curation",
    mood: "For a complete, multi-moment programme with one clear thread",
    tier: "02",
    startingPrice: 3500000,
    featured: true,
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Royal",
    tagline: "Bespoke Luxury",
    mood: "For flagship events that need full design direction",
    tier: "03",
    startingPrice: 7500000,
    featured: false,
    image:
      "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1200&q=80",
  },
];

const eventTypes = [
  { key: "weddings", label: "Weddings", blurb: "Multi-day weekends, rituals, and receptions." },
  { key: "corporate", label: "Corporate", blurb: "Launches, conferences, award nights, offsites." },
  { key: "social", label: "Social & Galas", blurb: "Milestones, anniversaries, and gala nights." },
  { key: "retreats", label: "Retreats", blurb: "Leadership, wellness, and brand retreats." },
] as const;

type EventTypeKey = (typeof eventTypes)[number]["key"];

// Inclusions adapt per event type — same tiers, tailored scope.
const inclusionsByType: Record<EventTypeKey, Record<TierName, string[]>> = {
  weddings: {
    Intimate: [
      "Venue coordination",
      "Curated decor & floral",
      "Photography (1 lead)",
      "Catering coordination",
      "Day-of management",
      "Guest list support",
    ],
    Grand: [
      "Premium venue selection",
      "Full decor & design",
      "Photo + video team",
      "Multi-event catering",
      "Hair & makeup",
      "Entertainment & DJ",
      "End-to-end coordination",
      "Budget management",
    ],
    Royal: [
      "Exclusive luxury venues",
      "Bespoke design direction",
      "Celebrity photo + film",
      "Gourmet multi-cuisine",
      "Signature beauty team",
      "Live performances & MC",
      "Travel & logistics",
      "Dedicated planner pod",
      "Pre-event shoot",
      "Honeymoon coordination",
    ],
  },
  corporate: {
    Intimate: [
      "Venue sourcing",
      "Brand-aligned styling",
      "Photography (1 lead)",
      "Catering & breaks",
      "Run-of-show management",
      "Guest registration",
    ],
    Grand: [
      "Premium venue + AV",
      "Stage & set design",
      "Photo + video team",
      "Multi-session catering",
      "Speaker & host coordination",
      "Networking & entertainment",
      "End-to-end production",
      "Budget management",
    ],
    Royal: [
      "Flagship venues",
      "Bespoke stage & brand world",
      "Film crew + livestream",
      "Gourmet F&B programme",
      "Keynote & talent booking",
      "Awards & gala production",
      "Delegate travel & logistics",
      "Dedicated production pod",
      "Press & content kit",
      "Sponsor & VIP coordination",
    ],
  },
  social: {
    Intimate: [
      "Venue coordination",
      "Themed decor & floral",
      "Photography (1 lead)",
      "Catering coordination",
      "Host & flow management",
      "Guest list support",
    ],
    Grand: [
      "Premium venue selection",
      "Full theme & design",
      "Photo + video team",
      "Multi-course catering",
      "Hair & makeup",
      "Entertainment & DJ",
      "End-to-end coordination",
      "Budget management",
    ],
    Royal: [
      "Exclusive venues",
      "Bespoke theme world",
      "Celebrity photo + film",
      "Gourmet multi-cuisine",
      "Signature beauty team",
      "Live acts & emcee",
      "Travel & logistics",
      "Dedicated planner pod",
      "Surprise-moment design",
      "After-party production",
    ],
  },
  retreats: {
    Intimate: [
      "Property sourcing",
      "Calm-space styling",
      "Photography (1 lead)",
      "Meals & wellness breaks",
      "Daily run-of-show",
      "Rooming support",
    ],
    Grand: [
      "Premium property & spaces",
      "Experience design",
      "Photo + video team",
      "Curated dining programme",
      "Facilitator coordination",
      "Activities & excursions",
      "End-to-end coordination",
      "Budget management",
    ],
    Royal: [
      "Private estates",
      "Bespoke experience arc",
      "Film crew + recap reel",
      "Gourmet & wellness cuisine",
      "Speaker & coach booking",
      "Adventure & spa programme",
      "Transfer & travel logistics",
      "Dedicated host pod",
      "Wellbeing concierge",
      "Off-site excursions",
    ],
  },
};

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
  subtitle = "Pick the kind of event, then every tier reshapes its scope — same editorial intent, the exact mix of design, logistics, and support your programme needs.",
}: PackageSectionProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });
  const [activeType, setActiveType] = useState<EventTypeKey>("weddings");
  const activeBlurb = eventTypes.find((type) => type.key === activeType)?.blurb;

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
            className="relative mb-12"
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

        {/* Event-type selector */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-10 flex flex-col items-center gap-3"
        >
          <div className="flex flex-wrap justify-center gap-2">
            {eventTypes.map((type) => {
              const active = type.key === activeType;
              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setActiveType(type.key)}
                  aria-pressed={active}
                  className={cn(
                    "border px-4 py-2.5 font-accent text-[11px] uppercase tracking-[0.18em] transition-colors",
                    active
                      ? "border-gold-primary bg-gold-primary/12 text-charcoal"
                      : "border-charcoal/12 bg-ivory/70 text-slate hover:border-gold-primary/45 hover:text-charcoal"
                  )}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
          {activeBlurb ? (
            <motion.p
              key={activeType}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm text-slate"
            >
              {activeBlurb}
            </motion.p>
          ) : null}
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-8 md:grid-cols-3"
        >
          {tiers.map((pkg) => (
            <PackageCard
              key={pkg.name}
              pkg={pkg}
              inclusions={inclusionsByType[activeType][pkg.name]}
              activeType={activeType}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PackageCard({
  pkg,
  inclusions,
  activeType,
}: {
  pkg: (typeof tiers)[number];
  inclusions: string[];
  activeType: EventTypeKey;
}) {
  const headingId = `pkg-${pkg.name}`;
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleMobileInclusions = isExpanded ? inclusions : inclusions.slice(0, 4);
  const hiddenInclusionCount = Math.max(inclusions.length - 4, 0);

  const renderInclusion = (item: string, i: number) => (
    <motion.li
      key={item}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04, duration: 0.35 }}
      className="flex items-start gap-2.5 text-sm leading-relaxed text-slate"
    >
      <span aria-hidden className="mt-0.5 flex-shrink-0 text-gold-primary">
        <Check size={16} />
      </span>
      {item}
    </motion.li>
  );

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
      <article aria-labelledby={headingId}>
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
                <h3
                  id={headingId}
                  className="mt-2 font-display text-3xl leading-none text-ivory"
                >
                  {pkg.name}
                </h3>
                <p className="mt-2 font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light/85">
                  {pkg.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ivory/78">{pkg.mood}</p>
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

          {/* Re-key by event type so inclusions fade in when the tab changes. */}
          <ul key={`${activeType}-m`} className="grid gap-3 md:hidden">
            {visibleMobileInclusions.map(renderInclusion)}
          </ul>
          {hiddenInclusionCount > 0 ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((current) => !current)}
              className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary transition-colors duration-300 hover:text-gold-dark md:hidden"
            >
              {isExpanded ? "Show fewer inclusions" : `+ ${hiddenInclusionCount} more inclusions`}
            </button>
          ) : null}
          <ul key={`${activeType}-d`} className="hidden gap-3 md:grid">
            {inclusions.map(renderInclusion)}
          </ul>

          <Link
            href={`/contact?tier=${pkg.name.toLowerCase()}&type=${activeType}`}
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
      </article>
    </motion.div>
  );
}
