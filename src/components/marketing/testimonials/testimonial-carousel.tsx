"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Sparkles, Star } from "lucide-react";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    coupleName: "Priya & Arjun",
    destination: "Udaipur",
    quote:
      "Elysian turned our Udaipur weekend into something that felt composed from the first call. The lakeside ceremony, rooftop dinner, and guest flow all felt intentional, calm, and beautifully timed.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
    highlight: "Lakeside ceremony with rooftop evening flow",
  },
  {
    id: 2,
    coupleName: "Meera & Karthik",
    destination: "Goa",
    quote:
      "The budget system changed everything for us. We could see where the money was going, make decisions faster, and still keep the atmosphere elegant. It felt clear instead of overwhelming.",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
    highlight: "Budget clarity before guest count decisions drifted",
  },
  {
    id: 3,
    coupleName: "Ananya & Rahul",
    destination: "Jaipur",
    quote:
      "Deeksha and Nithin treated the wedding like a creative production, not a checklist. The result was royal without feeling formal, and personal without losing polish.",
    image:
      "https://images.unsplash.com/photo-1529634806980-85c3dd4b45b2?auto=format&fit=crop&w=1400&q=80",
    highlight: "Editorial direction that still felt deeply personal",
  },
  {
    id: 4,
    coupleName: "Sneha & Vikram",
    destination: "Kerala",
    quote:
      "What stood out most was how seamlessly everything connected. Venue, vendor team, and guest movement all felt like one story, which made the whole weekend feel effortless.",
    image:
      "https://images.unsplash.com/photo-1519302959554-a75be0afc82f?auto=format&fit=crop&w=1400&q=80",
    highlight: "Backwater ceremony with seamless guest movement",
  },
  {
    id: 5,
    coupleName: "Riya & Aditya",
    destination: "Bali",
    quote:
      "Planning internationally sounded stressful, but the coordination was incredibly grounded. We always knew what came next, which made the celebration feel calm and fully considered.",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80",
    highlight: "Cross-border planning with a calm planning surface",
  },
];

const trustSignals = [
  "Clear planning cadence",
  "Vendor fit over vendor noise",
  "Budget visibility before it becomes pressure",
];

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 6500);

    return () => clearInterval(timer);
  }, []);

  const currentTestimonial = testimonials[current];
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section
      id="gallery"
      className="noise-dark relative overflow-hidden bg-midnight py-[var(--section-padding-y)]"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(201,169,110,0.08) 0%, transparent 48%), radial-gradient(ellipse at 80% 20%, rgba(123,167,201,0.08) 0%, transparent 38%), linear-gradient(180deg, rgba(16,16,27,1) 0%, rgba(14,15,25,0.96) 100%)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent" />

      <div
        ref={ref}
        className="relative z-10 mx-auto grid max-w-7xl gap-10 px-[var(--section-padding-x)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col justify-between border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.24)] backdrop-blur-2xl md:p-8"
        >
          <div>
            <p className="font-accent text-[11px] uppercase tracking-[0.32em] text-gold-primary">
              Love Stories
            </p>
            <h2
              className="mt-5 max-w-xl font-display font-bold leading-[0.94] text-ivory"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Proof that the planning can feel as considered as the wedding itself.
            </h2>
            <p className="mt-5 max-w-xl font-heading text-lg font-light leading-relaxed text-ivory/72">
              Couples come to us for clarity, taste, and calm execution. These stories reflect the
              real outcome: less noise, stronger direction, and a weekend that feels intentional in
              every frame.
            </p>

            <div className="mt-8 grid gap-3">
              {trustSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ivory/74"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-gold-primary/20 bg-gold-primary/10 text-gold-light">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  {signal}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <TrustCard label="Planning tone" value="Editorial" />
            <TrustCard label="Guest experience" value="Calm" />
            <TrustCard label="Budget clarity" value="Visible" />
          </div>
        </motion.div>

        <div className="grid gap-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_35px_120px_rgba(0,0,0,0.28)]"
          >
            <div className="absolute inset-0">
              <motion.div
                key={currentTestimonial.id}
                initial={{ scale: 1.04, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.04, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(16,16,27,0.16), rgba(16,16,27,0.84)), url(${currentTestimonial.image})`,
                }}
              />
            </div>

            <div className="relative grid min-h-[38rem] gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)]">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 border border-white/12 bg-midnight/42 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-gold-light backdrop-blur-md">
                    <Quote className="h-3.5 w-3.5" />
                    Client note
                  </div>
                  <p className="font-accent text-[10px] uppercase tracking-[0.28em] text-ivory/58">
                    {current + 1}/{testimonials.length}
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-3xl"
                  >
                    <div className="mb-8 h-px w-16 bg-gradient-to-r from-gold-primary/60 to-transparent" />
                    <blockquote className="font-heading text-2xl font-light leading-[1.8] text-ivory/86 md:text-[1.6rem]">
                      {currentTestimonial.quote}
                    </blockquote>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <StatPill label="Couple" value={currentTestimonial.coupleName} />
                  <StatPill label="Destination" value={currentTestimonial.destination} />
                  <StatPill label="Focus" value={currentTestimonial.highlight} />
                </div>
              </div>

              <div className="flex h-full flex-col justify-between border border-white/10 bg-midnight/45 p-4 backdrop-blur-md md:p-5">
                <div className="relative overflow-hidden border border-white/10 bg-black/20">
                  <div
                    className="min-h-[17rem] bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(16,16,27,0.08), rgba(16,16,27,0.68)), url(${currentTestimonial.image})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,169,110,0.2),transparent_42%)]" />
                  <div className="absolute left-4 top-4 border border-ivory/12 bg-midnight/55 px-3 py-2 text-ivory backdrop-blur-md">
                    <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light">
                      Signature moment
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ivory/84">
                      {currentTestimonial.highlight}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniTrustCard
                      eyebrow="Trust signal"
                      title="Budget and direction aligned"
                      body="The planning surface stayed readable even as the event grew more layered."
                    />
                    <MiniTrustCard
                      eyebrow="Delivery"
                      title="Calm on the day"
                      body="The weekend moved in sequence instead of reacting to every small change."
                    />
                  </div>
                  <div className="border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-light">
                      What the couple noticed
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ivory/72">
                      Less back-and-forth, more confidence, and a final result that looked as good as
                      it felt to plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-between gap-4">
            <div className="hidden flex-1 items-center gap-2 md:flex">
              {testimonials.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i === current ? "bg-gold-primary" : "bg-white/12 hover:bg-white/24"
                  )}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={prev}
                className="flex h-11 w-11 items-center justify-center border border-white/12 bg-white/[0.03] text-ivory/62 transition-all hover:border-gold-primary/45 hover:bg-gold-primary/10 hover:text-gold-light"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2 border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-ivory/54">
                <Star className="h-3.5 w-3.5 text-gold-primary" />
                Auto-advancing story reel
              </div>

              <button
                type="button"
                onClick={next}
                className="flex h-11 w-11 items-center justify-center border border-white/12 bg-white/[0.03] text-ivory/62 transition-all hover:border-gold-primary/45 hover:bg-gold-primary/10 hover:text-gold-light"
                aria-label="Next testimonial"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light">
        {label}
      </p>
      <p className="mt-2 text-sm text-ivory/82">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-ivory/48">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ivory/82">{value}</p>
    </div>
  );
}

function MiniTrustCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light">
        {eyebrow}
      </p>
      <p className="mt-2 font-display text-lg text-ivory">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ivory/68">{body}</p>
    </div>
  );
}
