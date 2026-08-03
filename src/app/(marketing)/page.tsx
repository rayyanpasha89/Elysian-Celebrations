import dynamic from "next/dynamic";
import { HeroSection } from "@/components/marketing/hero/hero-section";
import { PlanningManifesto } from "@/components/marketing/home/planning-manifesto";
import { EventSystemShowcase } from "@/components/marketing/home/event-system-showcase";
import {
  OrnamentRule,
  SectionEyebrow,
  SectionHeader,
} from "@/components/marketing/shared/marketing-primitives";
import { cn } from "@/lib/utils";
import { MARKETING_IMAGES } from "@/lib/marketing-images";

const DestinationCarousel = dynamic(() =>
  import("@/components/marketing/destinations/destination-carousel").then(
    (module) => module.DestinationCarousel
  )
);
const JourneySteps = dynamic(() =>
  import("@/components/marketing/how-it-works/journey-steps").then(
    (module) => module.JourneySteps
  )
);
const PackageSection = dynamic(() =>
  import("@/components/marketing/packages/package-section").then(
    (module) => module.PackageSection
  )
);
const VendorMarquee = dynamic(() =>
  import("@/components/marketing/vendors/vendor-marquee").then(
    (module) => module.VendorMarquee
  )
);
const BudgetTeaser = dynamic(() =>
  import("@/components/marketing/budget/budget-teaser").then(
    (module) => module.BudgetTeaser
  )
);
const TestimonialCarousel = dynamic(() =>
  import("@/components/marketing/testimonials/testimonial-carousel").then(
    (module) => module.TestimonialCarousel
  )
);
const FoundersSection = dynamic(() =>
  import("@/components/marketing/about/founders-section").then(
    (module) => module.FoundersSection
  )
);
const ContactForm = dynamic(() =>
  import("@/components/marketing/contact/contact-form").then(
    (module) => module.ContactForm
  )
);

