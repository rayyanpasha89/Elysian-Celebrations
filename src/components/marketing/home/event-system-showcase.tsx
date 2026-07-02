"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  CalendarDays,
  CircleDollarSign,
  ConciergeBell,
  Layers3,
  MapPinned,
  Sparkles,
} from "lucide-react";

import {
  SectionEyebrow,
  SectionHeader,
} from "@/components/marketing/shared/marketing-primitives";
import { MARKETING_IMAGES } from "@/lib/marketing-images";
import { cn } from "@/lib/utils";

const orbitLayers = [
  {
    eyebrow: "Layer 01",
    title: "Define the event world",
    body: "Event type, days, dates, time blocks, guests, and requirements become the first map.",
    icon: CalendarDays,
    position: "left-[8%] top-[12%]",
    tone: "gold",
  },
  {
    eyebrow: "Layer 02",
    title: "Compose every function",
    body: "Food, decor, media, logistics, and custom needs open only when that branch needs them.",
    icon: Layers3,
    position: "right-[6%] top-[18%]",
    tone: "info",
  },
  {
    eyebrow: "Layer 03",
    title: "Select real partners",
    body: "Vendor catalogues, menus, setups, inclusions, and add-ons replace empty typing.",
    icon: ConciergeBell,
    position: "left-[4%] bottom-[13%]",
    tone: "rose",
  },
  {
    eyebrow: "Layer 04",
    title: "Lock the spend story",
    body: "Estimates, quotes, paid amounts, and trade-offs stay synced to the event plan.",
    icon: CircleDollarSign,
    position: "right-[10%] bottom-[10%]",
    tone: "sage",
  },
] as const;

const scrollChapters = [
  {
    label: "Definition",
    title: "The couple builds the shape first.",
    copy: "No endless blank form. They pick the event type, day count, dates, time blocks, and what each block actually needs.",
    coreEyebrow: "Event core",
    coreTitle: "Structure before detail",
    coreRows: [
      ["Event type", "Selected"],
      ["Days + dates", "Mapped"],
      ["Time blocks", "Ready"],
    ],
    metric: "Layer 01",
  },
  {
    label: "Composition",
    title: "Every function becomes a branch.",
    copy: "Haldi, lunch, reception, conference session, after-party — each one opens its own scoped editor instead of crowding the page.",
    coreEyebrow: "Function map",
    coreTitle: "Branches unlock scoped steps",
    coreRows: [
      ["Day orbit", "6 nodes"],
      ["Function branches", "18 mapped"],
      ["Step tokens", "Scoped"],
    ],
    metric: "Layer 02",
  },
  {
    label: "Curation",
    title: "Vendors enter before menu typing.",
    copy: "Couples choose from real services, then customize the selected offering with dietary, decor, media, logistics, and special notes.",
    coreEyebrow: "Vendor curation",
    coreTitle: "Real offerings, then customization",
    coreRows: [
      ["Catering", "Menus"],
      ["Decor", "Setups"],
      ["Photo + music", "Packages"],
    ],
    metric: "Layer 03",
  },
  {
    label: "Readiness",
    title: "The platform reveals what is missing.",
    copy: "Budget, vendors, guests, logistics, tasks, and notes roll into a final readiness layer before the plan is treated as complete.",
    coreEyebrow: "Readiness engine",
    coreTitle: "Gaps become next actions",
    coreRows: [
      ["Budget sync", "Live"],
      ["Quote items", "Open"],
      ["Final checks", "82%"],
    ],
    metric: "Layer 04",
  },
] as const;

const scenePlanes = [
  {
    label: "Define",
    title: "Type · days · blocks",
    className: "left-[4%] top-[15%] rotate-[-10deg]",
    tone: "border-gold-primary/24 bg-gold-primary/[0.075]",
  },
  {
    label: "Map",
    title: "Functions orbit the day",
    className: "right-[2%] top-[22%] rotate-[8deg]",
    tone: "border-info/24 bg-info/[0.075]",
  },
  {
    label: "Curate",
    title: "Vendor catalogues first",
    className: "left-[8%] bottom-[18%] rotate-[7deg]",
    tone: "border-rose/24 bg-rose/[0.075]",
  },
  {
    label: "Close",
    title: "Budget + readiness",
    className: "right-[9%] bottom-[12%] rotate-[-6deg]",
    tone: "border-sage/24 bg-sage/[0.075]",
  },
] as const;

