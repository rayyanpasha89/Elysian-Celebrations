import type { Metadata } from "next";
import { EditorialAboutHero } from "@/components/marketing/about/editorial-hero";
import { FoundersSection } from "@/components/marketing/about/founders-section";
import { PhilosophySection } from "@/components/marketing/about/philosophy-section";
import { ValuesTiersSection } from "@/components/marketing/about/values-tiers-section";
import { CTASection } from "@/components/marketing/cta/cta-section";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story behind Elysian Celebrations—mission, founders, and the principles that guide every destination wedding we plan.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <EditorialAboutHero />
      <PhilosophySection />
      <FoundersSection />
      <ValuesTiersSection />
      <CTASection />
    </main>
  );
}
