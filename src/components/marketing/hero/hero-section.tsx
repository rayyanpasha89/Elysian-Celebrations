"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarDays, Layers3, WalletCards } from "lucide-react";
import { MagneticButton } from "@/components/shared/magnetic-button";
import { MARKETING_IMAGES } from "@/lib/marketing-images";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.2]);
  const contentY = useTransform(scrollYProgress, [0, 0.45], [0, -48]);
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const stageRotateX = useTransform(scrollYProgress, [0, 1], [18, 8]);
  const stageRotateY = useTransform(scrollYProgress, [0, 1], [-18, -8]);
  const haloScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-midnight text-ivory"
    >
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,213,176,0.18),transparent_35%),radial-gradient(circle_at_75%_20%,rgba(123,167,201,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(212,160,160,0.12),transparent_32%),linear-gradient(135deg,#10101b_0%,#161829_40%,#10131e_100%)]" />
        <motion.div
          style={{ scale: haloScale }}
          className="absolute right-[12%] top-[18%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.18),rgba(201,169,110,0.02)_60%,transparent_75%)] blur-3xl"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.12]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,26,46,0.04)_0%,rgba(26,26,46,0.2)_55%,rgba(26,26,46,0.85)_100%)]" />
        <div className="absolute inset-0 noise-dark" />
      </motion.div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1500px] gap-14 px-[var(--section-padding-x)] py-[calc(var(--section-padding-y)*1.15)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,640px)] lg:items-center">
        <motion.div style={{ opacity: contentOpacity, y: contentY }} className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-accent text-xs uppercase tracking-[0.42em] text-gold-light"
          >
            Destination Weddings, Reframed
          </motion.p>

          <HeroHeadline />

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-2xl font-heading text-lg leading-relaxed text-ivory/72 md:text-[1.35rem]"
          >
            Build a destination wedding that feels cinematic before guests even
            arrive. We connect atmosphere, budget, vendors, and the weekend flow
            so the celebration reads like one beautifully resolved world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <MagneticButton href="#destinations" className="px-10 py-4 text-sm">
              Explore Destinations
            </MagneticButton>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-3 font-accent text-[11px] uppercase tracking-[0.24em] text-ivory/68 transition-colors hover:text-gold-primary"
            >
              See the planning flow
              <span className="h-px w-10 bg-current transition-all duration-500 group-hover:w-16" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            <SignalCard
              icon={Layers3}
              label="Creative direction"
              value="One spatial planning view"
            />
            <SignalCard
              icon={WalletCards}
              label="Budget control"
              value="Targets, quotes, actuals"
            />
            <SignalCard
              icon={CalendarDays}
              label="Event flow"
              value="Weekend mapped with intention"
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ y: stageY }}
          className="relative flex items-center justify-center"
        >
          <div
            className="relative w-full max-w-[620px]"
            style={{ perspective: "1800px" }}
          >
            <motion.div
              style={{
                rotateX: stageRotateX,
                rotateY: stageRotateY,
                transformStyle: "preserve-3d",
              }}
              className="relative mx-auto aspect-[1.02/0.92] w-full"
            >
              <div className="absolute left-[10%] top-[12%] h-[72%] w-[72%] rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] shadow-[0_60px_140px_rgba(0,0,0,0.35)] backdrop-blur-2xl" />
              <div className="absolute inset-[10%] rounded-[2.2rem] border border-gold-primary/18" />

              <FloatingTag className="left-[6%] top-[12%]" delay={1.5}>
                Vendor chemistry
              </FloatingTag>
              <FloatingTag className="right-[4%] top-[18%]" delay={1.8}>
                Budget runway
              </FloatingTag>
              <FloatingTag className="left-[12%] bottom-[10%]" delay={2.1}>
                Weekend flow
              </FloatingTag>

              <motion.div
                animate={{ y: [0, -10, 0], rotateZ: [-1.4, 1, -1.4] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[2%] top-[24%] w-[40%]"
                style={{ transform: "translateZ(120px)" }}
              >
                <PhotoPlane
                  eyebrow="Lakefront setting"
                  title="A visual language, not just a logistics sheet."
                  image={MARKETING_IMAGES.hero.venue}
                />
              </motion.div>

              <motion.div
                animate={{ y: [0, 12, 0], rotateZ: [1.5, -1, 1.5] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute right-[0%] top-[10%] w-[34%]"
                style={{ transform: "translateZ(190px)" }}
              >
                <PhotoPlane
                  eyebrow="Portrait rhythm"
                  title="Taste should read through every frame."
                  image={MARKETING_IMAGES.hero.couple}
                />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0], rotateZ: [-1, 1.2, -1] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
                className="absolute bottom-[14%] left-[9%] w-[31%]"
                style={{ transform: "translateZ(210px)" }}
              >
                <FeaturePlane
                  eyebrow="Budget architecture"
                  title="Keep the spend readable"
                  copy="Targets, quotes, and paid amounts stay visible while the design evolves."
                  accent="from-gold-primary/55 via-gold-light/15 to-transparent"
                  icon={WalletCards}
                />
              </motion.div>

              <motion.div
                animate={{ y: [0, -14, 0], rotateZ: [-1.4, 1.2, -1.4] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="absolute bottom-[5%] left-[24%] w-[58%]"
                style={{ transform: "translateZ(240px)" }}
              >
                <MainStageCard />
              </motion.div>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 top-1/2 h-[84%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/18"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1.2 }}
        className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 xl:block"
      >
        <span
          className="font-accent text-[9px] uppercase tracking-[0.5em] text-ivory/16"
          style={{ writingMode: "vertical-rl" }}
        >
          Spatial Planning Layer
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
        className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3"
        >
          <span className="font-accent text-[10px] uppercase tracking-[0.3em] text-ivory/34">
            Scroll
          </span>
          <div className="h-10 w-px bg-gradient-to-b from-gold-primary/70 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function HeroHeadline() {
  const line1 = "Design the";
  const line2 = "Wedding in Three Dimensions";

  return (
    <h1
      className="mt-6 font-display font-bold leading-[0.95] text-ivory"
      style={{ fontSize: "var(--text-hero)" }}
    >
      <AnimatedLine text={line1} delay={0.45} />
      <br />
      <AnimatedLine text={line2} delay={0.8} className="text-gold-primary" />
    </h1>
  );
}

function AnimatedLine({
  text,
  delay,
  className,
}: {
  text: string;
  delay: number;
  className?: string;
}) {
  const words = text.split(" ");

  return (
    <span
      className={cn("inline-flex flex-wrap gap-x-[0.25em]", className)}
    >
      {words.map((word, wordIndex) => (
        <span
          key={`${text}-${wordIndex}`}
          className="inline-flex overflow-hidden"
          style={{ perspective: "1000px" }}
        >
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={`${word}-${charIndex}`}
              initial={{ rotateX: 90, opacity: 0, y: "42%" }}
              animate={{ rotateX: 0, opacity: 1, y: "0%" }}
              transition={{
                duration: 0.6,
                delay: delay + (wordIndex * word.length + charIndex) * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block"
              style={{ transformOrigin: "bottom center" }}
            >
              {char}
            </motion.span>
          ))}
          <span className="inline-block w-[0.28em]" />
        </span>
      ))}
    </span>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-gold-primary/20 bg-gold-primary/10 text-gold-light">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/48">
            {label}
          </p>
          <p className="mt-1 text-sm text-ivory/86">{value}</p>
        </div>
      </div>
    </div>
  );
}

function FloatingTag({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className: string;
  delay: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "absolute z-20 border border-white/10 bg-white/[0.05] px-4 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-ivory/70 backdrop-blur-xl",
        className
      )}
      style={{ transform: "translateZ(320px)" }}
    >
      {children}
    </motion.div>
  );
}

function PhotoPlane({
  eyebrow,
  title,
  image,
}: {
  eyebrow: string;
  title: string;
  image: string;
}) {
  return (
    <div className="relative overflow-hidden border border-white/10 bg-midnight text-ivory shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,12,20,0.1), rgba(10,12,20,0.72)), url(${image})`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,169,110,0.18),transparent_35%)]" />
      <div className="relative flex min-h-[16rem] flex-col justify-end p-5">
        <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-light">
          {eyebrow}
        </p>
        <h3 className="mt-3 font-display text-2xl leading-tight text-ivory">
          {title}
        </h3>
      </div>
    </div>
  );
}

function FeaturePlane({
  eyebrow,
  title,
  copy,
  accent,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="relative overflow-hidden border border-white/10 bg-[rgba(250,247,242,0.92)] p-5 text-charcoal shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accent)} />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-charcoal/8 bg-charcoal/5 text-charcoal">
          <Icon className="h-4 w-4" />
        </div>
        <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
          {eyebrow}
        </p>
      </div>
      <h3 className="mt-4 font-display text-xl leading-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate">{copy}</p>
    </div>
  );
}

function MainStageCard() {
  return (
    <div className="overflow-hidden border border-white/12 bg-[linear-gradient(145deg,rgba(250,247,242,0.94),rgba(245,240,232,0.84))] text-charcoal shadow-[0_35px_120px_rgba(0,0,0,0.3)]">
      <div className="relative h-28 border-b border-charcoal/8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.08), rgba(17,24,39,0.56)), url(${MARKETING_IMAGES.hero.tablescape})`,
          }}
        />
        <div className="absolute left-6 top-4 border border-ivory/14 bg-midnight/42 px-3 py-2 text-ivory backdrop-blur-md">
          <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light">
            Tablescape direction
          </p>
          <p className="mt-1 text-sm text-ivory/84">Design, guests, and spend in one frame</p>
        </div>
      </div>
      <div className="border-b border-charcoal/8 px-6 py-4">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Elysian planning stack
        </p>
        <h3 className="mt-2 font-display text-2xl">From vision to execution</h3>
      </div>

      <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
        <div className="border border-charcoal/8 bg-white/70 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            Budget canvas
          </p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            Track target allocation, quoted spend, actuals, and paid line items in
            one drag-and-drop flow.
          </p>
        </div>
        <div className="border border-charcoal/8 bg-white/70 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            Event architecture
          </p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            Build the weekend programme as a designed sequence, not a scattered set
            of notes.
          </p>
        </div>
        <div className="border border-charcoal/8 bg-white/70 p-4 md:col-span-2">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            Vendor intelligence
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniStageMetric label="Creative fit" value="Aligned" />
            <MiniStageMetric label="Budget readiness" value="Visible" />
            <MiniStageMetric label="Weekend coverage" value="Mapped" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStageMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-charcoal/8 bg-cream/60 p-3">
      <p className="font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
        {label}
      </p>
      <p className="mt-2 text-sm text-charcoal">{value}</p>
    </div>
  );
}
