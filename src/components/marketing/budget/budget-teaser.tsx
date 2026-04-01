"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, WalletCards, Layers3 } from "lucide-react";
import { fadeLeft, fadeRight } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { MagneticButton } from "@/components/shared/magnetic-button";
import { formatCurrency } from "@/lib/utils";

const budgetBreakdown = [
  { label: "Venue & Hospitality", percent: 35, color: "#C9A96E" },
  { label: "Decor & Design", percent: 20, color: "#D4A0A0" },
  { label: "Catering", percent: 15, color: "#9CAF88" },
  { label: "Photography & Video", percent: 12, color: "#7BA7C9" },
  { label: "Entertainment", percent: 8, color: "#D4A843" },
  { label: "Others", percent: 10, color: "#6B7280" },
];

const budgetNotes = [
  {
    icon: WalletCards,
    title: "Budget architecture",
    body: "Set the frame first, then decide where the details deserve to expand.",
  },
  {
    icon: Sparkles,
    title: "Creative priority",
    body: "Protect the atmosphere before the spend begins to drift into noise.",
  },
  {
    icon: Layers3,
    title: "Control points",
    body: "Keep quotes, actuals, and paid amounts visible in one planning rhythm.",
  },
];

const budgetHeroImage =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80";

export function BudgetTeaser() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });
  const [guestCount, setGuestCount] = useState(150);
  const estimatedTotal = guestCount * 15000;

  return (
    <section className="relative overflow-hidden bg-ivory py-[var(--section-padding-y)]">
      {/* Atmospheric depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 72% 18%, rgba(201,169,110,0.08) 0%, transparent 46%), radial-gradient(ellipse at 18% 78%, rgba(123,167,201,0.06) 0%, transparent 42%), linear-gradient(180deg,rgba(250,247,242,1)_0%,rgba(245,240,232,0.9)_100%)",
        }}
      />
      <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />

      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]"
      >
        <div className="grid gap-16 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:items-center">
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <p className="mb-4 font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
              Investment Planning
            </p>
            <h2
              className="mb-6 font-display font-bold leading-[0.96] text-charcoal"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Shape the budget
              <br />
              <span className="text-gold-primary">before the details scatter.</span>
            </h2>
            <div className="mb-6 h-[1px] w-12 bg-gradient-to-r from-gold-primary/40 to-transparent" />
            <p className="mb-8 max-w-xl font-heading text-lg font-light leading-relaxed text-slate">
              This is the planning surface where the celebration becomes legible:
              target allocations, real quotes, and visible spend move together so
              the experience stays intentional instead of improvised.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {budgetNotes.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="border border-charcoal/8 bg-white/70 p-4 shadow-[0_18px_50px_rgba(26,26,46,0.05)] backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center border border-gold-primary/18 bg-gold-primary/10 text-gold-dark">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-4 font-display text-lg text-charcoal">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border border-gold-primary/12 bg-ivory/70 p-5 shadow-[0_18px_60px_rgba(26,26,46,0.05)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary/55">
                    Directional split
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate">
                    A visual guide to where the budget usually needs the most attention.
                  </p>
                </div>
                <span className="border border-gold-primary/15 bg-gold-primary/8 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                  Live preview
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
                <DonutChart data={budgetBreakdown} isInView={isInView} />
                <div className="grid flex-1 gap-3">
                  {budgetBreakdown.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate">{item.label}</span>
                        <span className="ml-auto font-accent text-xs text-charcoal">
                          {item.percent}%
                        </span>
                      </div>
                      <div className="h-[3px] overflow-hidden bg-charcoal/8">
                        <div
                          className="h-full"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <div className="overflow-hidden border border-gold-primary/15 bg-cream shadow-[0_28px_100px_rgba(26,26,46,0.12)]">
              <div
                className="relative min-h-[230px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.14), rgba(17,24,39,0.68)), url(${budgetHeroImage})`,
                }}
              >
                <div className="absolute left-5 top-5 max-w-[14rem] border border-white/12 bg-midnight/35 px-4 py-3 text-ivory backdrop-blur-md">
                  <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-light">
                    Planning canvas
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ivory/80">
                    Let the guest count shape the frame, then refine the allocation with intent.
                  </p>
                </div>
                <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-3">
                  {[
                    `${guestCount} guests`,
                    formatCurrency(estimatedTotal),
                    "Quote-aware planning",
                  ].map((item) => (
                    <div
                      key={item}
                      className="border border-white/12 bg-midnight/45 px-3 py-2 text-center text-ivory backdrop-blur-md"
                    >
                      <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light/85">
                        {item === `${guestCount} guests` ? "Guest frame" : item === formatCurrency(estimatedTotal) ? "Current estimate" : "Workflow"}
                      </p>
                      <p className="mt-1 text-sm text-ivory/82">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-7 md:p-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-accent text-[10px] uppercase tracking-[0.3em] text-gold-primary/55">
                      Interactive preview
                    </span>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-charcoal">
                      Quick estimate
                    </h3>
                  </div>
                  <span className="border border-gold-primary/15 bg-gold-primary/8 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                    Live
                  </span>
                </div>

                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="font-accent text-xs uppercase tracking-[0.15em] text-slate">
                      Guest count
                    </label>
                    <span className="font-display text-2xl font-bold text-charcoal">
                      {guestCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={10}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="h-[2px] w-full appearance-none bg-gold-light/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:bg-gold-primary [&::-webkit-slider-thumb]:shadow-[var(--shadow-gold)]"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-accent text-slate/50">
                    <span>50</span>
                    <span>500</span>
                  </div>
                </div>

                <div className="mb-6 border border-gold-primary/12 bg-ivory p-6 text-center shadow-[0_18px_50px_rgba(26,26,46,0.05)]">
                  <p className="mb-2 font-accent text-xs uppercase tracking-[0.2em] text-slate">
                    Estimated starting from
                  </p>
                  <div className="font-display text-4xl font-bold text-charcoal">
                  <AnimatedCounter
                    target={estimatedTotal}
                    duration={0.8}
                    formatter={(val) => formatCurrency(val)}
                  />
                </div>
                  <p className="mt-2 text-xs text-slate/60">
                    A directional estimate based on the current guest frame.
                  </p>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  {budgetNotes.map(({ icon: Icon, title }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 border border-charcoal/8 bg-white/72 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center border border-gold-primary/18 bg-gold-primary/10 text-gold-dark">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-snug text-charcoal">{title}</p>
                    </div>
                  ))}
                </div>

                <MagneticButton href="/client/budget" className="w-full justify-center gap-2 text-xs">
                  Build your full budget
                  <ArrowRight size={14} />
                </MagneticButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// === SVG Donut Chart ===
function DonutChart({
  data,
  isInView,
}: {
  data: typeof budgetBreakdown;
  isInView: boolean;
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    const percents = data.map((s) => s.percent);
    return data.map((segment, i) => {
      const cumBefore = percents.slice(0, i).reduce((a, b) => a + b, 0);
      const strokeDasharray = (segment.percent / 100) * circumference;
      const strokeDashoffset = -(cumBefore / 100) * circumference;
      return { segment, strokeDasharray, strokeDashoffset };
    });
  }, [data, circumference]);

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
      {arcs.map(({ segment, strokeDasharray, strokeDashoffset }, i) => (
        <motion.circle
          key={segment.label}
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={segment.color}
          strokeWidth="20"
          strokeDasharray={`${strokeDasharray} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
