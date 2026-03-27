import type { Metadata } from "next";
import { PackageComparison } from "@/components/marketing/packages/package-comparison";
import { PackageFaq } from "@/components/marketing/packages/package-faq";
import { PackageSection } from "@/components/marketing/packages/package-section";
import { PackagesHero } from "@/components/marketing/packages/packages-hero";

export const metadata: Metadata = {
  title: "Packages | Elysian Celebrations",
  description:
    "Intimate, Grand, and Royal destination wedding packages—transparent tiers, curated vendors, and planning depth that matches your celebration.",
};

export default function PackagesPage() {
  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <PackagesHero />
      <PackageSection showHeader={false} />
      <PackageComparison />
      <PackageFaq />
    </main>
  );
}
