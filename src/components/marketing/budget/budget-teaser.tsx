"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { fadeUp, fadeLeft, fadeRight } from "@/animations/variants";
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
            "radial-gradient(ellipse at 70% 20%, rgba(201,169,110,0.06) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 45%)",
        }}
      />
      <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />

      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]"
      >
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left — Copy + Donut Chart */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary mb-4">
              Budget Calculator
            </p>
            <h2
              className="font-display font-bold text-charcoal mb-6"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Plan Your Budget
              <br />
              <span className="text-gold-primary">With Full Clarity</span>
            </h2>
            {/* Gold divider */}
            <div className="mb-6 h-[1px] w-12 bg-gradient-to-r from-gold-primary/40 to-transparent" />
            <p className="font-heading text-lg font-light text-slate mb-8">
              No surprises, no hidden costs. Our interactive budget calculator
              lets you add, remove, and adjust every detail — seeing the impact
              on your total in real time.
            </p>

            {/* Mini Donut Chart */}
            <div className="flex items-center gap-8">
              <DonutChart data={budgetBreakdown} isInView={isInView} />
              <div className="space-y-2">
                {budgetBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-2 w-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate">{item.label}</span>
                    <span className="ml-auto font-accent text-xs text-charcoal">
                      {item.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — Interactive Demo */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <div className="relative bg-cream border border-gold-primary/15 p-8 shadow-lg">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 h-4 w-[1px] bg-gold-primary/30" />
              <div className="absolute top-0 left-0 h-[1px] w-4 bg-gold-primary/30" />
              <div className="absolute top-0 right-0 h-4 w-[1px] bg-gold-primary/30" />
              <div className="absolute top-0 right-0 h-[1px] w-4 bg-gold-primary/30" />
              <div className="absolute bottom-0 left-0 h-4 w-[1px] bg-gold-primary/30" />
              <div className="absolute bottom-0 left-0 h-[1px] w-4 bg-gold-primary/30" />
              <div className="absolute bottom-0 right-0 h-4 w-[1px] bg-gold-primary/30" />
              <div className="absolute bottom-0 right-0 h-[1px] w-4 bg-gold-primary/30" />

              <div className="mb-8">
                <span className="font-accent text-[10px] uppercase tracking-[0.3em] text-gold-primary/50">
                  Interactive
                </span>
                <h3 className="font-display text-xl font-semibold text-charcoal mt-1">
                  Quick Estimate
                </h3>
              </div>

              {/* Guest Count Slider */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-accent text-xs uppercase tracking-[0.15em] text-slate">
                    Guest Count
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
                  className="w-full h-[2px] appearance-none bg-gold-light/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:bg-gold-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[var(--shadow-gold)]"
                />
                <div className="flex justify-between text-[10px] font-accent text-slate/50 mt-1">
                  <span>50</span>
                  <span>500</span>
                </div>
              </div>

              {/* Estimated Total */}
              <div className="bg-ivory p-6 text-center mb-6">
                <p className="font-accent text-xs uppercase tracking-[0.2em] text-slate mb-2">
                  Estimated Starting From
                </p>
                <div className="font-display text-4xl font-bold text-charcoal">
                  <AnimatedCounter
                    target={estimatedTotal}
                    duration={0.8}
                    formatter={(val) => formatCurrency(val)}
                  />
                </div>
                <p className="text-xs text-slate/60 mt-2">
                  Based on average package pricing
                </p>
              </div>

              <MagneticButton className="w-full justify-center gap-2 text-xs">
                Build Your Full Budget
                <ArrowRight size={14} />
              </MagneticButton>
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
  let cumulativePercent = 0;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
      {data.map((segment, i) => {
        const strokeDasharray = (segment.percent / 100) * circumference;
        const strokeDashoffset = -(cumulativePercent / 100) * circumference;
        cumulativePercent += segment.percent;

        return (
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
        );
      })}
    </svg>
  );
}
