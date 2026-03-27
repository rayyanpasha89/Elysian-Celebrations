import type { PackageTier } from "@/types/common";

export const packageTiers: PackageTier[] = [
  {
    id: "pkg-intimate",
    name: "Intimate",
    level: "INTIMATE",
    tagline: "Essential elegance for those who want clarity without compromise.",
    description:
      "A refined foundation for destination weddings up to a curated guest list—focused planning, trusted vendor shortlists, and a timeline that keeps you present on the day. Ideal for couples who value intimacy, efficiency, and understated luxury.",
    startingPrice: 1500000,
    currency: "INR",
    inclusions: [
      "Dedicated planning lead & milestone roadmap",
      "Venue & vendor shortlist aligned to your aesthetic",
      "Budget framework with category-level transparency",
      "RSVP and guest logistics coordination",
      "On-site coordination for ceremony & reception",
    ],
    featured: false,
    icon: "Heart",
  },
  {
    id: "pkg-grand",
    name: "Grand",
    level: "GRAND",
    tagline: "Premium orchestration for multi-day celebrations that feel cinematic.",
    description:
      "Elevate every chapter—from welcome soirée to farewell brunch—with design direction, rehearsal oversight, and a senior team embedded in your weekend. Grand is where bespoke production meets warm hospitality, so every transition feels effortless.",
    startingPrice: 3500000,
    currency: "INR",
    inclusions: [
      "Senior planner + associate team throughout your stay",
      "Creative direction for décor, lighting & flow",
      "Vendor contracting support and payment schedule",
      "Multi-day run-of-show and contingency planning",
      "Guest experience touches (welcome kits, transport matrix)",
      "Full wedding weekend on-site management",
    ],
    featured: true,
    icon: "Sparkles",
  },
  {
    id: "pkg-royal",
    name: "Royal",
    level: "ROYAL",
    tagline: "Ultra-luxury execution for celebrations that redefine scale and splendour.",
    description:
      "Reserved for the rarest occasions—private estates, chartered movements, and production values worthy of legacy. Royal pairs white-glove service with anticipatory detail: nothing is left to chance, and every moment is choreographed to feel inevitable.",
    startingPrice: 7500000,
    currency: "INR",
    inclusions: [
      "Principal planner + full specialist pod (design, logistics, hospitality)",
      "Bespoke concepting, 3D visualisation & art direction",
      "VIP travel, security and hospitality liaison",
      "International vendor fly-ins where required",
      "Post-event reconciliation and archival album of planning assets",
      "Unlimited scope revisions within engagement window",
    ],
    featured: false,
    icon: "Crown",
  },
];