export function EventSystemShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const stageRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [16, 0, -10]);
  const stageRotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-18, 0, 12]);
  const stageY = useTransform(scrollYProgress, [0, 1], [70, -70]);
  const stageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.94]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 26]);
  const progressHeight = useTransform(scrollYProgress, [0.08, 0.88], ["0%", "100%"]);
  const connectorDraw = useTransform(scrollYProgress, [0.12, 0.82], [0, 1]);
  const haloX = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], ["20%", "72%", "28%", "78%"]);
  const haloY = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], ["20%", "24%", "72%", "70%"]);
  const activeChapter = scrollChapters[activeScene] ?? scrollChapters[0];

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!shouldAnimate) return;
    const nextScene = Math.max(
      0,
      Math.min(scrollChapters.length - 1, Math.round(latest * (scrollChapters.length - 1)))
    );
    setActiveScene((current) => (current === nextScene ? current : nextScene));
  });

  return (
    <section
      id="event-system"
      ref={sectionRef}
      className="noise relative overflow-hidden bg-[linear-gradient(180deg,#333d29_0%,#414833_48%,#f5f0e8_100%)] text-ivory"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,110,0.2),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(164,172,134,0.16),transparent_28%),radial-gradient(circle_at_50%_78%,rgba(212,160,160,0.12),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:88px_88px] opacity-[0.08]" />

      <motion.div
        aria-hidden
        className="absolute h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(232,213,176,0.18),rgba(201,169,110,0.05)_50%,transparent_72%)] blur-3xl"
        style={shouldAnimate ? { left: haloX, top: haloY } : { left: "20%", top: "20%" }}
      />

      <div className="relative z-10 mx-auto grid max-w-[1500px] gap-12 px-[var(--section-padding-x)] py-20 lg:min-h-[320vh] lg:grid-cols-[minmax(0,0.84fr)_minmax(620px,1.16fr)] lg:items-start lg:gap-14 lg:py-28">
        <div className="lg:sticky lg:top-24">
          <SectionHeader
            eyebrow="3D Planning Engine"
            title="The event becomes a spatial planning atelier."
            intro="Instead of sending people through flat forms, Elysian turns every celebration into a navigable world: days, functions, vendors, budgets, and readiness all move together."
            align="start"
            tone="light"
            titleMaxWidth="max-w-3xl"
          />

          <div className="mt-8 lg:hidden">
            <MobileSystemPreview />
          </div>

          <div className="mt-10 grid gap-5">
            {scrollChapters.map((chapter, index) => {
              const active = activeScene === index;
              return (
              <div
                key={chapter.label}
                className={cn(
                  "group grid grid-cols-[auto_minmax(0,1fr)] gap-4 border p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-500 hover:border-gold-primary/35",
                  active
                    ? "border-gold-primary/35 bg-gold-primary/[0.085]"
                    : "border-white/10 bg-white/[0.045]"
                )}
              >
                <div className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border font-accent text-[10px] uppercase tracking-[0.18em] transition-all duration-500",
                      active
                        ? "border-gold-light/50 bg-gold-primary/22 text-ivory shadow-[0_0_32px_rgba(201,169,110,0.28)]"
                        : "border-gold-primary/30 bg-gold-primary/12 text-gold-light"
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {index < scrollChapters.length - 1 ? (
                    <span className="mt-3 h-full min-h-12 w-px bg-gradient-to-b from-gold-primary/35 to-white/8" />
                  ) : null}
                </div>
                <div>
                  <SectionEyebrow
                    label={chapter.label}
                    tone="light"
                    size="sm"
                    className="text-gold-light/78"
                  />
                  <h3 className="mt-2 font-display text-2xl leading-tight text-ivory">
                    {chapter.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/68">
                    {chapter.copy}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="lg:sticky lg:top-28">
          <div className="relative min-h-[680px] overflow-hidden border border-white/10 bg-midnight/55 p-4 shadow-[0_50px_160px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8 lg:min-h-[740px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(201,169,110,0.14),transparent_40%),radial-gradient(circle_at_58%_62%,rgba(164,172,134,0.1),transparent_34%)]" />
            <div className="absolute left-6 top-6 z-20 border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
              <p className="font-accent text-[9px] uppercase tracking-[0.24em] text-gold-light">
                {activeChapter.metric} · {activeChapter.label}
              </p>
              <p className="mt-1 text-xs text-ivory/58">
                Scroll changes the spatial plan, not just the copy.
              </p>
            </div>

            <motion.div
              className="absolute right-6 top-6 z-20 h-32 w-px overflow-hidden bg-white/10"
              aria-hidden
            >
              <motion.span
                className="block w-full bg-gradient-to-b from-gold-light to-gold-primary"
                style={shouldAnimate ? { height: progressHeight } : { height: "100%" }}
              />
            </motion.div>

            <div className="relative z-10 flex min-h-[620px] items-center justify-center lg:min-h-[690px]">
              <div className="relative h-[560px] w-full max-w-[680px] md:h-[620px]" style={{ perspective: "1700px" }}>
                <motion.div
                  className="absolute inset-0"
                  style={
                    shouldAnimate
                      ? {
                          rotateX: stageRotateX,
                          rotateY: stageRotateY,
                          y: stageY,
                          scale: stageScale,
                          transformStyle: "preserve-3d",
                        }
                      : { transformStyle: "preserve-3d" }
                  }
                >
                  <motion.div
                    className="absolute inset-[9%] rounded-full border border-gold-primary/20"
                    style={shouldAnimate ? { rotate: ringRotate } : undefined}
                  />
                  <motion.div
                    className="absolute inset-[18%] rounded-full border border-white/10"
                    style={shouldAnimate ? { rotate: ringRotate } : undefined}
                  />
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                    viewBox="0 0 680 620"
                    aria-hidden
                  >
                    {[
                      "M340 310 C235 238 170 210 96 132",
                      "M340 310 C450 218 512 192 604 160",
                      "M340 310 C230 398 170 430 86 510",
                      "M340 310 C448 410 508 452 594 516",
                    ].map((path, index) => (
                      <motion.path
                        key={path}
                        d={path}
                        fill="none"
                        stroke={index === activeScene ? "rgba(232,213,176,0.72)" : "rgba(201,169,110,0.18)"}
                        strokeWidth={index === activeScene ? 1.6 : 0.9}
                        strokeDasharray="5 10"
                        style={shouldAnimate ? { pathLength: connectorDraw } : undefined}
                      />
                    ))}
                  </svg>
                  <div className="absolute left-1/2 top-1/2 h-px w-[82%] -translate-x-1/2 bg-gradient-to-r from-transparent via-gold-primary/25 to-transparent" />
                  <div className="absolute left-1/2 top-1/2 h-[82%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold-primary/20 to-transparent" />

                  {scenePlanes.map((plane, index) => (
                    <ScenePlane
                      key={plane.label}
                      plane={plane}
                      index={index}
                      active={activeScene === index}
                      shouldAnimate={shouldAnimate}
                    />
                  ))}

                  <div
                    className="absolute left-[54%] top-1/2 w-[min(78vw,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-gold-primary/30 bg-ivory text-charcoal shadow-[0_38px_120px_rgba(0,0,0,0.35)] md:w-[21.5rem]"
                    style={{ transform: "translate3d(-50%, -50%, 96px)" }}
                  >
                    <AnimatePresence mode="wait">
                      <CoreModelCard key={activeChapter.label} chapter={activeChapter} />
                    </AnimatePresence>
                  </div>

                  {orbitLayers.map((layer, index) => (
                    <OrbitCard
                      key={layer.title}
                      index={index}
                      layer={layer}
                      active={activeScene === index}
                      scrollYProgress={scrollYProgress}
                    />
                  ))}

                  <div
                    className="absolute left-1/2 top-[8%] hidden -translate-x-1/2 border border-white/10 bg-white/[0.055] px-4 py-3 text-center backdrop-blur-xl md:block"
                    style={{ transform: "translate3d(-50%, 0, 54px)" }}
                  >
                    <div className="flex items-center gap-2 text-gold-light">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="font-accent text-[9px] uppercase tracking-[0.2em]">
                        Live readiness
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ivory/62">
                      Missing pieces become the next action.
                    </p>
                  </div>

                  <div
                    className="absolute bottom-[7%] left-1/2 hidden -translate-x-1/2 border border-white/10 bg-white/[0.055] px-4 py-3 text-center backdrop-blur-xl md:block"
                    style={{ transform: "translate3d(-50%, 0, 44px)" }}
                  >
                    <div className="flex items-center gap-2 text-gold-light">
                      <MapPinned className="h-3.5 w-3.5" />
                      <span className="font-accent text-[9px] uppercase tracking-[0.2em]">
                        Destination aware
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ivory/62">
                      Venue fit, movement, and guest rhythm stay visible.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type OrbitLayer = (typeof orbitLayers)[number];
type ScrollChapter = (typeof scrollChapters)[number];
type ScenePlaneData = (typeof scenePlanes)[number];

function CoreModelCard({ chapter }: { chapter: ScrollChapter }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotateX: -8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -18, rotateX: 8, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative h-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg,rgba(51,61,41,0.04),rgba(51,61,41,0.66)),url(${MARKETING_IMAGES.hero.spatialAtelier})`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.22),transparent_42%)]" />
        <div className="absolute inset-x-5 bottom-5">
          <p className="font-accent text-[9px] uppercase tracking-[0.24em] text-gold-light">
            {chapter.coreEyebrow}
          </p>
          <h3 className="mt-2 font-display text-3xl leading-none text-ivory">
            {chapter.coreTitle}
          </h3>
        </div>
      </div>
      <div className="grid gap-3 p-5">
        {chapter.coreRows.map(([item, value]) => (
          <div
            key={item}
            className="flex items-center justify-between border border-charcoal/8 bg-cream/70 px-3 py-2"
          >
            <span className="text-sm text-slate">{item}</span>
            <span className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-dark">
              {value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ScenePlane({
  plane,
  index,
  active,
  shouldAnimate,
}: {
  plane: ScenePlaneData;
  index: number;
  active: boolean;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "absolute hidden w-[12.5rem] border p-4 shadow-[0_30px_90px_rgba(0,0,0,0.26)] backdrop-blur-xl md:block",
        plane.className,
        plane.tone
      )}
      animate={
        shouldAnimate
          ? {
              opacity: active ? 1 : 0.34,
              scale: active ? 1.07 : 0.92,
              y: active ? -10 : index % 2 === 0 ? 12 : -8,
              z: active ? 120 : -20,
            }
          : { opacity: active ? 1 : 0.54 }
      }
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-light/78">
        {plane.label}
      </p>
      <p className="mt-2 font-display text-xl leading-tight text-ivory">
        {plane.title}
      </p>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              active && dot <= index ? "w-6 bg-gold-light" : "w-1.5 bg-white/18"
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MobileSystemPreview() {
  return (
    <div className="relative min-h-[360px] overflow-hidden border border-white/10 bg-white/[0.045] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl [perspective:1200px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(201,169,110,0.16),transparent_56%)]" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/18" />
      <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

      {[
        ["Days", "left-5 top-8"],
        ["Functions", "right-5 top-20"],
        ["Vendors", "left-7 bottom-20"],
        ["Budget", "right-8 bottom-8"],
      ].map(([label, position]) => (
        <div
          key={label}
          className={cn(
            "absolute rounded-full border border-gold-primary/24 bg-midnight/68 px-3 py-2 text-center font-accent text-[9px] uppercase tracking-[0.18em] text-gold-light backdrop-blur-md",
            position
          )}
        >
          {label}
        </div>
      ))}

      <div
        className="absolute left-[52%] top-[48%] w-[13.5rem] overflow-hidden border border-gold-primary/28 bg-ivory text-charcoal shadow-[0_26px_80px_rgba(0,0,0,0.28)]"
        style={{ transform: "translate3d(-50%, -50%, 42px) rotateX(6deg) rotateY(-4deg)" }}
      >
        <div
          className="h-24 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg,rgba(51,61,41,0.04),rgba(51,61,41,0.66)),url(${MARKETING_IMAGES.hero.spatialAtelier})`,
          }}
        />
        <div className="p-4">
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-dark">
            Event core
          </p>
          <h3 className="mt-2 font-display text-2xl leading-none">
            Tap the branch. Edit the step.
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-slate">
            The phone view keeps the same spatial logic: center, branches, and scoped
            decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

function OrbitCard({
  layer,
  index,
  active,
  scrollYProgress,
}: {
  layer: OrbitLayer;
  index: number;
  active: boolean;
  scrollYProgress: MotionValue<number>;
}) {
  const Icon = layer.icon;
  const lift = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [index % 2 === 0 ? -10 : 14, index % 2 === 0 ? 12 : -12, index % 2 === 0 ? 26 : -18]
  );
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1, 0.7]);
  const depth = [72, 118, 48, 94][index] ?? 64;
  const rotateX = [-5, 4, 6, -4][index] ?? 0;
  const rotateY = [-10, 10, -7, 8][index] ?? 0;

  return (
    <motion.div
      className={cn(
        "absolute hidden w-[15rem] border p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:block",
        layer.position,
        layer.tone === "gold" && "border-gold-primary/28 bg-gold-primary/[0.075]",
        layer.tone === "info" && "border-info/24 bg-info/[0.07]",
        layer.tone === "rose" && "border-rose/24 bg-rose/[0.07]",
        layer.tone === "sage" && "border-sage/24 bg-sage/[0.07]"
      )}
      animate={{
        scale: active ? 1.08 : 0.96,
        rotateX: active ? 0 : rotateX,
        rotateY: active ? 0 : rotateY,
        z: active ? depth + 42 : depth,
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ y: lift, opacity: active ? 1 : glow, transformStyle: "preserve-3d" }}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 blur-2xl transition-opacity duration-500",
          active ? "opacity-70" : "opacity-20",
          layer.tone === "gold" && "bg-gold-primary/20",
          layer.tone === "info" && "bg-info/20",
          layer.tone === "rose" && "bg-rose/20",
          layer.tone === "sage" && "bg-sage/20"
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-light/78">
            {layer.eyebrow}
          </p>
          <h3 className="mt-2 font-display text-2xl leading-tight text-ivory">
            {layer.title}
          </h3>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-gold-light">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ivory/66">{layer.body}</p>
    </motion.div>
  );
}