// The marketing home stays publicly viewable even when signed in, so the
// dashboard "Back to Site" link and the logo work. Post-login routing to the
// correct portal is handled by Clerk's afterSignInUrl + the role-aware proxy
// redirect — we intentionally do NOT force-redirect signed-in users here.
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AssuranceStrip />
      <EventSystemShowcase />
      <PlanningManifesto />

      <div className="relative z-10">
        <DestinationCarousel />
      </div>

      <AtmosphereGallery />

      <SectionDivider variant="soft" />

      <JourneySteps />

      <section className="noise relative overflow-hidden bg-ivory">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(201,169,110,0.08),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(164,172,134,0.05),transparent_28%)]" />
        <div className="relative z-10">
          <PackageSection />
        </div>
      </section>

      <VendorMarquee />

      <SectionDivider variant="gold" />

      <section className="noise relative overflow-hidden bg-ivory">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(201,169,110,0.08),transparent_24%)]" />
        <div className="relative z-10">
          <BudgetTeaser />
        </div>
      </section>

      <TestimonialCarousel />

      <section className="noise relative overflow-hidden bg-cream/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(212,160,160,0.08),transparent_24%),radial-gradient(circle_at_82%_50%,rgba(201,169,110,0.08),transparent_24%)]" />
        <div className="relative z-10">
          <FoundersSection />
        </div>
      </section>

      <section
        id="contact"
        className="noise relative overflow-hidden bg-cream py-[var(--section-padding-y)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,110,0.08),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(164,172,134,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_30%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="lg:sticky lg:top-32">
              <SectionHeader
                chapter="08"
                eyebrow="Concierge brief"
                title="Start with the event you want to shape."
                intro="Bring the event type, destination, guest frame, and the moments you already know. We’ll turn it into a first structure: days, functions, vendor direction, spend logic, and what needs manual confirmation."
                align="start"
                titleMaxWidth="max-w-xl"
              />

              <div className="mt-8 grid gap-4">
                {[
                  "A first structure shaped around your event type",
                  "Vendor and venue direction before scope drifts",
                  "Budget logic that follows the actual plan",
                ].map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 border border-charcoal/0 bg-ivory/70 px-4 py-4"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-gold-primary/55" />
                    <p className="font-heading text-sm leading-relaxed text-charcoal">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-charcoal/8 bg-ivory/75 p-6 shadow-[0_22px_70px_rgba(51,61,41,0.07)] backdrop-blur-sm md:p-8">
              <div className="mb-8">
                <p className="max-w-lg text-sm leading-relaxed text-slate">
                  Tell us what matters most and we’ll return with a clearer first
                  route into the event plan: structure, requirements, vendor
                  direction, and open questions.
                </p>
              </div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AtmosphereGallery() {
  const moments = [
    {
      image: MARKETING_IMAGES.editorial.ceremony,
      label: "Arrival node",
      title: "The first minute becomes a planned branch.",
      copy: "Sightlines, welcome drinks, lighting, and movement are tied to the exact function they support.",
      height: "h-[480px] lg:h-[460px]",
    },
    {
      image: MARKETING_IMAGES.hero.tablescape,
      label: "Hospitality node",
      title: "Menus begin from real vendor offerings.",
      copy: "Counters, courses, dietary cues, and add-ons come from catalogue rows before the client customizes.",
      height: "h-[420px] lg:h-[360px]",
    },
    {
      image: MARKETING_IMAGES.editorial.portrait,
      label: "Memory node",
      title: "Every frame knows which moment it belongs to.",
      copy: "Photo, film, decor, and family rhythm stay attached to the same branch of the plan.",
      height: "h-[520px] lg:h-[560px]",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-ivory px-[var(--section-padding-x)] py-12 md:py-[calc(var(--section-padding-y)*0.95)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,110,0.08),transparent_24%),radial-gradient(circle_at_82%_26%,rgba(164,172,134,0.07),transparent_26%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] lg:items-end">
          <SectionHeader
            eyebrow="Signature moments"
            title="Atmosphere now has coordinates."
            intro="The page is no longer selling pretty scenes alone. It shows how every scene belongs to a day, a function, a vendor decision, and a budget consequence."
            align="start"
            titleMaxWidth="max-w-3xl"
          />

          <div className="border border-charcoal/8 bg-cream/70 p-5">
            <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-gold-primary">
              Direction notes
            </p>
            <div className="mt-4 grid gap-3">
              {[
                "Each moment lives inside a day and function branch.",
                "Vendor catalogues create the first menu, setup, or service draft.",
                "Manually priced requests stay visible instead of polluting estimates.",
              ].map((note, index) => (
                <div
                  key={note}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-charcoal/8 pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal/32">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-slate">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_0.85fr_1fr]">
          {moments.map((moment, index) => (
            <div
              key={moment.title}
              className={cn(
                "group [perspective:1400px]",
                index === 0 && "hidden sm:block",
                index === 1 && "hidden lg:block",
                index === 2 && "sm:col-span-2 lg:col-span-1"
              )}
            >
              <div
                className={`relative overflow-hidden border border-charcoal/10 ${moment.height} transition-all duration-700 motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:rotate-x-[2deg] motion-safe:group-hover:rotate-y-[-3deg] group-hover:shadow-[0_30px_90px_rgba(51,61,41,0.18)]`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ backgroundImage: `url(${moment.image})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(51,61,41,0.02)_0%,rgba(51,61,41,0.18)_38%,rgba(51,61,41,0.82)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.18),transparent_42%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <span className="font-accent absolute right-5 top-5 text-[10px] uppercase tracking-[0.24em] text-ivory/40">
                  {String(index + 1).padStart(2, "0")} / {String(moments.length).padStart(2, "0")}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                  <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-gold-light">
                    {moment.label}
                  </p>
                  <h3 className="mt-3 font-display text-2xl leading-tight">
                    {moment.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/78">
                    {moment.copy}
                  </p>
                  <span className="mt-4 block h-px w-10 bg-gold-primary/60 transition-all duration-700 group-hover:w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionDivider({ variant }: { variant: "soft" | "gold" }) {
  if (variant === "gold") {
    return (
      <div className="mx-[var(--section-padding-x)] py-4">
        <OrnamentRule width={240} />
      </div>
    );
  }
  return (
    <div className="mx-[var(--section-padding-x)] py-4">
      <OrnamentRule width={180} />
    </div>
  );
}

function AssuranceStrip() {
  const signals = [
    {
      eyebrow: "Event atlas",
      copy: "Days, functions, venues, vendors, budget, and readiness now sit on one map.",
    },
    {
      eyebrow: "Catalogue-first",
      copy: "Couples pick real offerings before customizing menus, setups, coverage, or logistics.",
    },
    {
      eyebrow: "Operations pulse",
      copy: "Missing vendors, pending prices, guests, and run-of-show gaps become visible early.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-midnight text-ivory">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(182,173,144,0.15),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(164,172,134,0.12),transparent_24%),linear-gradient(135deg,#333d29,#414833_54%,#582f0e_140%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,226,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,226,0.045)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.10]" />
      <svg
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-32 -translate-y-1/2 text-gold-primary/22 lg:block"
        viewBox="0 0 1200 120"
        fill="none"
        aria-hidden
      >
        <path
          d="M40 74 C230 12 325 112 486 52 C642 -6 725 94 874 42 C1002 -2 1086 42 1160 72"
          stroke="currentColor"
          strokeDasharray="10 14"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)] py-12 md:py-16">
        <SectionEyebrow
          label="What the platform now carries"
          tone="light"
          size="sm"
          className="mb-8"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {signals.map((signal, index) => (
            <div
              key={signal.eyebrow}
              className={cn(
                "group relative overflow-hidden border border-white/8 bg-white/[0.035] p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-gold-primary/35 hover:bg-white/[0.06] hover:shadow-[0_28px_90px_rgba(0,0,0,0.20)]",
                index === 1 && "motion-safe:lg:-translate-y-3"
              )}
            >
              <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full bg-gold-primary/10 blur-2xl transition-transform duration-700 group-hover:scale-125" />
              <div className="absolute left-6 top-6 h-12 w-12 rounded-full border border-gold-primary/20" />
              <div className="absolute left-[2.7rem] top-[2.7rem] h-2 w-2 rounded-full bg-gold-light" />
              <span className="font-accent absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.22em] text-ivory/24">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="font-accent pl-16 text-[10px] uppercase tracking-[0.24em] text-gold-light">
                {signal.eyebrow}
              </p>
              <p className="mt-4 max-w-xs font-heading text-sm leading-relaxed text-ivory/80">
                {signal.copy}
              </p>
              <div className="mt-5 h-px w-12 bg-gradient-to-r from-gold-primary/55 to-transparent transition-all duration-500 group-hover:w-24" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
