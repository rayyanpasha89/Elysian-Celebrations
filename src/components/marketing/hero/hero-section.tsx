"use client";

import { useCallback, useRef, type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Sparkles,
  Users2,
  WalletCards,
} from "lucide-react";
import { SectionEyebrow } from "@/components/marketing/shared/marketing-primitives";
import { MagneticButton } from "@/components/shared/magnetic-button";
import { MARKETING_IMAGES } from "@/lib/marketing-images";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const backgroundRibbonY = useTransform(scrollYProgress, [0, 1], [0, -86]);
  const foregroundMistY = useTransform(scrollYProgress, [0, 1], [0, 74]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.2]);
  const contentY = useTransform(scrollYProgress, [0, 0.45], [0, -32]);
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 72]);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const stageOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.72]);
  // Gentle tilt only — strong rotateX/Y was distorting the card's text.
  const stageScrollRotateX = useTransform(scrollYProgress, [0, 1], [7, 2]);
  const stageScrollRotateY = useTransform(scrollYProgress, [0, 1], [-8, -3]);
  const haloScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const scrollLineScale = useTransform(scrollYProgress, [0, 1], [0.2, 1]);
  const shouldAnimate = !prefersReducedMotion;
  const pointerRotateX = useMotionValue(0);
  const pointerRotateY = useMotionValue(0);
  const pointerGlowX = useMotionValue(50);
  const pointerGlowY = useMotionValue(46);
  const pointerGlowOpacity = useMotionValue(0);
  const smoothPointerRotateX = useSpring(pointerRotateX, {
    stiffness: 120,
    damping: 22,
    mass: 0.45,
  });
  const smoothPointerRotateY = useSpring(pointerRotateY, {
    stiffness: 120,
    damping: 22,
    mass: 0.45,
  });
  const stageGlow = useMotionTemplate`radial-gradient(440px circle at ${pointerGlowX}% ${pointerGlowY}%, rgba(232,213,176,0.28), rgba(201,169,110,0.1) 34%, transparent 68%)`;

  const handleStagePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!shouldAnimate) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;

      pointerRotateY.set((x - 0.5) * 9);
      pointerRotateX.set((0.5 - y) * 7);
      pointerGlowX.set(x * 100);
      pointerGlowY.set(y * 100);
      pointerGlowOpacity.set(1);
    },
    [
      pointerGlowOpacity,
      pointerGlowX,
      pointerGlowY,
      pointerRotateX,
      pointerRotateY,
      shouldAnimate,
    ]
  );

  const handleStagePointerLeave = useCallback(() => {
    pointerRotateX.set(0);
    pointerRotateY.set(0);
    pointerGlowX.set(50);
    pointerGlowY.set(46);
    pointerGlowOpacity.set(0);
  }, [
    pointerGlowOpacity,
    pointerGlowX,
    pointerGlowY,
    pointerRotateX,
    pointerRotateY,
  ]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden bg-midnight text-ivory"
    >
      <motion.div
        style={shouldAnimate ? { y: backgroundY } : undefined}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,213,176,0.18),transparent_35%),radial-gradient(circle_at_75%_20%,rgba(123,167,201,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(212,160,160,0.12),transparent_32%),linear-gradient(135deg,#10101b_0%,#161829_40%,#10131e_100%)]" />
        <motion.div
          style={shouldAnimate ? { scale: haloScale } : undefined}
          className="absolute right-[12%] top-[18%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.18),rgba(201,169,110,0.02)_60%,transparent_75%)] blur-3xl"
        />
        <motion.div
          style={shouldAnimate ? { y: backgroundRibbonY } : undefined}
          className="absolute left-[7%] top-[14%] h-[38rem] w-[14rem] -rotate-[24deg] rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(201,169,110,0.025)_44%,transparent_78%)] blur-[1px]"
        />
        <motion.div
          style={shouldAnimate ? { y: foregroundMistY } : undefined}
          className="absolute -bottom-32 right-[2%] h-[30rem] w-[52rem] rotate-[-8deg] rounded-full bg-[radial-gradient(ellipse,rgba(123,167,201,0.15),rgba(201,169,110,0.06)_42%,transparent_72%)] blur-3xl"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.12]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,26,46,0.04)_0%,rgba(26,26,46,0.2)_55%,rgba(26,26,46,0.85)_100%)]" />
        <div className="absolute inset-0 noise-dark" />
      </motion.div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-[1500px] gap-12 px-[var(--section-padding-x)] pb-16 pt-40 md:pb-20 md:pt-32 lg:grid-cols-[minmax(0,0.94fr)_minmax(420px,580px)] lg:items-center lg:gap-12 lg:py-[calc(var(--section-padding-y)*1.05)]">
        <motion.div
          style={shouldAnimate ? { opacity: contentOpacity, y: contentY } : undefined}
          className="max-w-3xl"
        >
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldAnimate
                ? { duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }
            }
            className="contents"
          >
            <SectionEyebrow
              label="Event Design, Reframed"
              tone="light"
              size="lg"
            />
          </motion.div>

          <HeroHeadline shouldAnimate={shouldAnimate} />

          <motion.p
            initial={shouldAnimate ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldAnimate
                ? { duration: 0.8, delay: 1.25, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }
            }
            className="mt-6 max-w-2xl font-heading text-lg leading-relaxed text-ivory/72 md:text-[1.28rem]"
          >
            Weddings, launches, galas, retreats — design any event that feels
            cinematic before a single guest arrives. Elysian connects
            atmosphere, budget, vendors, and the run-of-show into one
            beautifully resolved world.
          </motion.p>

          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldAnimate
                ? { duration: 0.8, delay: 1.45, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }
            }
            className="mt-7 grid max-w-2xl grid-cols-3 gap-3"
          >
            <LayerProofCard
              index="01"
              title="Define"
              copy="Event type, days, dates, and time blocks."
            />
            <LayerProofCard
              index="02"
              title="Compose"
              copy="Food, venue, decor, vendors, guests, and tasks."
            />
            <LayerProofCard
              index="03"
              title="Finalize"
              copy="Readiness checks before the event goes live."
            />
          </motion.div>

          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldAnimate
                ? { duration: 0.8, delay: 1.7, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }
            }
            className="mt-8 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <MagneticButton href="#destinations" className="px-10 py-4 text-sm">
              Map our destinations
            </MagneticButton>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-3 font-accent text-[11px] uppercase tracking-[0.24em] text-ivory/68 transition-colors hover:text-gold-primary"
            >
              Walk the five acts
              <span className="h-px w-10 bg-current transition-all duration-500 group-hover:w-16" />
            </a>
          </motion.div>

        </motion.div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 40 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldAnimate
              ? { duration: 1.1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0 }
          }
          style={
            shouldAnimate
              ? { opacity: stageOpacity, scale: stageScale, y: stageY }
              : undefined
          }
          className="relative hidden items-center justify-center lg:flex"
        >
          <div className="relative mx-auto w-full max-w-[480px] px-6 lg:mt-4">
            <div className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10 rounded-[4rem] bg-[radial-gradient(circle_at_48%_28%,rgba(232,213,176,0.18),transparent_68%)] blur-2xl" />
            <motion.div
              aria-hidden
              animate={
                shouldAnimate
                  ? { rotate: [0, 8, 0], scale: [1, 1.04, 1] }
                  : undefined
              }
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -right-2 top-2 h-44 w-44 rounded-full border border-gold-primary/18 bg-[conic-gradient(from_140deg,transparent,rgba(201,169,110,0.18),transparent_45%,rgba(123,167,201,0.14),transparent_78%)] opacity-80 blur-[0.2px]"
            />
            <div
              className="relative"
              onPointerMove={shouldAnimate ? handleStagePointerMove : undefined}
              onPointerLeave={shouldAnimate ? handleStagePointerLeave : undefined}
              style={{ perspective: "1800px" }}
            >
              <motion.div
                aria-hidden
                style={
                  shouldAnimate
                    ? { background: stageGlow, opacity: pointerGlowOpacity }
                    : undefined
                }
                className="pointer-events-none absolute -inset-12 z-0 rounded-[4rem] blur-2xl"
              />
              <motion.div
                style={{
                  rotateX: stageScrollRotateX,
                  rotateY: stageScrollRotateY,
                  transformStyle: "preserve-3d",
                }}
                className="relative z-10"
              >
                <motion.div
                  style={{
                    rotateX: smoothPointerRotateX,
                    rotateY: smoothPointerRotateY,
                    transformStyle: "preserve-3d",
                  }}
                  className="relative"
                >
                  <BlueprintPlane />

                  <div
                    className="absolute -left-9 top-[22%] w-[39%]"
                    style={{ transform: "translateZ(54px) rotateZ(-4deg)" }}
                  >
                    <motion.div
                      animate={shouldAnimate ? { y: [0, -8, 0] } : undefined}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <PhotoPlane
                        eyebrow="Lakefront setting"
                        title="A visual language, not a logistics sheet."
                        image={MARKETING_IMAGES.hero.venue}
                      />
                    </motion.div>
                  </div>

                  <div
                    className="absolute -right-4 top-[8%] w-[42%]"
                    style={{ transform: "translateZ(78px) rotateZ(3deg)" }}
                  >
                    <motion.div
                      animate={shouldAnimate ? { y: [0, 10, 0] } : undefined}
                      transition={{
                        duration: 9,
                        delay: 0.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <StageSignalCard />
                    </motion.div>
                  </div>

                  <div
                    className="relative"
                    style={{ transform: "translateZ(96px)" }}
                  >
                    <MainStageCard />
                  </div>

                  <FloatingTag
                    className="-left-4 top-[39%]"
                    delay={1.5}
                    shouldAnimate={shouldAnimate}
                  >
                    Venue matched
                  </FloatingTag>
                  <FloatingTag
                    className="-right-2 bottom-12"
                    delay={1.9}
                    shouldAnimate={shouldAnimate}
                  >
                    Final checklist
                  </FloatingTag>
                </motion.div>
              </motion.div>
            </div>
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
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={shouldAnimate ? { delay: 2.8, duration: 1 } : { duration: 0 }}
        className="absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 lg:block"
      >
        <motion.div
          animate={shouldAnimate ? { y: [0, 8, 0] } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3 motion-reduce:animate-none"
        >
          <span className="font-accent text-[10px] uppercase tracking-[0.3em] text-ivory/34">
            Scroll
          </span>
          <div className="relative h-10 w-px overflow-hidden bg-ivory/10">
            <motion.div
              style={shouldAnimate ? { scaleY: scrollLineScale } : undefined}
              className="h-full origin-top bg-gradient-to-b from-gold-primary/90 to-transparent"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function HeroHeadline({ shouldAnimate }: { shouldAnimate: boolean }) {
  const line1 = "Design Events";
  const line2 = "In Three Dimensions";

  return (
    <h1
      className="mt-6 font-display font-bold leading-[0.95] text-ivory"
      style={{ fontSize: "clamp(3rem, 5.8vw, 5.8rem)" }}
      aria-label={`${line1} ${line2}`}
    >
      <span aria-hidden="true">
        <AnimatedLine text={line1} delay={0.45} shouldAnimate={shouldAnimate} />
        <br />
        <AnimatedLine
          text={line2}
          delay={0.8}
          shouldAnimate={shouldAnimate}
          className="text-gold-primary"
        />
      </span>
    </h1>
  );
}

function AnimatedLine({
  text,
  delay,
  shouldAnimate,
  className,
}: {
  text: string;
  delay: number;
  shouldAnimate: boolean;
  className?: string;
}) {
  const words = text.split(" ");

  return (
    <span className={cn("inline-flex flex-wrap gap-x-[0.28em]", className)}>
      {words.map((word, wordIndex) => (
        <span
          key={`${text}-${wordIndex}`}
          className="inline-flex overflow-hidden pb-[0.08em]"
        >
          <motion.span
            initial={shouldAnimate ? { opacity: 0, y: "32%" } : false}
            animate={{ opacity: 1, y: "0%" }}
            transition={{
              duration: shouldAnimate ? 0.55 : 0,
              delay: shouldAnimate ? delay + wordIndex * 0.07 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
            style={{ transformOrigin: "bottom center" }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function LayerProofCard({
  index,
  title,
  copy,
}: {
  index: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="group relative overflow-hidden border border-white/10 bg-white/[0.035] p-3.5 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-gold-primary/35 hover:bg-white/[0.055]">
      <div className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/10 opacity-0 blur-xl transition-all duration-700 group-hover:left-full group-hover:opacity-100" />
      <div className="absolute inset-x-0 top-0 h-px bg-gold-primary/20 transition-colors duration-500 group-hover:bg-gold-primary/55" />
      <p className="font-accent text-[9px] uppercase tracking-[0.24em] text-gold-light/78">
        {index}
      </p>
      <h3 className="mt-2.5 font-display text-lg leading-none text-ivory sm:text-xl">
        {title}
      </h3>
      <p className="mt-2.5 hidden text-xs leading-relaxed text-ivory/62 sm:block">
        {copy}
      </p>
    </div>
  );
}

function FloatingTag({
  children,
  className,
  delay,
  shouldAnimate,
}: {
  children: ReactNode;
  className: string;
  delay: number;
  shouldAnimate: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute z-20 whitespace-nowrap border border-white/10 bg-midnight/72 px-4 py-2 font-accent text-[10px] uppercase tracking-[0.18em] text-ivory/80 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl motion-reduce:animate-none",
        className
      )}
      style={{ transform: "translateZ(148px)" }}
    >
      <motion.div
        animate={shouldAnimate ? { y: [0, -8, 0] } : undefined}
        transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function BlueprintPlane() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-8 -right-12 h-[22rem] w-[22rem] overflow-hidden border border-white/10 bg-white/[0.035] shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      style={{ transform: "translateZ(-92px) rotateZ(10deg)" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(232,213,176,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(232,213,176,0.12)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
      <div className="absolute inset-8 border border-gold-primary/18" />
      <div className="absolute left-10 top-10 h-28 w-28 rounded-full border border-gold-primary/20" />
      <div className="absolute bottom-12 right-10 h-16 w-36 border border-info/18" />
      <div className="absolute left-8 top-1/2 h-px w-64 -rotate-12 bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent" />
    </div>
  );
}

function StageSignalCard() {
  return (
    <div className="relative overflow-hidden border border-white/12 bg-midnight/78 p-4 text-ivory shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/60 to-transparent" />
      <p className="font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light">
        Budget pulse
      </p>
      <p className="mt-2 font-display text-xl leading-tight">
        Spend bands stay visible
      </p>
      <div className="mt-4 grid gap-1.5">
        {[68, 46, 82].map((width, index) => (
          <div key={width} className="h-1.5 overflow-hidden bg-white/10">
            <div
              className={cn(
                "h-full",
                index === 2 ? "bg-gold-primary/80" : "bg-ivory/45"
              )}
              style={{ width: `${width}%` }}
            />
          </div>
        ))}
      </div>
    </div>
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
    <div className="relative overflow-hidden border border-white/10 bg-midnight text-ivory shadow-[0_30px_90px_rgba(0,0,0,0.26)]">
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

const MAIN_STAGE_LAYER_ROWS = [
  {
    label: "Definition",
    value: "3 days · 9 blocks",
    detail: "Name, date, venue, flow",
    tone: "bg-gold-primary/12 text-gold-dark",
  },
  {
    label: "Requirements",
    value: "Food · Decor · Photo",
    detail: "Only chosen needs are shown",
    tone: "bg-info/10 text-info",
  },
  {
    label: "Finalization",
    value: "82% ready",
    detail: "Open gaps become next actions",
    tone: "bg-success/10 text-success",
  },
] as const;

const MAIN_STAGE_VENDOR_PICKS = [
  "Saffron feast",
  "House of petals",
  "The story room",
] as const;

function MainStageCard() {
  return (
    <div className="relative overflow-hidden border border-white/15 bg-[linear-gradient(145deg,rgba(250,247,242,0.97),rgba(245,240,232,0.9))] text-charcoal shadow-[0_42px_140px_rgba(0,0,0,0.34)]">
      <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-28px_70px_rgba(26,26,46,0.07)]" />
      <div className="relative h-28 border-b border-charcoal/8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.08), rgba(17,24,39,0.56)), url(${MARKETING_IMAGES.hero.tablescape})`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(232,213,176,0.28),transparent_34%)]" />
        <div className="absolute left-6 top-4 border border-ivory/14 bg-midnight/42 px-3 py-2 text-ivory backdrop-blur-md">
          <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light">
            Live planner preview
          </p>
          <p className="mt-1 text-sm text-ivory/84">
            Venue, vendors, and run-of-show in one frame
          </p>
        </div>
        <div className="absolute bottom-4 right-5 flex items-center gap-2 border border-ivory/14 bg-ivory/14 px-3 py-2 text-ivory backdrop-blur-md">
          <CheckCircle2 className="h-3.5 w-3.5 text-gold-light" />
          <span className="font-accent text-[9px] uppercase tracking-[0.16em]">
            6 checks
          </span>
        </div>
      </div>
      <div className="relative border-b border-charcoal/8 px-5 py-3">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Elysian operating stack
        </p>
        <h3 className="mt-1.5 font-display text-xl">From vision to locked plan</h3>
      </div>

      <div className="relative grid gap-3 px-5 py-4">
        <div className="grid gap-2.5">
          {MAIN_STAGE_LAYER_ROWS.map((row, index) => (
            <div
              key={row.label}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border border-charcoal/8 bg-white/76 p-2.5 shadow-[0_10px_30px_rgba(26,26,46,0.045)]"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full font-accent text-[10px] tracking-[0.14em]",
                  row.tone
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                    {row.label}
                  </p>
                  <p className="text-xs font-medium text-charcoal">{row.value}</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate">
                  {row.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-charcoal/8 bg-cream/70 p-3.5">
            <div className="flex items-center gap-2 text-gold-dark">
              <MapPin className="h-4 w-4" />
              <p className="font-accent text-[10px] uppercase tracking-[0.18em]">
                Venue anchor
              </p>
            </div>
            <p className="mt-2.5 font-display text-xl leading-tight">
              Leela Palace Udaipur
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate">
              Capacity, destination, amenities, and price cues surface before the
              user types a thing.
            </p>
          </div>
          <div className="border border-charcoal/8 bg-white/72 p-3.5">
            <div className="flex items-center gap-2 text-gold-dark">
              <Sparkles className="h-4 w-4" />
              <p className="font-accent text-[10px] uppercase tracking-[0.18em]">
                Vendor package picks
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {MAIN_STAGE_VENDOR_PICKS.map((vendor) => (
                <div
                  key={vendor}
                  className="flex items-center justify-between gap-3 border border-charcoal/6 bg-cream/55 px-3 py-2"
                >
                  <span className="text-sm capitalize text-charcoal">
                    {vendor}
                  </span>
                  <span className="font-accent text-[8px] uppercase tracking-[0.16em] text-slate">
                    Selected
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border border-charcoal/8 bg-white/70 px-4 py-3">
          <MiniStageMetric icon={Users2} label="Guests" value="240" />
          <span className="h-8 w-px bg-charcoal/10" />
          <MiniStageMetric icon={WalletCards} label="Spend" value="Estimated" />
          <span className="h-8 w-px bg-charcoal/10" />
          <MiniStageMetric icon={CalendarDays} label="Flow" value="Mapped" />
        </div>
      </div>
    </div>
  );
}

function MiniStageMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users2;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-slate">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <p className="font-accent text-[9px] uppercase tracking-[0.16em]">
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-sm text-charcoal">{value}</p>
    </div>
  );
}
