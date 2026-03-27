"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp } from "@/animations/variants";
import { editorialBorderButtonClass } from "@/components/auth/auth-styles";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

export function CTASection() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.3 });

  return (
    <section className="noise-dark relative overflow-hidden bg-midnight py-[var(--section-padding-y)]">
      {/* Multi-layer atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 40%, rgba(201,169,110,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(201,169,110,0.06) 0%, transparent 45%)",
          }}
        />
        {/* Horizontal accent lines */}
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-gold-primary/10 to-transparent" />
        <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-gold-primary/10 to-transparent" />
      </div>

      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-3xl px-[var(--section-padding-x)] text-center"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <p className="font-accent mb-6 text-[11px] uppercase tracking-[0.3em] text-gold-primary">
            Let&apos;s Talk
          </p>
          <h2
            className="font-display mb-6 font-bold text-ivory"
            style={{ fontSize: "var(--text-display)" }}
          >
            Every Detail,
            <br />
            <span className="text-gold-primary">Intentional</span>
          </h2>
          <p className="font-heading mx-auto mb-10 max-w-md text-lg font-light text-ivory/60">
            Tell us your vision. We&apos;ll show you what&apos;s possible.
          </p>
          <div className="flex flex-col items-center justify-center gap-8 sm:flex-row">
            <Link href="/contact" className={editorialBorderButtonClass}>
              Get in Touch
            </Link>
            <Link
              href="/#packages"
              className={cn(
                "group font-accent text-[11px] uppercase tracking-[0.2em] text-ivory/50 transition-colors hover:text-gold-primary",
              )}
            >
              View Packages
              <span className="mt-2 block h-[1px] w-0 bg-gold-primary transition-all duration-500 group-hover:w-full" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
