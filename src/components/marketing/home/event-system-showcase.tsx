"use client";

import { useRef, useState } from "react";
import {
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
  Diamond,
  Layers3,
  MapPinned,
  PartyPopper,
  Sparkles,
  UtensilsCrossed,
  Wand2,
} from "lucide-react";

import {
  SectionEyebrow,
  SectionHeader,
} from "@/components/marketing/shared/marketing-primitives";
import { MARKETING_IMAGES } from "@/lib/marketing-images";
import { cn } from "@/lib/utils";

const atlasScenes = [
  {
    label: "Define",
    eyebrow: "Layer 01",
    title: "Start from the event, not the form.",
    copy: "A client names the celebration, chooses the event type, maps days, dates, venues, and morning / afternoon / evening functions before any detail appears.",
    coreTitle: "Definition core",
    metric: "Structure locked",
    stat: "Days · blocks · venues",
    tone: "gold",
    details: ["Event type", "Dates", "Time blocks", "Venues"],
    icon: CalendarDays,
  },
  {
    label: "Map",
    eyebrow: "Layer 02",
    title: "Every function becomes its own branch.",
    copy: "A haldi lunch, gala dinner, conference keynote, or after-party opens only the relevant steps: food, design, photo, entertainment, logistics, special requests, and notes.",
    coreTitle: "Function map",
    metric: "Scoped editor",
    stat: "One branch at a time",
    tone: "sage",
    details: ["Basics", "Food", "Design", "Logistics"],
    icon: Layers3,
  },
  {
    label: "Curate",
    eyebrow: "Layer 03",
    title: "Vendors enter before menu typing.",
    copy: "Couples choose real packages, catalogue rows, setups, counters, deliverables, and add-ons first. Custom requests stay separate so they can be priced manually and transparently.",
    coreTitle: "Vendor orbit",
    metric: "Real catalogues",
    stat: "Select, then customize",
    tone: "rose",
    details: ["Menus", "Setups", "Coverage", "Add-ons"],
    icon: ConciergeBell,
  },
  {
    label: "Estimate",
    eyebrow: "Layer 04",
    title: "The budget follows the plan.",
    copy: "Per-person food, venue cues, selected services, manually confirmed items, paid amounts, and due balances stay tied to the function they belong to.",
    coreTitle: "Budget gravity",
    metric: "Live sync",
    stat: "Plan ↔ budget",
    tone: "olive",
    details: ["Per-person", "Final prices", "Paid", "Variance"],
    icon: CircleDollarSign,
  },
  {
    label: "Finalize",
    eyebrow: "Layer 05",
    title: "Readiness becomes visible before execution.",
    copy: "The final layer exposes missing vendors, incomplete logistics, guest gaps, menu gaps, unconfirmed special pricing, and run-of-show risk before the event moves forward.",
    coreTitle: "Readiness layer",
    metric: "Gaps visible",
    stat: "Complete · partial · missing",
    tone: "walnut",
    details: ["Vendors", "Guests", "Run-of-show", "Open gaps"],
    icon: PartyPopper,
  },
] as const;

const mapNodes = [
  {
    id: "day-one",
    label: "Day",
    title: "10 Jun",
    className: "left-[9%] top-[19%]",
    depth: 86,
    scene: 0,
  },
  {
    id: "morning",
    label: "Function",
    title: "Morning",
    className: "right-[9%] top-[16%]",
    depth: 132,
    scene: 1,
  },
  {
    id: "food",
    label: "Need",
    title: "Food",
    className: "left-[7%] bottom-[28%]",
    depth: 122,
    scene: 2,
  },
  {
    id: "vendor",
    label: "Vendor",
    title: "Saffron",
    className: "right-[10%] bottom-[26%]",
    depth: 92,
    scene: 2,
  },
  {
    id: "budget",
    label: "Estimate",
    title: "₹",
    className: "left-[39%] bottom-[8%]",
    depth: 152,
    scene: 3,
  },
] as const;

const atlasRoutes = [
  "M275 278 C178 195 132 164 78 96",
  "M275 278 C388 188 450 164 536 102",
  "M275 278 C168 332 118 402 78 502",
  "M275 278 C392 354 464 422 542 504",
  "M275 278 C256 384 242 452 274 556",
] as const;

const mobileSteps = [
  "Define the event",
  "Open a function",
  "Pick vendor services",
  "Sync budget",
  "Close gaps",
] as const;

type AtlasScene = (typeof atlasScenes)[number];
type AtlasTone = AtlasScene["tone"];

