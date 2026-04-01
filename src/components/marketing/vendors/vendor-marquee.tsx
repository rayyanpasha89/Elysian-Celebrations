"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { MARKETING_IMAGES } from "@/lib/marketing-images";

const vendorCategories = [
  "Photography",
  "Catering",
  "Music & DJ",
  "Decor & Design",
  "Makeup & Styling",
  "Travel & Logistics",
  "Venues",
  "Floral",
];

const marqueeRow = [...vendorCategories, ...vendorCategories];

const vendorProofCards = [
  {
    title: "Visual storytellers",
    detail:
      "Photographers and filmmakers who understand pace, light, and when restraint feels more luxurious than noise.",
    image: MARKETING_IMAGES.editorial.portrait,
    icon: Camera,
  },
  {
    title: "Atmosphere builders",
    detail:
      "Design, floral, and styling teams who can translate taste into a world guests immediately understand.",
    image: MARKETING_IMAGES.editorial.ceremony,
    icon: Sparkles,
  },
  {
    title: "Hospitality operators",
    detail:
      "Catering, service, and production partners who keep the weekend graceful while everything is in motion.",
    image: MARKETING_IMAGES.editorial.dinner,
    icon: UtensilsCrossed,
  },
];

const standards = [
  "Portfolio quality and communication style reviewed",
  "Destination-readiness and service composure checked",
  "Guest experience and planning rhythm considered",
];

export function VendorMarquee() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  return (
    <section
      id="vendors"
      className="noise relative overflow-hidden bg-cream py-[var(--section-padding-y)]"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 18% 12%, rgba(201,169,110,0.08) 0%, transparent 36%), radial-gradient(ellipse at 82% 12%, rgba(123,167,201,0.08) 0%, transparent 30%)",
        }}
      />

      <div ref={ref} className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start"
        >
          <div>
            <p className="mb-4 font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
              The network
            </p>
            <h2
              className="max-w-3xl font-display font-bold leading-[0.96] text-charcoal"
              style={{ fontSize: "var(--text-h1)" }}
            >
              The vendor roster should feel curated, not crowded.
            </h2>
            <p className="mt-5 max-w-xl font-heading text-lg font-light leading-relaxed text-slate">
              We look for teams who can protect atmosphere, timing, and guest
              experience, not just deliver a service line. The point is chemistry
              across the whole weekend.
            </p>

            <div className="mt-8 grid gap-3">
              {standards.map((standard) => (
                <div
                  key={standard}
                  className="flex items-center gap-3 border border-charcoal/8 bg-white/72 px-4 py-4 shadow-[0_18px_50px_rgba(26,26,46,0.05)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold-primary/18 bg-gold-primary/10 text-gold-dark">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <p className="text-sm leading-relaxed text-charcoal">{standard}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-gold-primary/35 px-5 py-3 font-accent text-[11px] uppercase tracking-[0.2em] text-gold-dark transition-all duration-300 hover:bg-gold-primary hover:text-midnight"
              >
                Start a curated brief
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {vendorProofCards.map(({ title, detail, image, icon: Icon }) => (
              <article
                key={title}
                className="overflow-hidden border border-charcoal/8 bg-white/75 shadow-[0_24px_70px_rgba(26,26,46,0.08)]"
              >
                <div
                  className="relative min-h-[19rem] bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.08), rgba(17,24,39,0.72)), url(${image})`,
                  }}
                >
                  <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center border border-ivory/14 bg-midnight/45 text-gold-light backdrop-blur-md">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-ivory">
                    <p className="font-display text-2xl">{title}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ivory/74">{detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </motion.div>

        <div className="mt-14 border-t border-charcoal/10 pt-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-slate">
              Disciplines in rotation
            </p>
            <p className="hidden text-sm text-slate/70 md:block">
              The wider roster spans planning, production, hospitality, beauty, and
              guest logistics.
            </p>
          </div>

          <div className="relative z-10 mb-4 overflow-hidden">
            <div className="flex animate-[marquee-left_30s_linear_infinite] hover:[animation-play-state:paused]">
              {marqueeRow.map((name, i) => (
                <VendorChip key={`r1-${i}`} name={name} index={i % vendorCategories.length} />
              ))}
            </div>
          </div>

          <div className="relative z-10 overflow-hidden">
            <div className="flex animate-[marquee-right_35s_linear_infinite] hover:[animation-play-state:paused]">
              {marqueeRow.map((name, i) => (
                <VendorChip
                  key={`r2-${i}`}
                  name={name}
                  variant="outlined"
                  index={i % vendorCategories.length}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-32 bg-gradient-to-r from-cream via-cream/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-32 bg-gradient-to-l from-cream via-cream/80 to-transparent" />

      <style jsx>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}

function VendorChip({
  name,
  variant = "filled",
  index,
}: {
  name: string;
  variant?: "filled" | "outlined";
  index: number;
}) {
  return (
    <div
      className={`group relative mx-2 flex-shrink-0 px-10 py-4 transition-all duration-500 ${
        variant === "filled"
          ? "border border-gold-light/20 bg-ivory hover:border-gold-primary/50"
          : "border border-charcoal/8 bg-transparent hover:border-gold-primary/40 hover:bg-ivory/60"
      }`}
    >
      <span className="absolute right-2 top-1 select-none font-display text-[10px] text-charcoal/[0.06]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="whitespace-nowrap font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal/80 transition-colors duration-300 group-hover:text-charcoal">
        {name}
      </span>
      <span className="absolute bottom-0 left-1/2 h-[1px] w-0 -translate-x-1/2 bg-gold-primary/50 transition-all duration-500 group-hover:w-3/4" />
    </div>
  );
}
