"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Check, Crown, Heart, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn, formatNumber } from "@/lib/utils";
import type { PackageTier } from "@/types/common";

const tierIconMap: Record<string, LucideIcon> = {
  Heart,
  Sparkles,
  Crown,
};

function TierIcon({ name, className }: { name: string; className?: string }) {
  const Icon = tierIconMap[name];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={1.35} aria-hidden />;
}

export function PackageTierCard({ tier }: { tier: PackageTier }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const [hovering, setHovering] = useState(false);
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const tiltEnabled = !prefersReducedMotion;
  const transform = useMotionTemplate`perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  const handleMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rotateY.set(px * 14);
      rotateX.set(-py * 14);
      setGlow({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
    },
    [rotateX, rotateY],
  );

  const handleLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setHovering(false);
    setGlow({ x: 50, y: 50 });
  }, [rotateX, rotateY]);

  const inner = (
    <motion.article
      ref={cardRef}
      style={tiltEnabled ? { transform } : undefined}
      onMouseMove={tiltEnabled ? handleMove : undefined}
      onMouseEnter={tiltEnabled ? () => setHovering(true) : undefined}
      onMouseLeave={tiltEnabled ? handleLeave : undefined}
      className={cn(
        "glass-light relative flex h-full flex-col overflow-hidden p-8 shadow-lg",
        tier.featured ? "rounded-xl" : "rounded-2xl",
        tier.featured && "ring-2 ring-gold-primary/30",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: tiltEnabled && hovering ? 0.14 : 0,
          background: `radial-gradient(520px circle at ${glow.x}% ${glow.y}%, rgba(201,169,110,0.35), transparent 55%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold-light/10 via-transparent to-cream/40" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.2em] text-gold-dark">{tier.level}</p>
          <h3 className="font-display mt-2 text-[length:var(--text-h2)] text-charcoal">{tier.name}</h3>
          <p className="font-heading mt-1 text-gold-primary">{tier.tagline}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cream/90 text-gold-dark shadow-inner">
          <TierIcon name={tier.icon} className="h-7 w-7" />
        </div>
      </div>

      <p className="font-sans relative mt-5 flex-1 text-[length:var(--text-body)] leading-relaxed text-slate">{tier.description}</p>

      <div className="relative mt-8 border-t border-gold-light/50 pt-6">
        <p className="font-heading text-xs uppercase tracking-wider text-slate">Starting at</p>
        <p className="font-display mt-1 text-3xl text-charcoal md:text-4xl">
          <AnimatedCounter
            target={tier.startingPrice}
            prefix="₹"
            formatter={(n) => formatNumber(n)}
            className="text-charcoal"
          />
          <span className="font-sans text-base font-normal text-slate"> + taxes</span>
        </p>
      </div>

      <ul className="relative mt-8 space-y-3">
        {tier.inclusions.map((line, i) =>
          prefersReducedMotion ? (
            <li key={line} className="font-sans flex gap-3 text-sm leading-snug text-charcoal">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-light/50 text-gold-dark">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              <span>{line}</span>
            </li>
          ) : (
            <motion.li
              key={line}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="font-sans flex gap-3 text-sm leading-snug text-charcoal"
            >
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 + 0.05, type: "spring", stiffness: 400, damping: 18 }}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-light/50 text-gold-dark"
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </motion.span>
              <span>{line}</span>
            </motion.li>
          ),
        )}
      </ul>
    </motion.article>
  );

  if (tier.featured) {
    return (
      <div className="overflow-hidden rounded-2xl p-[2px] shimmer-border shadow-xl">{inner}</div>
    );
  }

  return inner;
}
