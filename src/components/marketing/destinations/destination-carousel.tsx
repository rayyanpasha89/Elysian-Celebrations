"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DestinationCard } from "./destination-card";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { SectionHeader } from "@/components/marketing/shared/marketing-primitives";

const destinations = [
  {
    slug: "udaipur",
    name: "Udaipur",
    country: "India",
    tagline: "Lakeside palaces, mirrored light, and ceremony as theatre.",
    heroImage:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 2500000,
    venueCount: 24,
    vibe: "Royal lakefront",
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    country: "India",
    tagline: "Fort walls, courtyard banquets, and a richer sense of procession.",
    heroImage:
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 2000000,
    venueCount: 18,
    vibe: "Heritage grandeur",
  },
  {
    slug: "goa",
    name: "Goa",
    country: "India",
    tagline: "Golden-hour beaches, effortless luxury, and long-table celebrations.",
    heroImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 1500000,
    venueCount: 32,
    vibe: "Coastal escape",
  },
  {
    slug: "kerala",
    name: "Kerala",
    country: "India",
    tagline: "Backwater calm, lush palettes, and hospitality with a softer rhythm.",
    heroImage:
      "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 1800000,
    venueCount: 15,
    vibe: "Lush retreat",
  },
  {
    slug: "jim-corbett",
    name: "Jim Corbett",
    country: "India",
    tagline: "Forest light, open air dinners, and a quieter kind of drama.",
    heroImage:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 2200000,
    venueCount: 8,
    vibe: "Wild luxury",
  },
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    tagline: "Tropical ceremony language with sculpted landscapes and texture.",
    heroImage:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 3500000,
    venueCount: 20,
    vibe: "Island ritual",
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    tagline: "Sunset terraces, cliffside vows, and a cinematic horizon.",
    heroImage:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    startingPrice: 5000000,
    venueCount: 12,
    vibe: "Cliffside dream",
  },
] as const;

export function DestinationCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: titleRef, isInView } = useInViewAnimation({ threshold: 0.3 });
  const destinationCount = destinations.length;
  const venueCount = destinations.reduce((sum, destination) => sum + destination.venueCount, 0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const strongestEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!strongestEntry) return;

        const nextIndex = Number(
          (strongestEntry.target as HTMLElement).dataset.destinationIndex ?? 0
        );
        setActiveIndex(nextIndex);
      },
      {
        root: track,
        threshold: [0.45, 0.6, 0.75],
      }
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTrack = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const scrollAmount = 480;
    trackRef.current.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollToDestination = (index: number) => {
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  return (
    <section id="destinations" className="relative overflow-hidden bg-midnight">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(201,169,110,0.14),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(164,172,134,0.12),transparent_24%),linear-gradient(180deg,rgba(17,17,27,1)_0%,rgba(11,15,24,1)_100%)]" />
      <div className="absolute inset-0 noise-dark" />

      <div
        ref={titleRef}
        className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)] pt-[var(--section-padding-y)] pb-12"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="space-y-8"
        >
          <SectionHeader
            chapter="02"
            eyebrow="Destinations"
            title={
              <>
                Seven places,
                <br />
                <span className="text-gold-primary">
                  seven different atmospheres
                </span>
              </>
            }
            intro="Each destination is chosen for visual weight, guest comfort, vendor depth, and the kind of narrative it creates when the celebration needs to feel expensive, considered, and deeply personal."
            align="center"
            tone="light"
            className="max-w-4xl"
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Curated destinations"
              value={destinationCount}
              accent="gold"
            />
            <StatCard
              label="Venue possibilities"
              value={`${venueCount}+`}
              accent="sage"
            />
            <StatCard
              label="Vibes available"
              value="Royal to coastal"
              accent="rose"
            />
          </div>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="max-w-2xl text-sm leading-relaxed text-ivory/56">
            Scroll through destination scenes, each with a different emotional texture
            and planning cadence.
          </p>
          <div className="hidden items-center gap-3 lg:flex">
            <ScrollButton direction="left" onClick={() => scrollTrack("left")} />
            <ScrollButton direction="right" onClick={() => scrollTrack("right")} />
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative z-10 flex gap-5 overflow-x-auto px-[var(--section-padding-x)] pb-[var(--section-padding-y)] pt-2 snap-x snap-mandatory scrollbar-elysian-dark scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {destinations.map((dest, i) => (
          <div
            key={dest.name}
            ref={(node) => {
              cardRefs.current[i] = node;
            }}
            data-destination-index={i}
            className="snap-center md:snap-start"
          >
            <DestinationCard index={i} {...dest} />
          </div>
        ))}
        <div className="w-4 flex-shrink-0" aria-hidden />
      </div>

      <div className="relative z-10 -mt-12 flex justify-center gap-2 px-[var(--section-padding-x)] pb-12 md:hidden">
        {destinations.map((destination, i) => (
          <button
            key={destination.slug}
            type="button"
            aria-label={`Show ${destination.name}`}
            aria-current={activeIndex === i ? "true" : undefined}
            onClick={() => scrollToDestination(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === i ? "w-7 bg-gold-primary" : "w-1.5 bg-ivory/28"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "gold" | "sage" | "rose";
}) {
  const accentClass =
    accent === "gold"
      ? "from-gold-primary/25 via-gold-primary/8 to-transparent"
      : accent === "sage"
        ? "from-info/25 via-info/8 to-transparent"
        : "from-rose/25 via-rose/8 to-transparent";

  return (
    <div className="relative overflow-hidden border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentClass}`} />
      <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/42">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-ivory">{value}</p>
    </div>
  );
}

function ScrollButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex h-12 w-12 items-center justify-center border border-white/12 bg-white/[0.04] text-ivory/70 transition-all duration-300 hover:border-gold-primary/35 hover:bg-gold-primary/10 hover:text-gold-primary"
      aria-label={`Scroll ${direction}`}
    >
      {direction === "left" ? (
        <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
      ) : (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </button>
  );
}
