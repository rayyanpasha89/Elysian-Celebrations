"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";

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

// Doubled for seamless infinite loop
const marqueeRow = [...vendorCategories, ...vendorCategories];

export function VendorMarquee() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  return (
    <section id="vendors" className="noise relative overflow-hidden bg-cream py-[var(--section-padding-y)]">
      {/* Atmospheric gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(201,169,110,0.06) 0%, transparent 50%)",
        }}
      />

      {/* Header */}
      <div ref={ref} className="relative z-10 px-[var(--section-padding-x)] mb-16 text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary mb-4">
            The Network
          </p>
          <h2
            className="font-display font-bold text-charcoal"
            style={{ fontSize: "var(--text-display)" }}
          >
            Vetted. Trusted.<br className="hidden sm:block" /> Exceptional.
          </h2>
          <p className="mt-4 max-w-lg mx-auto font-heading text-lg font-light text-slate">
            Every vendor is personally interviewed before joining the Elysian network.
          </p>
          {/* Gold divider */}
          <div className="mx-auto mt-8 h-[1px] w-16 bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
        </motion.div>
      </div>

      {/* Marquee Row 1 — moves left */}
      <div className="relative z-10 mb-4 overflow-hidden">
        <div className="flex animate-[marquee-left_30s_linear_infinite] hover:[animation-play-state:paused]">
          {marqueeRow.map((name, i) => (
            <VendorChip key={`r1-${i}`} name={name} index={i % vendorCategories.length} />
          ))}
        </div>
      </div>

      {/* Marquee Row 2 — moves right */}
      <div className="relative z-10 overflow-hidden">
        <div className="flex animate-[marquee-right_35s_linear_infinite] hover:[animation-play-state:paused]">
          {marqueeRow.map((name, i) => (
            <VendorChip key={`r2-${i}`} name={name} variant="outlined" index={i % vendorCategories.length} />
          ))}
        </div>
      </div>

      {/* Edge Fades — wider for more editorial feel */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-cream via-cream/80 to-transparent z-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-cream via-cream/80 to-transparent z-20" />

      <style jsx>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
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
      className={`group relative flex-shrink-0 mx-2 px-10 py-4 transition-all duration-500
        ${variant === "filled"
          ? "bg-ivory border border-gold-light/20 hover:border-gold-primary/50"
          : "bg-transparent border border-charcoal/8 hover:border-gold-primary/40 hover:bg-ivory/60"
        }`}
    >
      {/* Ghost index */}
      <span className="absolute top-1 right-2 font-display text-[10px] text-charcoal/[0.06] select-none">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="font-accent text-[11px] uppercase tracking-[0.2em] text-charcoal/80 whitespace-nowrap transition-colors duration-300 group-hover:text-charcoal">
        {name}
      </span>
      {/* Bottom accent line on hover */}
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] w-0 bg-gold-primary/50 transition-all duration-500 group-hover:w-3/4" />
    </div>
  );
}
