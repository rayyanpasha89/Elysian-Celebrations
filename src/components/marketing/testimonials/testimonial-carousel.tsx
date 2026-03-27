"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    coupleName: "Priya & Arjun",
    destination: "Udaipur",
    quote: "Elysian turned our wildest Udaipur dreams into reality. Every detail was handled with such care — from the lakeside ceremony to the rooftop reception under the stars. We didn't have to worry about a single thing.",
  },
  {
    id: 2,
    coupleName: "Meera & Karthik",
    destination: "Goa",
    quote: "The budget calculator alone saved us weeks of back-and-forth. We could see exactly where every rupee was going, adjust in real time, and feel confident in our choices. The Goa sunset ceremony was pure magic.",
  },
  {
    id: 3,
    coupleName: "Ananya & Rahul",
    destination: "Jaipur",
    quote: "Deeksha and Nithin are not just planners — they become family. Their personal involvement made all the difference. Our Jaipur wedding felt like a royal celebration, yet intimately ours.",
  },
  {
    id: 4,
    coupleName: "Sneha & Vikram",
    destination: "Kerala",
    quote: "We wanted something unique — a backwaters ceremony followed by a hilltop reception. Elysian's vendor network in Kerala made it happen seamlessly. The photography team captured every emotion perfectly.",
  },
  {
    id: 5,
    coupleName: "Riya & Aditya",
    destination: "Bali",
    quote: "Planning an international destination wedding seemed daunting. Elysian handled visas, travel logistics, and local vendor coordination flawlessly. Our Bali wedding exceeded every expectation we had.",
  },
];

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section id="gallery" className="noise-dark relative overflow-hidden bg-midnight py-[var(--section-padding-y)]">
      {/* Atmospheric gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(201,169,110,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(201,169,110,0.04) 0%, transparent 45%)",
        }}
      />

      <div ref={ref} className="relative z-10 mx-auto max-w-4xl px-[var(--section-padding-x)] text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary mb-4">
            Love Stories
          </p>
          <h2
            className="font-display font-bold text-ivory mb-16"
            style={{ fontSize: "var(--text-display)" }}
          >
            Words From Our Couples
          </h2>
        </motion.div>

        {/* Large editorial quote mark */}
        <div className="mx-auto mb-8 font-display text-[120px] leading-[0.8] text-gold-primary/10 select-none">
          &ldquo;
        </div>

        {/* Carousel */}
        <div className="relative min-h-[250px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Quote */}
              <blockquote className="font-heading text-xl font-light italic leading-[1.8] text-ivory/70 md:text-2xl">
                {testimonials[current].quote}
              </blockquote>

              {/* Attribution */}
              <div className="mt-12">
                <div className="mx-auto mb-5 h-[1px] w-16 bg-gradient-to-r from-transparent via-gold-primary/50 to-transparent" />
                <p className="font-display text-lg font-semibold text-ivory tracking-wide">
                  {testimonials[current].coupleName}
                </p>
                <p className="font-accent text-[10px] uppercase tracking-[0.3em] text-gold-primary/60 mt-2">
                  {testimonials[current].destination}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-14 flex items-center justify-center gap-6">
          <button
            onClick={prev}
            className="flex h-10 w-10 items-center justify-center border border-ivory/15 text-ivory/40 transition-all hover:border-gold-primary/50 hover:text-gold-primary"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Progress dots — rectangular */}
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-[2px] transition-all duration-500",
                  i === current
                    ? "w-10 bg-gold-primary"
                    : "w-4 bg-ivory/15 hover:bg-ivory/30"
                )}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex h-10 w-10 items-center justify-center border border-ivory/15 text-ivory/40 transition-all hover:border-gold-primary/50 hover:text-gold-primary"
            aria-label="Next testimonial"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
