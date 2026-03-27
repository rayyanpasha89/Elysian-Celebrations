"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DestinationCard } from "./destination-card";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { useIsMobile } from "@/hooks/use-media-query";

const destinations = [
  { name: "Udaipur", country: "India", tagline: "The City of Lakes & Royal Romance", heroImage: "/images/destinations/udaipur.jpg", startingPrice: 2500000, venueCount: 24 },
  { name: "Jaipur", country: "India", tagline: "Pink City Grandeur & Regal Heritage", heroImage: "/images/destinations/jaipur.jpg", startingPrice: 2000000, venueCount: 18 },
  { name: "Goa", country: "India", tagline: "Sun-kissed Shores & Bohemian Bliss", heroImage: "/images/destinations/goa.jpg", startingPrice: 1500000, venueCount: 32 },
  { name: "Kerala", country: "India", tagline: "God's Own Country in Green & Gold", heroImage: "/images/destinations/kerala.jpg", startingPrice: 1800000, venueCount: 15 },
  { name: "Jim Corbett", country: "India", tagline: "Wilderness Luxury in the Foothills", heroImage: "/images/destinations/jim-corbett.jpg", startingPrice: 2200000, venueCount: 8 },
  { name: "Bali", country: "Indonesia", tagline: "Tropical Paradise & Sacred Beauty", heroImage: "/images/destinations/bali.jpg", startingPrice: 3500000, venueCount: 20 },
  { name: "Santorini", country: "Greece", tagline: "Aegean Sunsets & White-Washed Dreams", heroImage: "/images/destinations/santorini.jpg", startingPrice: 5000000, venueCount: 12 },
];

export function DestinationCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { ref: titleRef, isInView } = useInViewAnimation({ threshold: 0.3 });
  const isMobile = useIsMobile();

  useEffect(() => {
    // Skip GSAP horizontal scroll on mobile — use native horizontal scroll instead
    if (isMobile) return;

    let ctx: ReturnType<typeof import("gsap")["default"]["context"]> | null = null;

    async function initGSAP() {
      const gsapModule = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");

      const gsap = gsapModule.default;
      gsap.registerPlugin(ScrollTrigger);

      if (!containerRef.current || !trackRef.current) return;

      const track = trackRef.current;
      const totalScrollWidth = track.scrollWidth - window.innerWidth;

      ctx = gsap.context(() => {
        gsap.to(track, {
          x: -totalScrollWidth,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            pin: containerRef.current,
            pinSpacing: true,
            scrub: 1,
            end: () => `+=${totalScrollWidth}`,
            invalidateOnRefresh: true,
          },
        });
      }, containerRef);
    }

    // Defer init so React has committed the DOM
    const timeout = setTimeout(() => {
      requestAnimationFrame(() => initGSAP());
    }, 200);

    return () => {
      clearTimeout(timeout);
      ctx?.revert();
    };
  }, [isMobile]);

  return (
    <div id="destinations" ref={containerRef} className="noise-dark bg-midnight">
      {/* Section Header */}
      <div
        ref={titleRef}
        className="px-[var(--section-padding-x)] pt-[var(--section-padding-y)] pb-12"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary mb-4">
            Destinations
          </p>
          <h2
            className="font-display font-bold text-ivory"
            style={{ fontSize: "var(--text-display)" }}
          >
            Seven Destinations,
            <br />
            <span className="text-gold-primary">Endless Possibilities</span>
          </h2>
        </motion.div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={trackRef}
        className={`flex gap-6 px-[var(--section-padding-x)] pb-[var(--section-padding-y)] will-change-transform ${
          isMobile ? "overflow-x-auto snap-x snap-mandatory scrollbar-none" : ""
        }`}
      >
        {destinations.map((dest, i) => (
          <div key={dest.name} className={isMobile ? "snap-center" : ""}>
            <DestinationCard index={i} {...dest} />
          </div>
        ))}
      </div>
    </div>
  );
}
