"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, ShieldCheck } from "lucide-react";
import { fadeUp } from "@/animations/variants";
import { editorialBorderButtonClass } from "@/components/auth/auth-styles";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

const proofPoints = [
  "Budget clarity before vendor drift",
  "Creative fit without spreadsheet fatigue",
  "One calmer route from inquiry to weekend execution",
];

const closingFrames = [
  {
    label: "Budget",
    value: "Investment plan, not guesswork",
  },
  {
    label: "Vendors",
    value: "Curated by fit, tone, and timing",
  },
  {
    label: "Guest flow",
    value: "Designed for movement and ease",
  },
];

const closingImage =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80";

export function CTASection() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.3 });

  return (
    <section className="noise-dark relative overflow-hidden bg-midnight py-[var(--section-padding-y)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(201,169,110,0.18),transparent_28%),radial-gradient(circle_at_82%_50%,rgba(123,167,201,0.12),transparent_26%),linear-gradient(180deg,#10101b_0%,#151728_100%)]" />
        <div className="absolute left-[8%] right-[8%] top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/20 to-transparent" />
        <div className="absolute left-[8%] right-[8%] bottom-0 h-px bg-gradient-to-r from-transparent via-gold-primary/20 to-transparent" />
      </div>

      <div ref={ref} className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-8 border border-white/10 bg-white/[0.045] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.24)] backdrop-blur-2xl lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:p-8"
        >
          <div className="relative overflow-hidden border border-white/10 bg-white/[0.03] p-6 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(123,167,201,0.12),transparent_24%)]" />
            <div className="relative">
              <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
                Final Step
              </p>
              <h2
                className="mt-5 max-w-3xl font-display font-bold leading-[0.94] text-ivory"
                style={{ fontSize: "var(--text-display)" }}
              >
                Build the wedding with the calm of a studio, not the chaos of a spreadsheet.
              </h2>
              <p className="mt-5 max-w-2xl font-heading text-lg font-light leading-relaxed text-ivory/70">
                The point is not just a beautiful event. It is a planning experience that keeps the
                aesthetics high, the decisions clear, and the pressure off you.
              </p>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                {proofPoints.map((point) => (
                  <div
                    key={point}
                    className="border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-relaxed text-ivory/72"
                  >
                    {point}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className={editorialBorderButtonClass}>
                  Start the planning brief
                </Link>
                <Link
                  href="/#packages"
                  className="group inline-flex items-center gap-2 border border-gold-primary/35 px-5 py-3.5 font-accent text-[11px] uppercase tracking-[0.2em] text-gold-light transition-all duration-300 hover:bg-gold-primary hover:text-midnight"
                >
                  See the package architecture
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div
              className="relative min-h-[240px] overflow-hidden border border-white/10 bg-cover bg-center shadow-[0_24px_70px_rgba(0,0,0,0.2)]"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.1), rgba(17,24,39,0.72)), url(${closingImage})`,
              }}
            >
              <div className="absolute left-4 top-4 border border-ivory/14 bg-midnight/45 px-3 py-2 text-ivory backdrop-blur-md">
                <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-light">
                  Designed to convert
                </p>
                <p className="mt-1 font-display text-xl">One brief, one cleaner start</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {closingFrames.map((frame) => (
                    <div
                      key={frame.label}
                      className="border border-ivory/12 bg-midnight/62 p-3 backdrop-blur-md"
                    >
                      <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light">
                        {frame.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ivory/84">
                        {frame.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <Link
                href="/#how-it-works"
                className={cn(
                  "group flex items-center justify-between border border-white/10 px-5 py-4 text-sm text-ivory/74 transition-all duration-300 hover:border-gold-primary/35 hover:bg-gold-primary/8 hover:text-ivory"
                )}
              >
                <span>Review the planning flow</span>
                <ArrowUpRight className="h-4 w-4 text-gold-light transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/client"
                className={cn(
                  "group flex items-center justify-between border border-white/10 px-5 py-4 text-sm text-ivory/74 transition-all duration-300 hover:border-gold-primary/35 hover:bg-gold-primary/8 hover:text-ivory"
                )}
              >
                <span>Open the client workspace</span>
                <ArrowUpRight className="h-4 w-4 text-gold-light transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-gold-primary/20 bg-gold-primary/10 text-gold-light">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light">
                      Creative trust
                    </p>
                    <p className="mt-1 text-sm text-ivory/78">
                      A calmer hand on aesthetic decisions.
                    </p>
                  </div>
                </div>
              </div>
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-gold-primary/20 bg-gold-primary/10 text-gold-light">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light">
                      Planning control
                    </p>
                    <p className="mt-1 text-sm text-ivory/78">
                      Budget, guests, and bookings in one view.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="border border-gold-primary/15 bg-gold-primary/8 p-5 text-ivory"
            >
              <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light">
                Next step
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ivory/78">
                Tell us the destination, the scale, and the feeling. We will turn it into a planning
                system that looks as considered as the celebration itself.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-ivory/54">
                <span className="border border-white/10 px-3 py-2">Inquiry</span>
                <span className="border border-white/10 px-3 py-2">Budget</span>
                <span className="border border-white/10 px-3 py-2">Vendor brief</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
