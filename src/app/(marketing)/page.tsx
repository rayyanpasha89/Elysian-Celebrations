import { HeroSection } from "@/components/marketing/hero/hero-section";
import { DestinationCarousel } from "@/components/marketing/destinations/destination-carousel";
import { JourneySteps } from "@/components/marketing/how-it-works/journey-steps";
import { PackageSection } from "@/components/marketing/packages/package-section";
import { VendorMarquee } from "@/components/marketing/vendors/vendor-marquee";
import { BudgetTeaser } from "@/components/marketing/budget/budget-teaser";
import { TestimonialCarousel } from "@/components/marketing/testimonials/testimonial-carousel";
import { FoundersSection } from "@/components/marketing/about/founders-section";
import { ContactForm } from "@/components/marketing/contact/contact-form";
import { CTASection } from "@/components/marketing/cta/cta-section";

export default function HomePage() {
  return (
    <>
      {/* 1. Cinematic Hero */}
      <HeroSection />

      {/* 2. Destinations — Horizontal Scroll */}
      <DestinationCarousel />

      {/* Editorial break */}
      <div className="hr-editorial mx-[var(--section-padding-x)]" />

      {/* 3. How It Works — Golden Thread Timeline */}
      <JourneySteps />

      {/* 4. Package Tiers — 3D Tilt Cards */}
      <div className="noise">
        <PackageSection />
      </div>

      {/* 5. Vendor Showcase — Infinite Marquee */}
      <VendorMarquee />

      {/* Gold rule break */}
      <div className="hr-editorial-gold mx-[var(--section-padding-x)]" />

      {/* 6. Budget Calculator Teaser */}
      <div className="noise">
        <BudgetTeaser />
      </div>

      {/* 7. Testimonials Carousel */}
      <TestimonialCarousel />

      {/* 8. Founders Story */}
      <div className="noise">
        <FoundersSection />
      </div>

      {/* 9. Contact Form */}
      <section id="contact" className="noise relative bg-cream py-[var(--section-padding-y)] overflow-hidden">
        {/* Atmospheric gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 30%, rgba(201,169,110,0.05) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
          {/* Section header */}
          <div className="mb-12 text-center">
            <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary mb-4">
              Get in Touch
            </p>
            <h2
              className="font-display font-bold text-charcoal"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Start the Conversation
            </h2>
            <p className="mt-4 max-w-md mx-auto font-heading text-lg font-light text-slate">
              Tell us about your vision. We respond within 24 hours.
            </p>
            <div className="mx-auto mt-6 h-[1px] w-16 bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Final CTA */}
      <CTASection />
    </>
  );
}
