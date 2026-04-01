"use client";

import { motion } from "framer-motion";
import { Sparkles, MapPin, UsersRound } from "lucide-react";
import { fadeLeft, fadeRight, staggerContainer, staggerItem } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const stats = [
  { label: "Couples", value: 150, suffix: "+" },
  { label: "Destinations", value: 7 },
  { label: "Vendors", value: 200, suffix: "+" },
  { label: "Years", value: 5, suffix: "+" },
];

const principles = [
  {
    icon: Sparkles,
    title: "Editorial clarity",
    body: "Every decision should feel composed before it feels expensive.",
  },
  {
    icon: MapPin,
    title: "Location-first planning",
    body: "Destination, guest movement, and atmosphere are designed together.",
  },
  {
    icon: UsersRound,
    title: "Vendor chemistry",
    body: "The right team is not just skilled, it is aligned with the tone of the wedding.",
  },
];

const portraitImage =
  "https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&w=1200&q=80";
const detailImageOne =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80";
const detailImageTwo =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";

export function FoundersSection() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-ivory py-[var(--section-padding-y)]"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 18% 22%, rgba(201,169,110,0.08) 0%, transparent 34%), radial-gradient(ellipse at 82% 20%, rgba(123,167,201,0.06) 0%, transparent 28%), radial-gradient(ellipse at 50% 100%, rgba(212,160,160,0.05) 0%, transparent 30%)",
        }}
      />

      <div ref={ref} className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-center">
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative"
          >
            <div className="relative grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="relative overflow-hidden border border-charcoal/8 bg-midnight shadow-[0_28px_90px_rgba(26,26,46,0.12)]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.05), rgba(17,24,39,0.22)), url(${portraitImage})`,
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(17,24,39,0.16)_50%,rgba(17,24,39,0.76)_100%)]" />
                <div className="absolute left-5 top-5 border border-ivory/15 bg-midnight/45 px-3 py-2 text-ivory backdrop-blur-md">
                  <p className="font-accent text-[9px] uppercase tracking-[0.28em] text-gold-light">
                    Founders
                  </p>
                  <p className="mt-1 font-display text-2xl">Deeksha & Nithin</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-ivory">
                  <p className="max-w-sm text-sm leading-relaxed text-ivory/76">
                    A planning studio built around taste, restraint, and the calm needed to run a
                    high-stakes weekend with precision.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div
                  className="min-h-[220px] overflow-hidden border border-charcoal/8 bg-cover bg-center shadow-[0_20px_60px_rgba(26,26,46,0.08)]"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.06), rgba(17,24,39,0.22)), url(${detailImageOne})`,
                  }}
                />
                <div
                  className="min-h-[180px] overflow-hidden border border-charcoal/8 bg-cover bg-center shadow-[0_20px_60px_rgba(26,26,46,0.08)]"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.04), rgba(17,24,39,0.22)), url(${detailImageTwo})`,
                  }}
                >
                  <div className="flex h-full items-end p-4">
                    <div className="max-w-[12rem] border border-ivory/15 bg-midnight/55 p-3 text-ivory backdrop-blur-md">
                      <p className="font-accent text-[9px] uppercase tracking-[0.24em] text-gold-light">
                        Studio note
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ivory/82">
                        We design for atmosphere first, then we build the planning system around it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 h-full w-full border border-gold-primary/15 -z-10" />
          </motion.div>

          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <p className="font-accent mb-4 text-[11px] uppercase tracking-[0.3em] text-gold-primary">
              About the studio
            </p>
            <h2
              className="font-display mb-6 font-bold leading-[0.96] text-charcoal"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Meet the people behind the planning.
            </h2>
            <div className="mb-6 h-[1px] w-14 bg-gradient-to-r from-gold-primary/55 to-transparent" />

            <div className="space-y-4 font-heading text-base font-light leading-relaxed text-slate">
              <p className="first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-4xl first-letter:font-bold first-letter:text-gold-primary">
                Elysian Celebrations is led by Deeksha and Nithin, who treat each wedding like a
                composed production: the mood, the logistics, the vendor mix, and the guest
                experience all need to belong to the same story.
              </p>
              <p>
                The result is not just a polished event. It is a weekend that feels clear in the
                lead-up, beautiful in motion, and calm when it matters most.
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="mt-8 grid gap-4 sm:grid-cols-3"
            >
              {principles.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    variants={staggerItem}
                    className="border border-charcoal/8 bg-white/75 p-4 shadow-[0_18px_50px_rgba(26,26,46,0.05)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center border border-gold-primary/18 bg-gold-primary/10 text-gold-dark">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-4 font-display text-lg text-charcoal">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate">{item.body}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <div className="border border-gold-primary/15 bg-cream/70 p-5 shadow-[0_20px_60px_rgba(26,26,46,0.05)]">
                <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary">
                  Why clients come to us
                </p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal">
                  They want a team that can protect the feeling, translate the taste, and keep the
                  planning surface under control.
                </p>
              </div>

              <div className="border border-charcoal/8 bg-white/80 p-5 shadow-[0_20px_60px_rgba(26,26,46,0.05)]">
                <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
                  Sign-off
                </p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal">
                  Built for couples who want clarity first and beauty that feels intentional.
                </p>
                <motion.svg
                  viewBox="0 0 200 50"
                  className="mt-4 h-12 w-auto text-gold-primary"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
                >
                  <motion.path
                    d="M10 35 C 30 10, 50 10, 60 25 S 80 45, 90 30 S 110 10, 130 25 S 150 45, 170 20 L 190 25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
                  />
                </motion.svg>
              </div>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {stats.map(({ label, value, suffix }) => (
                <motion.div
                  key={label}
                  variants={staggerItem}
                  className="border border-charcoal/8 bg-white/75 p-4"
                >
                  <div className="font-display text-3xl font-bold text-charcoal">
                    <AnimatedCounter target={value} suffix={suffix} />
                  </div>
                  <div className="mt-2 h-[1px] w-8 bg-gold-primary/40" />
                  <p className="mt-3 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