const toneClass: Record<AtlasTone, string> = {
  gold: "border-gold-primary/42 bg-gold-primary/[0.12] text-gold-light",
  sage: "border-sage/42 bg-sage/[0.11] text-dry-sage",
  rose: "border-rose/42 bg-rose/[0.10] text-khaki-beige",
  olive: "border-dusty-olive/45 bg-dusty-olive/[0.18] text-dry-sage",
  walnut: "border-saddle-brown/50 bg-saddle-brown/[0.18] text-khaki-beige",
};

export function EventSystemShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const deskRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [14, 6, 10]);
  const deskRotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-16, 0, 13]);
  const deskRotateZ = useTransform(scrollYProgress, [0, 0.5, 1], [-5, 0, 4]);
  const deskY = useTransform(scrollYProgress, [0, 1], [58, -72]);
  const deskScale = useTransform(scrollYProgress, [0, 0.55, 1], [0.9, 1, 0.94]);
  const routeDraw = useTransform(scrollYProgress, [0.12, 0.84], [0, 1]);
  const compassSpin = useTransform(scrollYProgress, [0, 1], [0, 62]);
  const plateLift = useTransform(scrollYProgress, [0, 0.42, 0.82, 1], [0, 34, 92, 138]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.35, 0.62, 0.42]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!shouldAnimate) return;
    const nextScene = Math.max(
      0,
      Math.min(atlasScenes.length - 1, Math.floor(latest * atlasScenes.length))
    );
    setActiveScene((current) => (current === nextScene ? current : nextScene));
  });

  const active = atlasScenes[activeScene] ?? atlasScenes[0];
  const ActiveIcon = active.icon;

  return (
    <section
      id="event-system"
      ref={sectionRef}
      className="noise relative overflow-hidden bg-[linear-gradient(180deg,#333d29_0%,#414833_46%,#f5f0e2_100%)] text-ivory"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(182,173,144,0.20),transparent_30%),radial-gradient(circle_at_80%_28%,rgba(164,172,134,0.16),transparent_27%),radial-gradient(circle_at_52%_72%,rgba(127,79,36,0.18),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,226,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,226,0.04)_1px,transparent_1px)] bg-[size:92px_92px] opacity-[0.10]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-midnight/70 to-transparent" />

      <div className="relative z-10 mx-auto grid max-w-[1520px] gap-10 px-[var(--section-padding-x)] py-16 lg:min-h-[270vh] lg:grid-cols-[minmax(0,0.76fr)_minmax(640px,1.24fr)] lg:items-start lg:gap-14 lg:py-24">
        <div className="lg:sticky lg:top-24">
          <SectionHeader
            eyebrow="3D planning atlas"
            title="The event system unfolds as one living map."
            intro="The landing now mirrors the product: first the event shape, then function branches, vendor catalogues, budget gravity, and final readiness. One route, one operating rhythm."
            align="start"
            tone="light"
            titleMaxWidth="max-w-3xl"
          />

          <div className="mt-8 lg:hidden">
            <MobileAtlasCard />
          </div>

          <div className="mt-8 grid gap-2.5">
            {atlasScenes.map((scene, index) => {
              const Icon = scene.icon;
              const selected = activeScene === index;
              return (
                <button
                  key={scene.label}
                  type="button"
                  onClick={() => setActiveScene(index)}
                  aria-pressed={selected}
                  className={cn(
                    "group grid grid-cols-[auto_minmax(0,1fr)] gap-3 border p-3.5 text-left backdrop-blur-md transition-all duration-200",
                    selected
                      ? "border-gold-primary/45 bg-gold-primary/[0.105] shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
                      : "border-white/10 bg-white/[0.045] hover:border-gold-primary/25 hover:bg-white/[0.06]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center border transition-all duration-500",
                      selected
                        ? "border-gold-light/45 bg-gold-primary/18 text-gold-light"
                        : "border-white/10 bg-white/[0.05] text-ivory/46 group-hover:text-gold-light"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="flex flex-wrap items-center gap-2">
                      <SectionEyebrow
                        label={scene.eyebrow}
                        tone="light"
                        size="sm"
                        className="text-gold-light/72"
                      />
                      <span className="hidden h-px w-7 bg-gold-primary/24 sm:block" />
                      <span className="font-accent text-[9px] uppercase tracking-[0.18em] text-ivory/34">
                        {scene.metric}
                      </span>
                    </span>
                    <span className="mt-2 block font-display text-xl leading-tight text-ivory">
                      {scene.title}
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-ivory/66">
                      {scene.copy}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:sticky lg:top-20">
          <div className="relative min-h-[620px] overflow-hidden border border-white/10 bg-midnight/55 p-4 shadow-[0_36px_110px_rgba(0,0,0,0.32)] backdrop-blur-lg md:p-6 lg:min-h-[700px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(166,138,100,0.16),transparent_42%),radial-gradient(circle_at_58%_64%,rgba(194,197,170,0.12),transparent_34%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,226,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,226,0.035)_1px,transparent_1px)] bg-[size:52px_52px] opacity-30" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
                <SectionEyebrow
                  label={`${active.eyebrow} · ${active.label}`}
                  tone="light"
                  size="sm"
                  className="text-gold-light"
                />
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ivory/62">
                  {active.stat}
                </p>
              </div>
              <div className="hidden border border-white/10 bg-white/[0.04] px-4 py-3 text-right backdrop-blur-xl sm:block">
                <p className="font-accent text-[9px] uppercase tracking-[0.24em] text-ivory/38">
                  Scroll depth
                </p>
                <p className="mt-1 font-display text-2xl text-gold-light">
                  {String(activeScene + 1).padStart(2, "0")} / 05
                </p>
              </div>
            </div>

            <div className="relative z-10 flex min-h-[520px] items-center justify-center lg:min-h-[590px]">
              <div className="relative h-[520px] w-full max-w-[700px] md:h-[590px]" style={{ perspective: "1700px" }}>
                <motion.div
                  aria-hidden
                  className="absolute left-1/2 top-[61%] h-32 w-[68%] -translate-x-1/2 rounded-full bg-black blur-2xl"
                  style={shouldAnimate ? { opacity: shadowOpacity } : { opacity: 0.45 }}
                />

                <motion.div
                  className="absolute inset-0"
                  style={
                    shouldAnimate
                      ? {
                          rotateX: deskRotateX,
                          rotateY: deskRotateY,
                          rotateZ: deskRotateZ,
                          y: deskY,
                          scale: deskScale,
                          transformStyle: "preserve-3d",
                        }
                      : { transformStyle: "preserve-3d" }
                  }
                >
                  <div
                    className="absolute inset-[7%] border border-gold-primary/16 bg-[linear-gradient(135deg,rgba(245,240,226,0.95),rgba(231,223,201,0.82))] text-charcoal shadow-[0_50px_160px_rgba(0,0,0,0.34)]"
                    style={{ transform: "translateZ(0px)" }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(51,61,41,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(51,61,41,0.075)_1px,transparent_1px)] bg-[size:46px_46px]" />
                    <div className="absolute inset-8 border border-charcoal/8" />
                    <div
                      className="absolute right-0 top-0 h-40 w-56 bg-cover bg-center opacity-25 mix-blend-multiply"
                      style={{ backgroundImage: `url(${MARKETING_IMAGES.hero.spatialAtelier})` }}
                    />

                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                      viewBox="0 0 600 600"
                    >
                      {atlasRoutes.map((route, index) => (
                        <motion.path
                          key={route}
                          d={route}
                          fill="none"
                          stroke={
                            index <= activeScene
                              ? "rgba(127,79,36,0.62)"
                              : "rgba(51,61,41,0.18)"
                          }
                          strokeWidth={index === activeScene ? 2 : 1.15}
                          strokeDasharray="7 9"
                          strokeLinecap="round"
                          style={shouldAnimate ? { pathLength: routeDraw } : undefined}
                        />
                      ))}
                    </svg>

                    <motion.div
                      className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/28"
                      style={shouldAnimate ? { rotate: compassSpin } : undefined}
                    />
                    <motion.div
                      className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-charcoal/10"
                      style={shouldAnimate ? { rotate: compassSpin } : undefined}
                    />

                    <div
                      className="absolute left-1/2 top-1/2 w-[18rem] -translate-x-1/2 -translate-y-1/2 border border-charcoal/12 bg-ivory/96 p-5 shadow-[0_28px_90px_rgba(51,61,41,0.16)]"
                      style={{ transform: "translate3d(-50%, -50%, 104px)" }}
                    >
                      <motion.div
                        key={active.label}
                        initial={shouldAnimate ? { opacity: 0, y: 14, filter: "blur(8px)" } : false}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-gold-dark">
                              {active.coreTitle}
                            </p>
                            <h3 className="mt-2 font-display text-3xl leading-none text-charcoal">
                              {active.metric}
                            </h3>
                          </div>
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center border",
                              toneClass[active.tone]
                            )}
                          >
                            <ActiveIcon className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          {active.details.map((detail) => (
                            <div
                              key={detail}
                              className="border border-charcoal/8 bg-cream/60 px-3 py-2"
                            >
                              <p className="font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
                                {detail}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>

                    {mapNodes.map((node) => (
                      <MapNode
                        key={node.id}
                        node={node}
                        activeScene={activeScene}
                        progress={scrollYProgress}
                      />
                    ))}

                    <motion.div
                      className="absolute left-[21%] top-[7%] hidden border border-charcoal/10 bg-ivory/82 px-4 py-3 text-charcoal shadow-[0_20px_70px_rgba(51,61,41,0.12)] md:block"
                      style={
                        shouldAnimate
                          ? { z: plateLift, transformStyle: "preserve-3d" }
                          : { transformStyle: "preserve-3d" }
                      }
                    >
                      <div className="flex items-center gap-2 text-gold-dark">
                        <MapPinned className="h-3.5 w-3.5" />
                        <span className="font-accent text-[9px] uppercase tracking-[0.2em]">
                          Venue aware
                        </span>
                      </div>
                      <p className="mt-1 max-w-[12rem] text-xs leading-relaxed text-slate">
                        Days can carry different venues without breaking the plan.
                      </p>
                    </motion.div>

                    <motion.div
                      className="absolute bottom-[8%] right-[18%] hidden border border-charcoal/10 bg-charcoal px-4 py-3 text-ivory shadow-[0_22px_80px_rgba(51,61,41,0.22)] md:block"
                      style={
                        shouldAnimate
                          ? { z: plateLift, transformStyle: "preserve-3d" }
                          : { transformStyle: "preserve-3d" }
                      }
                    >
                      <div className="flex items-center gap-2 text-gold-light">
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        <span className="font-accent text-[9px] uppercase tracking-[0.2em]">
                          Catalogue first
                        </span>
                      </div>
                      <p className="mt-1 max-w-[12rem] text-xs leading-relaxed text-ivory/66">
                        Menus start from vendor rows, not empty text boxes.
                      </p>
                    </motion.div>
                  </div>

                  <div
                    className="absolute right-[2%] top-[11%] w-[12rem] border border-white/10 bg-white/[0.055] p-3.5 text-ivory shadow-[0_18px_56px_rgba(0,0,0,0.22)] backdrop-blur-md"
                    style={{ transform: "translateZ(160px) rotateZ(5deg)" }}
                  >
                    <div className="flex items-center gap-2 text-gold-light">
                      <Sparkles className="h-3.5 w-3.5" />
                      <p className="font-accent text-[9px] uppercase tracking-[0.2em]">
                        Fast interaction
                      </p>
                    </div>
                    <p className="mt-2 font-display text-lg leading-tight">
                      Tap one node. Edit one step.
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

function MapNode({
  node,
  activeScene,
  progress,
}: {
  node: (typeof mapNodes)[number];
  activeScene: number;
  progress: MotionValue<number>;
}) {
  const active = activeScene >= node.scene;
  const y = useTransform(
    progress,
    [0, 0.5, 1],
    [node.scene % 2 === 0 ? 10 : -8, active ? -14 : 6, node.scene % 2 === 0 ? -18 : 18]
  );
  const scale = active ? 1 : 0.9;

  return (
    <motion.div
      className={cn("absolute z-20", node.className)}
      style={{
        y,
        z: node.depth,
        scale,
        transformStyle: "preserve-3d",
      }}
      animate={{ opacity: active ? 1 : 0.46 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={cn(
          "min-w-[7.5rem] border p-3 text-center shadow-[0_18px_60px_rgba(51,61,41,0.16)]",
          active
            ? "border-gold-primary/45 bg-ivory text-charcoal"
            : "border-charcoal/12 bg-ivory/70 text-slate"
        )}
      >
        <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-gold-dark">
          {node.label}
        </p>
        <p className="mt-1 font-display text-xl leading-none">{node.title}</p>
      </div>
    </motion.div>
  );
}

function MobileAtlasCard() {
  return (
    <div className="relative overflow-hidden border border-white/10 bg-white/[0.045] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(166,138,100,0.18),transparent_58%)]" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-gold-light">
          <Diamond className="h-3.5 w-3.5" />
          <p className="font-accent text-[10px] uppercase tracking-[0.24em]">
            Mobile atlas
          </p>
        </div>
        <h3 className="mt-3 font-display text-3xl leading-none text-ivory">
          Same system, condensed.
        </h3>
        <div className="mt-5 grid gap-2">
          {mobileSteps.map((step, index) => (
            <div
              key={step}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border border-white/10 bg-white/[0.04] p-3"
            >
              <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-light/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-sm text-ivory/76">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-ivory/48">
          <Wand2 className="h-3.5 w-3.5" />
          <p className="text-xs leading-relaxed">
            Desktop gets the full 3D table; mobile keeps the route clear and fast.
          </p>
        </div>
      </div>
    </div>
  );
}
