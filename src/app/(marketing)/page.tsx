import { HeroSection } from "@/components/marketing/hero/hero-section";
import { DestinationCarousel } from "@/components/marketing/destinations/destination-carousel";
import { JourneySteps } from "@/components/marketing/how-it-works/journey-steps";
import { PackageSection } from "@/components/marketing/packages/package-section";
import { VendorMarquee } from "@/components/marketing/vendors/vendor-marquee";
import { BudgetTeaser } from "@/components/marketing/budget/budget-teaser";
import { TestimonialCarousel } from "@/components/marketing/testimonials/testimonial-carousel";
import { FoundersSection } from "@/components/marketing/about/founders-section";
import { PlanningManifesto } from "@/components/marketing/home/planning-manifesto";
import { ContactForm } from "@/components/marketing/contact/contact-form";
import { MARKETING_IMAGES } from "@/lib/marketing-images";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AssuranceStrip />
      <PlanningManifesto />

      <div className="relative z-10">
        <DestinationCarousel />
      </div>

      <AtmosphereGallery />

      <SectionDivider variant="soft" />

      <JourneySteps />

      <section className="noise relative overflow-hidden bg-ivory">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(201,169,110,0.08),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(123,167,201,0.05),transparent_28%)]" />
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,110,0.08),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(123,167,201,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_30%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="lg:sticky lg:top-32">
              <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
                Get in Touch
              </p>
              <h2
                className="mt-5 font-display font-bold text-charcoal"
                style={{ fontSize: "var(--text-h1)" }}
              >
                Start with a concierge brief, not a generic inquiry form.
              </h2>
              <p className="mt-5 max-w-xl font-heading text-lg font-light leading-relaxed text-slate">
                Bring the destination, guest count, timing, and social rhythm you
                want the weekend to hold. We’ll respond with direction that already
                feels shaped around your celebration.
              </p>

              <div className="mt-8 grid gap-4">
                {[
                  "A first response built around destination fit and scale",
                  "Early budget direction before the scope loses shape",
                  "Vendor curation that already reflects your taste",
                ].map((point) => (
                  <div
                    key={point}
                    className="border border-charcoal/8 bg-ivory/70 px-4 py-4 shadow-[0_16px_50px_rgba(26,26,46,0.04)]"
                  >
                    <p className="font-heading text-sm leading-relaxed text-charcoal">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-charcoal/8 bg-ivory/75 p-6 shadow-[0_22px_70px_rgba(26,26,46,0.07)] backdrop-blur-sm md:p-8">
              <div className="mb-8">
                <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
                  Concierge brief
                </p>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate">
                  Tell us what matters most and we’ll return with destination fit,
                  planning scope, and a clearer first route into the weekend.
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
      label: "Ceremony language",
      title: "Light, procession, architecture.",
      copy: "The strongest weddings feel like a world with its own temperature and pace.",
      height: "h-[420px]",
    },
    {
      image: MARKETING_IMAGES.hero.tablescape,
      label: "Dining atmosphere",
      title: "Tables that carry the story forward.",
      copy: "Hospitality should feel as designed as the floral palette and the lighting plan.",
      height: "h-[320px]",
    },
    {
      image: MARKETING_IMAGES.editorial.portrait,
      label: "Portrait mood",
      title: "Editorial, but still personal.",
      copy: "Creative direction matters most when it still leaves room for feeling and family.",
      height: "h-[520px]",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-ivory px-[var(--section-padding-x)] py-[calc(var(--section-padding-y)*0.95)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,110,0.08),transparent_24%),radial-gradient(circle_at_82%_26%,rgba(123,167,201,0.07),transparent_26%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
              Signature Moments
            </p>
            <h2
              className="mt-5 font-display font-bold leading-[0.96] text-charcoal"
              style={{ fontSize: "var(--text-h1)" }}
            >
              The landing should already feel like the wedding you want.
            </h2>
          </div>
          <p className="max-w-2xl font-heading text-lg font-light leading-relaxed text-slate">
            Not louder. Not busier. Just more atmospheric, more resolved, and more
            confident about what kind of celebration is being built.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_0.8fr_1fr]">
          {moments.map((moment, index) => (
            <div key={moment.title} className="group">
              <div
                className={`relative overflow-hidden border border-charcoal/10 ${moment.height} transition-shadow duration-700 group-hover:shadow-[0_30px_90px_rgba(26,26,46,0.18)]`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ backgroundImage: `url(${moment.image})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.02)_0%,rgba(17,24,39,0.18)_38%,rgba(17,24,39,0.82)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.18),transparent_42%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <span className="font-accent absolute right-5 top-5 text-[10px] uppercase tracking-[0.24em] text-ivory/35">
                  {String(index + 1).padStart(2, "0")} / {String(moments.length).padStart(2, "0")}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                  <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-gold-light">
                    {moment.label}
                  </p>
                  <h3 className="mt-3 font-display text-2xl">{moment.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/74">
                    {moment.copy}
                  </p>
                  <div className="mt-4 h-px w-10 bg-gradient-to-r from-gold-primary/60 to-transparent transition-all duration-700 group-hover:w-24" />
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
        <div className="relative flex items-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-primary/30 to-gold-primary/30" />
          <span className="mx-3 inline-block h-1.5 w-1.5 rotate-45 bg-gold-primary/55" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold-primary/30 to-gold-primary/30" />
        </div>
      </div>
    );
  }
  return (
    <div className="mx-[var(--section-padding-x)] py-4">
      <div className="h-px bg-gradient-to-r from-transparent via-charcoal/12 to-transparent" />
    </div>
  );
}

function AssuranceStrip() {
  const signals = [
    {
      eyebrow: "Concierge-only",
      copy: "Every weekend on this platform is delivered with a senior planner inside the loop.",
    },
    {
      eyebrow: "Curated vendor depth",
      copy: "Catering, decor, photography, and entertainment partners vetted for chemistry, not just price.",
    },
    {
      eyebrow: "Operations on the day",
      copy: "A weekend-of team that keeps the run-of-show steady while families stay in the moment.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-midnight text-ivory">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(201,169,110,0.14),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(123,167,201,0.1),transparent_24%),linear-gradient(180deg,#10101b,#15172a)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.10]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)] py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {signals.map((signal, index) => (
            <div
              key={signal.eyebrow}
              className="group relative border border-white/8 bg-white/[0.03] p-5 backdrop-blur-md transition-colors duration-500 hover:border-gold-primary/35"
            >
              <span className="font-accent absolute right-4 top-4 text-[10px] uppercase tracking-[0.22em] text-ivory/24">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-light">
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
