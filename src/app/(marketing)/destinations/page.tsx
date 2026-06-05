import type { Metadata } from "next";
import { DestinationsGrid } from "@/components/marketing/destinations/destinations-grid";

export const metadata: Metadata = {
  title: "Destinations | Elysian Celebrations",
  description:
    "Explore luxury destination event locations across India and beyond—handpicked venues for weddings, galas, launches, and retreats with transparent pricing and unforgettable settings.",
};

export default function DestinationsPage() {
  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <DestinationsGrid />
    </main>
  );
}
