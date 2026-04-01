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
          {moments.map((moment) => (
            <div key={moment.title} className="group">
              <div
                className={`relative overflow-hidden border border-charcoal/10 ${moment.height}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ backgroundImage: `url(${moment.image})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.02)_0%,rgba(17,24,39,0.12)_38%,rgba(17,24,39,0.74)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                  <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-gold-light">
                    {moment.label}
                  </p>
                  <h3 className="mt-3 font-display text-2xl">{moment.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/74">
                    {moment.copy}
                  </p>
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
  return (
    <div className="mx-[var(--section-padding-x)] py-4">
      <div
        className={
          variant === "gold"
            ? "h-px bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent"
            : "h-px bg-gradient-to-r from-transparent via-charcoal/12 to-transparent"
        }
      />
    </div>
  );
}
