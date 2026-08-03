"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { categoryCopy } from "@/lib/vendor-offering";
import { cn } from "@/lib/utils";

const categories = [
  "All",
  "Photography",
  "Decor",
  "Catering",
  "Music & DJ",
  "Makeup",
  "Hospitality",
  "Logistics",
  "Venues",
] as const;

type Cat = (typeof categories)[number];

type EventNeedFilter = {
  id: string;
  day: string;
  label: string;
  category: Cat;
  intent: string;
  isGap: boolean;
};

type VendorPlanPayload = {
  wedding: { id: string; name: string } | null;
  days: {
    id: string;
    name: string;
    events: {
      id: string;
      name: string;
      requirements: {
        id: string;
        category: string;
        title: string;
        status: string;
        vendorProfileId: string | null;
        vendorServiceId: string | null;
      }[];
      vendorSelections: {
        vendor: { categorySlug: string } | null;
      }[];
    }[];
  }[];
};

const requirementCategoryFilter: Record<string, Cat> = {
  food: "Catering",
  decor: "Decor",
  "photo-video": "Photography",
  entertainment: "Music & DJ",
  hospitality: "Hospitality",
  logistics: "Logistics",
  custom: "All",
};

// Slugs must match real `vendor_categories.slug` values, not the requirement
// key. The catalogue has no "hospitality" or "logistics" category — those are
// seeded as "planning" and "travel" (supabase/seed.sql:12,15), which is also
// how PLANNER_VENDOR_CATEGORIES maps them in src/lib/wedding-plan.ts:96-103.
// Using the requirement key here made both lanes match zero vendors, so their
// gaps could never be closed.
const requirementVendorSlug: Record<string, string | null> = {
  food: "catering",
  decor: "decor",
  "photo-video": "photography",
  entertainment: "entertainment",
  hospitality: "planning",
  logistics: "travel",
  custom: null,
};

const categoryApiSlug: Record<Exclude<Cat, "All">, string | null> = {
  Photography: "photography",
  Decor: "decor",
  Catering: "catering",
  "Music & DJ": "entertainment",
  Makeup: "makeup",
  Hospitality: "planning",
  Logistics: "travel",
  Venues: null,
};

type VendorServiceItemApi = {
  id: string;
  item_type: string;
  name: string;
  description: string | null;
  dietary_tags: string[] | null;
  image_urls: string[] | null;
  reference_url: string | null;
  sort_order: number | null;
};

type VendorServiceApi = {
  id?: string;
  base_price?: number | null;
  max_price?: number | null;
  name?: string;
  description?: string | null;
  service_scope?: string | null;
  unit?: string | null;
  event_type_fit?: string[] | null;
  inclusions?: string[] | null;
  deliverables?: string[] | null;
  add_ons?: string[] | null;
  items?: VendorServiceItemApi[] | null;
};

type VendorCardApi = {
  id: string;
  slug: string;
  business_name: string;
  short_bio: string | null;
  city: string | null;
  country: string | null;
  rating: number;
  review_count: number | null;
  is_verified?: boolean;
  is_featured?: boolean;
  experience?: number | null;
  category: { name?: string; slug?: string } | null;
  services: VendorServiceApi[] | null;
};

type VendorReviewApi = {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
};

type VendorDetailApi = VendorCardApi & {
  description: string | null;
  cover_image: string | null;
  portfolio: string[] | null;
  state: string | null;
  reviews: VendorReviewApi[] | null;
};

const savedBtn =
  "font-accent inline-flex items-center justify-center border px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] transition-all duration-500";

function priceRangeFromVendor(v: VendorCardApi): string {
  const prices = (v.services ?? [])
    .map((s) => s.base_price)
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (prices.length === 0) return "On request";
  const min = Math.min(...prices);
  if (min >= 100000) return `₹${(min / 100000).toFixed(1)}L+`;
  return `₹${(min / 1000).toFixed(0)}K+`;
}

function ratingLabel(rating: number | null | undefined) {
  return `${Number(rating ?? 0).toFixed(1)} / 5`;
}

function formatLocation(city: string | null, country: string | null) {
  return [city, country].filter(Boolean).join(", ") || "—";
}

function sortReviews(reviews: VendorReviewApi[] | null | undefined) {
  return (reviews ?? [])
    .slice()
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
}

function buildPlanNeedFilters(plan: VendorPlanPayload | null): EventNeedFilter[] {
  const requirements = (plan?.days ?? []).flatMap((day) =>
    day.events.flatMap((event) =>
      event.requirements.map((requirement) => {
        const expectedSlug = requirementVendorSlug[requirement.category] ?? null;
        const hasMatchingSelection = expectedSlug
          ? event.vendorSelections.some(
              (selection) => selection.vendor?.categorySlug === expectedSlug
            )
          : false;
        const isGap =
          !requirement.vendorProfileId &&
          !requirement.vendorServiceId &&
          !hasMatchingSelection;

        return {
          id: `${event.id}:${requirement.id}`,
          day: day.name,
          label: `${event.name} · ${requirement.title}`,
          category: requirementCategoryFilter[requirement.category] ?? "All",
          intent: isGap
            ? `This requirement is still open in ${event.name}. Compare a real partner and package for this exact function.`
            : `${event.name} already has coverage here. Compare alternatives only if you want to refine the current choice.`,
          isGap,
        } satisfies EventNeedFilter;
      })
    )
  );

  const openCount = requirements.filter((need) => need.isGap).length;
  const eventCount = (plan?.days ?? []).reduce(
    (sum, day) => sum + day.events.length,
    0
  );

  return [
    {
      id: "full-plan",
      day: plan?.wedding?.name ?? "Event plan",
      label:
        eventCount === 0
          ? "Create functions before sourcing"
          : openCount > 0
            ? `${openCount} open vendor ${openCount === 1 ? "gap" : "gaps"}`
            : "All planned requirements covered",
      category: "All",
      intent:
        eventCount === 0
          ? "Build at least one day and function so vendor sourcing can follow the real plan."
          : openCount > 0
            ? "Start with the open requirements below, then compare scope, catalogue, and pricing cues."
            : "Your current requirements have partner coverage. Keep browsing only when you want alternatives.",
      // An empty plan is not "covered" — there is simply nothing to evaluate
      // yet. Without this a brand-new client with zero functions is shown a
      // green Covered badge beside "Create functions before sourcing", which
      // is the same false-positive readiness signal the audit flagged.
      isGap: eventCount === 0 || openCount > 0,
    },
    ...requirements,
  ];
}

type VendorOfferingBlueprint = {
  promise: string;
  inclusions: string[];
  deliverables: string[];
  eventFit: string[];
  questions: string[];
};

type VendorOffering = VendorOfferingBlueprint & {
  addOns: string[];
  sources: {
    promise: "vendor" | "suggested";
    inclusions: "vendor" | "suggested";
    deliverables: "vendor" | "suggested";
    eventFit: "vendor" | "suggested";
    addOns: "vendor" | "suggested";
  };
};

const DEFAULT_OFFERING_BLUEPRINT: VendorOfferingBlueprint = {
  promise:
    "A complete event service scope with planning notes, pricing cues, and deliverables that can be matched to individual functions.",
  inclusions: [
    "Pre-event consultation",
    "Event-specific scope alignment",
    "On-ground execution support",
    "Final confirmation checklist",
  ],
  deliverables: [
    "Service proposal",
    "Package and final-pricing breakdown",
    "Timeline coordination notes",
    "Final handover before event day",
  ],
  eventFit: ["Welcome dinner", "Haldi", "Sangeet", "Wedding", "Reception"],
  questions: [
    "What is included in the base package?",
    "What changes if guest count increases?",
    "What setup time and access do you need?",
  ],
};

const OFFERING_BLUEPRINTS: Record<string, VendorOfferingBlueprint> = {
  catering: {
    promise:
      "Menus, service formats, guest flow, live counters, dietary handling, and final hospitality execution.",
    inclusions: [
      "Cuisine and meal-period planning",
      "Veg, non-veg, Jain, vegan, and allergy notes",
      "Live counters, beverage stations, and late-night snacks",
      "Service staffing and buffet/plated flow",
    ],
    deliverables: [
      "Menu proposal",
      "Per-person or per-event pricing",
      "Tasting and revision notes",
      "Final service and setup checklist",
    ],
    eventFit: ["Welcome lunch", "Haldi brunch", "Sangeet dinner", "Wedding feast", "Reception"],
    questions: [
      "How many live counters are included?",
      "Can menus vary by event day?",
      "What staffing ratio is assumed?",
    ],
  },
  decor: {
    promise:
      "Visual direction from moodboards into real event setups, floral work, stage, tables, lighting, entries, and installations.",
    inclusions: [
      "Theme and palette translation",
      "Stage, mandap, entry, aisle, and table styling",
      "Floral, props, signage, and lighting coordination",
      "Setup, strike, and venue access planning",
    ],
    deliverables: [
      "Decor concept deck",
      "Area-wise inclusion list",
      "Setup render or reference board",
      "Production timeline",
    ],
    eventFit: ["Mehendi", "Haldi", "Sangeet", "Pheras", "Reception"],
    questions: [
      "Which areas are included in the agreed scope?",
      "What is rented vs custom-built?",
      "How many hours are needed for setup?",
    ],
  },
  photography: {
    promise:
      "Coverage planning, team size, deliverables, edit timelines, and story-led documentation across the full event.",
    inclusions: [
      "Lead photographer and supporting team",
      "Candid, traditional, and detail coverage",
      "Drone, reel, teaser, or film options where available",
      "Delivery timeline and album planning",
    ],
    deliverables: [
      "Edited photo gallery",
      "Highlight film or teaser options",
      "Raw/archival policy",
      "Album and print add-ons",
    ],
    eventFit: ["Pre-wedding", "Mehendi", "Sangeet", "Wedding", "Reception"],
    questions: [
      "How many shooters are included?",
      "What is the editing and delivery timeline?",
      "Are reels, drone, and albums included or add-ons?",
    ],
  },
  entertainment: {
    promise:
      "Performance format, technical requirements, show flow, sound checks, emcee cues, and guest-energy planning.",
    inclusions: [
      "Artist, DJ, band, emcee, or choreographer scope",
      "Set duration and performance flow",
      "Sound, light, and tech coordination notes",
      "Soundcheck and green-room requirements",
    ],
    deliverables: [
      "Performance run sheet",
      "Technical rider",
      "Playlist or act direction",
      "Setup and soundcheck schedule",
    ],
    eventFit: ["Welcome night", "Cocktail", "Sangeet", "After-party", "Reception"],
    questions: [
      "What equipment is included?",
      "How long is the performance set?",
      "What does the venue need to provide?",
    ],
  },
  makeup: {
    promise:
      "Bridal, groom, family, and touch-up planning with timing, artist allocation, products, and look references.",
    inclusions: [
      "Bridal or groom look planning",
      "Hair, makeup, draping, and touch-up options",
      "Family artist allocation",
      "Getting-ready room timing",
    ],
    deliverables: [
      "Look reference plan",
      "Trial or consultation notes",
      "Day-wise styling schedule",
      "Artist and assistant allocation",
    ],
    eventFit: ["Mehendi", "Haldi", "Wedding", "Reception", "After-party"],
    questions: [
      "Is a trial included?",
      "How many family members can be covered?",
      "How much time is needed per look?",
    ],
  },
};

function uniqueText(
  values: (string | null | undefined)[],
  fallback: string[]
): { values: string[]; source: "vendor" | "suggested" } {
  const seen = new Set<string>();
  const cleaned = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (cleaned.length > 0) return { values: cleaned, source: "vendor" };
  return { values: fallback, source: "suggested" };
}

function offeringForVendor(vendor: VendorCardApi): VendorOffering {
  const slug = vendor.category?.slug?.toLowerCase() ?? "";
  const blueprint = OFFERING_BLUEPRINTS[slug] ?? DEFAULT_OFFERING_BLUEPRINT;
  const services = vendor.services ?? [];
  const serviceScope = services.find((service) => service.service_scope)?.service_scope;
  const inclusions = uniqueText(
    services.flatMap((service) => service.inclusions ?? []),
    blueprint.inclusions
  );
  const deliverables = uniqueText(
    services.flatMap((service) => service.deliverables ?? []),
    blueprint.deliverables
  );
  const eventFit = uniqueText(
    services.flatMap((service) => service.event_type_fit ?? []),
    blueprint.eventFit
  );
  const addOns = uniqueText(
    services.flatMap((service) => service.add_ons ?? []),
    []
  );

  return {
    ...blueprint,
    promise: serviceScope ?? blueprint.promise,
    inclusions: inclusions.values,
    deliverables: deliverables.values,
    eventFit: eventFit.values,
    addOns: addOns.values,
    sources: {
      promise: serviceScope ? "vendor" : "suggested",
      inclusions: inclusions.source,
      deliverables: deliverables.source,
      eventFit: eventFit.source,
      addOns: addOns.source,
    },
  };
}

function servicePriceLabel(service: {
  base_price?: number | null;
  max_price?: number | null;
  unit?: string | null;
}) {
  const base = service.base_price ? priceLabel(service.base_price) : "On request";
  const max = service.max_price ? ` to ${priceLabel(service.max_price)}` : "";
  return `${base}${max}${service.unit ? ` · ${service.unit}` : ""}`;
}

function offeringLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type CatalogueRow = VendorServiceItemApi & { serviceName: string };

function catalogueItemsFromServices(services: VendorServiceApi[]): CatalogueRow[] {
  return services
    .flatMap((service) =>
      (service.items ?? []).map((item) => ({
        ...item,
        serviceName: service.name ?? "Package",
      }))
    )
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
}

function groupCatalogueItems(items: CatalogueRow[]) {
  const buckets = new Map<string, CatalogueRow[]>();
  for (const item of items) {
    const key = item.item_type || "inclusion";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return Array.from(buckets.entries()).map(([itemType, list]) => ({
    itemType,
    items: list,
  }));
}

function catalogueCountFromVendor(vendor: VendorCardApi) {
  return (vendor.services ?? []).reduce(
    (total, service) => total + (service.items?.length ?? 0),
    0
  );
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function serviceSummary(vendor: VendorCardApi) {
  const serviceCount = vendor.services?.length ?? 0;
  const catalogueCount = catalogueCountFromVendor(vendor);
  if (serviceCount === 0 && catalogueCount === 0) return "Scope on request";
  return [
    serviceCount > 0 ? pluralize(serviceCount, "package") : null,
    catalogueCount > 0 ? pluralize(catalogueCount, "catalogue row") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function sourceCopy(source: "vendor" | "suggested") {
  return source === "vendor" ? "Vendor listed" : "Planning prompt";
}

function BriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-accent text-[9px] uppercase tracking-[0.18em] text-ivory/45">
        {label}
      </p>
      <p className="mt-1 font-display text-xl text-ivory">{value}</p>
    </div>
  );
}

export default function ClientVendorsPage() {
  const [cat, setCat] = useState<Cat>("All");
  const [activeNeedId, setActiveNeedId] = useState<string>("full-plan");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [vendorLoadError, setVendorLoadError] = useState<string | null>(null);
  const [vendorReloadKey, setVendorReloadKey] = useState(0);
  const [vendors, setVendors] = useState<VendorCardApi[]>([]);
  const [plan, setPlan] = useState<VendorPlanPayload | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planReloadKey, setPlanReloadKey] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorDetailApi | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlanLoading(true);
      setPlanError(null);
      try {
        const response = await fetch("/api/wedding");
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to load event plan");
        }
        if (!cancelled) setPlan(json as VendorPlanPayload);
      } catch (error) {
        if (!cancelled) {
          setPlan(null);
          setPlanError(
            error instanceof Error ? error.message : "Failed to load event plan"
          );
        }
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planReloadKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saved-vendors");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load shortlist");
        if (!cancelled) {
          const next = Array.isArray(json.savedSlugs)
            ? json.savedSlugs
                .filter((slug: unknown): slug is string => typeof slug === "string")
            : [];
          setSavedSlugs(next);
        }
      } catch {
        if (!cancelled) {
          setSavedSlugs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setVendorLoadError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (cat !== "All") {
          const slug = categoryApiSlug[cat];
          if (slug) params.set("category", slug);
        }
        const res = await fetch(`/api/vendors?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setVendors((json.vendors ?? []) as VendorCardApi[]);
        }
      } catch (error) {
        if (!cancelled) {
          setVendors([]);
          setVendorLoadError(
            error instanceof Error ? error.message : "Failed to load vendors"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cat, q, vendorReloadKey]);

  useEffect(() => {
    if (!selectedSlug) {
      setSelectedVendor(null);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/vendors/${selectedSlug}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setSelectedVendor(json as VendorDetailApi);
          void fetch(`/api/vendors/${selectedSlug}/view`, {
            method: "POST",
            keepalive: true,
          }).catch(() => undefined);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedVendor(null);
          setDetailError(
            error instanceof Error ? error.message : "Failed to load vendor profile"
          );
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  const eventNeedFilters = useMemo(() => buildPlanNeedFilters(plan), [plan]);

  useEffect(() => {
    // An empty id is the deliberate "browsing by category, no lane selected"
    // sentinel set by chooseCategory. Only fall back when a lane that used to
    // exist has genuinely disappeared from the plan.
    if (!activeNeedId) return;
    if (!eventNeedFilters.some((need) => need.id === activeNeedId)) {
      setActiveNeedId("full-plan");
      setCat("All");
    }
  }, [activeNeedId, eventNeedFilters]);

  const filtered = useMemo(() => {
    let list = vendors;
    if (cat === "Venues") {
      list = list.filter((v) => {
        const categoryName = (v.category?.name ?? "").toLowerCase();
        return (
          categoryName.includes("venue") ||
          categoryName.includes("hospitality") ||
          categoryName.includes("hotel")
        );
      });
    }
    if (showSavedOnly) {
      list = list.filter((v) => savedSlugs.includes(v.slug));
    }
    return list;
  }, [vendors, cat, savedSlugs, showSavedOnly]);

  useEffect(() => {
    if (loading) return;
    if (filtered.length === 0) {
      if (selectedSlug !== null) setSelectedSlug(null);
      return;
    }
    if (selectedSlug && filtered.some((vendor) => vendor.slug === selectedSlug)) {
      return;
    }
    const firstVendor = filtered[0];
    if (firstVendor) setSelectedSlug(firstVendor.slug);
  }, [filtered, loading, selectedSlug]);

  const activeNeed =
    eventNeedFilters.find((need) => need.id === activeNeedId) ?? null;
  const selectedSummary =
    selectedVendor ?? vendors.find((vendor) => vendor.slug === selectedSlug) ?? null;
  const savedCount = savedSlugs.length;
  const resultStats = useMemo(
    () => ({
      vendors: filtered.length,
      packages: filtered.reduce(
        (total, vendor) => total + (vendor.services?.length ?? 0),
        0
      ),
      catalogue: filtered.reduce(
        (total, vendor) => total + catalogueCountFromVendor(vendor),
        0
      ),
    }),
    [filtered]
  );

  const chooseNeed = (need: EventNeedFilter) => {
    setActiveNeedId(need.id);
    setCat(need.category);
    setQ("");
    setShowSavedOnly(false);
  };

  const chooseCategory = (nextCat: Cat) => {
    setActiveNeedId(nextCat === "All" ? "full-plan" : "");
    setCat(nextCat);
  };

  const toggleSaved = async (slug: string) => {
    const isSaved = savedSlugs.includes(slug);
    setSyncingSlug(slug);

    try {
      const res = await fetch(
        isSaved ? `/api/saved-vendors/${slug}` : "/api/saved-vendors",
        isSaved
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug }),
            }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update shortlist");

      setSavedSlugs((current) =>
        isSaved
          ? current.filter((entry) => entry !== slug)
          : current.includes(slug)
            ? current
            : [...current, slug]
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update shortlist"
      );
    } finally {
      setSyncingSlug(null);
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden border border-charcoal/10 bg-ivory"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.22),transparent_32%),linear-gradient(135deg,rgba(231,223,201,0.66),rgba(245,240,226,0.92)_52%,rgba(164,172,134,0.18))]" />
        <div className="relative grid gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="max-w-3xl">
            <p className={dashLabel}>Vendor sourcing board</p>
            <h2 className="font-display mt-2 max-w-2xl text-3xl font-semibold leading-tight text-charcoal md:text-5xl">
              Choose vendors for the function, not the directory.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate md:text-base">
              Start with an event day or requirement, then compare packages,
              catalogue rows, pricing cues, and fit before adding anyone to your
              shortlist.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/client/wedding" className={dashBtn}>
                Open event plan
              </Link>
              <button
                type="button"
                onClick={() => setShowSavedOnly((value) => !value)}
                className={cn(
                  "font-accent inline-flex items-center justify-center border px-5 py-3 text-[11px] uppercase tracking-[0.2em] transition-all duration-500",
                  showSavedOnly
                    ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                    : "border-charcoal/15 text-charcoal hover:border-gold-primary hover:text-gold-dark"
                )}
              >
                {showSavedOnly ? "Showing shortlist" : "View shortlist"}
              </button>
            </div>
          </div>

          <div className="border border-charcoal/10 bg-charcoal p-4 text-ivory shadow-[0_24px_80px_rgba(51,61,41,0.16)]">
            <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-gold-light">
              Current brief
            </p>
            <h3 className="mt-2 font-display text-2xl leading-tight">
              {planError ? "Plan context unavailable" : activeNeed?.label ?? cat}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ivory/70">
              {planError
                ? "Vendor browsing is still available, but no function is being presented as covered until the event plan reconnects."
                : activeNeed?.intent ??
                "Manual category filter selected. Use the function lanes below to return to plan-first sourcing."}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-ivory/10 pt-4">
              <BriefMetric label="Saved" value={String(savedCount)} />
              <BriefMetric label="Matches" value={String(resultStats.vendors)} />
              <BriefMetric label="Packages" value={String(resultStats.packages)} />
            </div>
            {savedCount === 0 ? (
              <div className="mt-4 border border-dashed border-gold-light/30 bg-ivory/5 p-3">
                <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-light">
                  Shortlist starts here
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ivory/68">
                  Open a brief and save vendors with real profiles, service
                  scope, and catalogue detail.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={fadeUp}
        className="mt-6 border border-charcoal/8 bg-ivory p-4 md:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:items-end">
          <div>
            <p className={dashLabel}>Choose sourcing context</p>
            {planError ? (
              <div className="mt-3 flex flex-col gap-3 border border-rose/25 bg-rose/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-charcoal">
                  The event plan could not be loaded, so function-specific vendor
                  coverage is temporarily hidden.
                </p>
                <button
                  type="button"
                  onClick={() => setPlanReloadKey((key) => key + 1)}
                  className="shrink-0 font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark underline underline-offset-4"
                >
                  Retry plan
                </button>
              </div>
            ) : planLoading ? (
              <div className="mt-3 h-16 animate-pulse border border-charcoal/8 bg-charcoal/5" />
            ) : (
              <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 scrollbar-elysian">
                {eventNeedFilters.map((need) => {
                  const active = activeNeedId === need.id;
                  return (
                    <button
                      key={need.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => chooseNeed(need)}
                      className={cn(
                        "shrink-0 snap-start border px-3.5 py-2.5 text-left transition-colors",
                        active
                          ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                          : "border-charcoal/10 text-slate hover:border-gold-primary hover:text-charcoal"
                      )}
                    >
                      <span className="flex items-center justify-between gap-4 font-accent text-[9px] uppercase tracking-[0.16em]">
                        {need.day}
                        <span className={need.isGap ? "text-rose" : "text-sage"}>
                          {need.isGap ? "Open" : "Covered"}
                        </span>
                      </span>
                      <span className="mt-1 block max-w-72 truncate font-heading text-sm">
                        {need.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-charcoal/8 pt-3">
              {categories.map((c) => {
                const active = cat === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseCategory(c)}
                    className={cn(
                      "font-accent border px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors",
                      active
                        ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                        : "border-charcoal/10 text-slate hover:border-gold-primary hover:text-charcoal"
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="vendor-disc-search" className={dashLabel}>
              Search within matches
            </label>
            <input
              id="vendor-disc-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Vendor, city, style, or package"
              className="mt-3 w-full border border-charcoal/15 bg-cream/30 px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal/35 focus:border-gold-primary"
            />
          </div>
        </div>
      </motion.section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div>
          <div className="mb-4 flex flex-col gap-3 border-b border-charcoal/10 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={dashLabel}>Matching vendor briefs</p>
              <h3 className="mt-1 font-display text-2xl text-charcoal">
                {activeNeed?.label ?? `${cat} vendors`}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate">
                {showSavedOnly
                  ? "Showing only vendors saved to your account."
                  : activeNeed?.intent ??
                    "Category view is active. Open a function lane when you want event-plan-first sourcing."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="border border-charcoal/10 bg-ivory px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                {pluralize(resultStats.vendors, "vendor")}
              </span>
              <span className="border border-charcoal/10 bg-ivory px-3 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                {pluralize(resultStats.catalogue, "catalogue row")}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse border border-charcoal/8 bg-charcoal/5"
                />
              ))}
            </div>
          ) : vendorLoadError ? (
            <VendorDiscoveryEmptyState
              title="Vendor matches could not be loaded"
              hint="Your shortlist and event plan are unchanged. Retry the live catalogue connection."
              primaryLabel="Retry vendors"
              onPrimary={() => setVendorReloadKey((key) => key + 1)}
            />
          ) : filtered.length === 0 ? (
            <VendorDiscoveryEmptyState
              title={
                showSavedOnly
                  ? "No shortlisted vendors for this planning pass"
                  : q.trim()
                    ? "No vendors match this brief"
                    : "No vendors published for this need yet"
              }
              hint={
                showSavedOnly
                  ? "Browse the sourcing board and save vendors from their brief."
                  : q.trim()
                    ? "Clear search or move back to the full plan to widen the pool."
                    : "Try all open gaps or another function while the catalogue grows."
              }
              primaryLabel={
                showSavedOnly
                  ? "Browse all vendors"
                  : q.trim()
                    ? "Clear search"
                    : "Show all gaps"
              }
              onPrimary={() => {
                if (showSavedOnly) {
                  setShowSavedOnly(false);
                  return;
                }
                if (q.trim()) {
                  setQ("");
                  return;
                }
                chooseNeed(eventNeedFilters[0]);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filtered.map((v) => {
                const loc = formatLocation(v.city, v.country);
                const catName = v.category?.name ?? "Vendor";
                const isSaved = savedSlugs.includes(v.slug);
                const isSelected = selectedSlug === v.slug;
                const offering = offeringForVendor(v);
                const fit = offering.eventFit.slice(0, 3);
                const catalogueCount = catalogueCountFromVendor(v);

                return (
                  <motion.article
                    key={v.id}
                    variants={staggerItem}
                    className={cn(
                      "overflow-hidden border bg-ivory transition-all duration-300",
                      isSelected
                        ? "border-gold-primary/55 shadow-[0_20px_60px_rgba(201,169,110,0.16)]"
                        : "border-charcoal/8 hover:border-gold-primary/35"
                    )}
                  >
                    <div className="relative min-h-36 overflow-hidden border-b border-charcoal/8 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.30),transparent_35%),linear-gradient(135deg,#333D29_0%,#414833_54%,#1f2717_100%)] p-4 text-ivory">
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-gold-light/20" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div>
                          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light">
                            Function fit
                          </p>
                          <p className="mt-2 font-display text-2xl leading-tight">
                            {fit[0] ?? "Event support"}
                          </p>
                        </div>
                        <span className="border border-ivory/15 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.14em] text-ivory/75">
                          {catName}
                        </span>
                      </div>
                      <div className="relative mt-5 flex flex-wrap gap-2">
                        {fit.map((eventName) => (
                          <span
                            key={`${v.id}-${eventName}`}
                            className="border border-ivory/15 bg-ivory/8 px-2 py-1 font-heading text-[11px] text-ivory/80"
                          >
                            {eventName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-xl leading-tight text-charcoal">
                            {v.business_name}
                          </h3>
                          <p className="mt-1 text-sm text-slate">{loc}</p>
                        </div>
                        <span
                          className={cn(
                            statusBadgeBase,
                            v.is_verified
                              ? "border-sage/50 text-sage"
                              : "border-gold-primary/50 text-gold-dark"
                          )}
                        >
                          {v.is_verified ? "Verified" : "Profile"}
                        </span>
                      </div>
                      <p className="font-heading mt-3 line-clamp-2 text-sm leading-relaxed text-slate">
                        {v.short_bio ??
                          "Open the brief for scope, pricing, catalogue, and review context."}
                      </p>

                      <div className="mt-4 border border-charcoal/8 bg-cream/35 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className={dashLabel}>Need coverage</p>
                          <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
                            {sourceCopy(offering.sources.promise)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate">
                          {offering.promise}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MetricCard label="Starting from" value={priceRangeFromVendor(v)} />
                        <MetricCard label="Rating" value={ratingLabel(v.rating)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="border border-charcoal/10 bg-ivory px-2.5 py-1.5 font-heading text-[11px] text-charcoal/75">
                          {serviceSummary(v)}
                        </span>
                        {catalogueCount > 0 ? (
                          <span className="border border-gold-primary/25 bg-gold-primary/8 px-2.5 py-1.5 font-heading text-[11px] text-gold-dark">
                            Catalogue preview ready
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSlug(v.slug)}
                          className={dashBtn}
                        >
                          {isSelected ? "Brief open" : "Open brief"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleSaved(v.slug)}
                          disabled={syncingSlug === v.slug}
                          className={cn(
                            savedBtn,
                            syncingSlug === v.slug && "cursor-wait opacity-70",
                            isSaved
                              ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                              : "border-charcoal/20 text-charcoal hover:border-gold-primary hover:text-gold-dark"
                          )}
                        >
                          {syncingSlug === v.slug
                            ? "Saving..."
                            : isSaved
                              ? "Shortlisted"
                              : "Shortlist"}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="self-start">
          <div className="sticky top-6 overflow-hidden border border-charcoal/8 bg-ivory">
            <div className="border-b border-charcoal/8 bg-cream/35 p-5">
              <p className={dashLabel}>Selected vendor brief</p>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                Review fit, services, catalogue rows, and proof before adding the
                vendor to your event plan shortlist.
              </p>
            </div>
            <div className="p-5">
              {detailLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-48 bg-charcoal/5" />
                  <div className="h-6 w-48 bg-charcoal/5" />
                  <div className="h-4 w-32 bg-charcoal/5" />
                  <div className="h-24 bg-charcoal/5" />
                </div>
              ) : detailError ? (
                <ListEmptyState title="Could not load profile" hint={detailError} />
              ) : selectedSummary ? (
                <VendorDetailPanel
                  vendor={selectedVendor ?? selectedSummary}
                  isSaved={savedSlugs.includes(selectedSummary.slug)}
                  saving={syncingSlug === selectedSummary.slug}
                  onToggleSaved={() => void toggleSaved(selectedSummary.slug)}
                />
              ) : (
                <ListEmptyState
                  title="Open a vendor brief"
                  hint="Pick a vendor card to compare packages, catalogue rows, and shortlist fit."
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function VendorDiscoveryEmptyState({
  title,
  hint,
  primaryLabel,
  onPrimary,
}: {
  title: string;
  hint: string;
  primaryLabel: string;
  onPrimary: () => void;
}) {
  return (
    <div className="border border-dashed border-charcoal/15 bg-ivory p-8 text-center">
      <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
        Sourcing gap
      </p>
      <h3 className="mt-3 font-display text-2xl text-charcoal">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate">
        {hint}
      </p>
      <button type="button" onClick={onPrimary} className={cn(dashBtn, "mt-5")}>
        {primaryLabel}
      </button>
    </div>
  );
}

function VendorDetailPanel({
  vendor,
  isSaved,
  saving,
  onToggleSaved,
}: {
  vendor: VendorDetailApi | VendorCardApi;
  isSaved: boolean;
  saving: boolean;
  onToggleSaved: () => void;
}) {
  const reviews = sortReviews("reviews" in vendor ? vendor.reviews : null);
  const services = (vendor.services ?? []).slice(0, 6);
  const offering = offeringForVendor(vendor);
  const catalogueItems = catalogueItemsFromServices(services);
  const categoryDetails = categoryCopy(vendor.category?.slug);
  const detailCopy =
    "description" in vendor
      ? vendor.description ?? vendor.short_bio ?? "Detailed profile available below."
      : vendor.short_bio ?? "Open the profile for the full vendor detail.";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden border border-charcoal/10 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.30),transparent_35%),linear-gradient(145deg,#333D29_0%,#414833_58%,#1f2717_100%)] p-4 text-ivory">
        <div className="absolute -bottom-12 -right-10 h-36 w-36 rounded-full border border-gold-light/18" />
        <div className="relative">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light">
            Sourcing brief
          </p>
          <h3 className="mt-3 font-display text-3xl leading-tight">
            {vendor.business_name}
          </h3>
          <p className="mt-2 text-sm text-ivory/68">
            {formatLocation(vendor.city, vendor.country)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <BriefMetric label="Price cue" value={priceRangeFromVendor(vendor)} />
            <BriefMetric label="Packages" value={String(services.length)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={dashLabel}>Vendor context</p>
          <p className="mt-2 text-sm leading-relaxed text-slate">{detailCopy}</p>
        </div>
        <span
          className={cn(
            statusBadgeBase,
            "border-gold-primary/50 text-gold-dark"
          )}
        >
          {vendor.category?.name ?? "Vendor"}
        </span>
      </div>

      <div className="border border-charcoal/10 bg-[radial-gradient(circle_at_top_left,rgba(166,138,100,0.2),transparent_34%),linear-gradient(145deg,var(--charcoal-brown)_0%,var(--ebony)_58%,var(--dark-walnut)_100%)] p-4 text-ivory">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light">
            {offering.sources.promise === "vendor"
              ? "Offering map"
              : "Offering map — generic outline"}
          </p>
          {offering.sources.promise === "suggested" ? (
            <span className="font-accent border border-ivory/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-ivory/70">
              Vendor scope pending
            </span>
          ) : null}
        </div>
        <h4 className="mt-2 font-display text-xl text-ivory">
          {offering.sources.promise === "vendor"
            ? "What this vendor actually handles"
            : "What a vendor like this typically handles"}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-ivory/72">
          {offering.promise}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Rating" value={ratingLabel(vendor.rating)} />
        <MetricCard
          label="Reviews"
          value={String(vendor.review_count ?? reviews.length ?? 0)}
        />
        <MetricCard
          label="Experience"
          value={vendor.experience ? `${vendor.experience}+ yrs` : "On request"}
        />
        <MetricCard label="Price cue" value={priceRangeFromVendor(vendor)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onToggleSaved}
          className={cn(
            savedBtn,
            saving && "cursor-wait opacity-70",
            isSaved
              ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
              : "border-charcoal/20 text-charcoal hover:border-gold-primary hover:text-gold-dark"
          )}
        >
          {saving ? "Saving..." : isSaved ? "Shortlisted" : "Shortlist"}
        </button>
        <a
          href="#vendor-services"
          className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          Review packages
        </a>
      </div>

      <div>
        <p className={dashLabel}>Top-to-bottom scope</p>
        <div className="mt-3 grid gap-3">
          <OfferingBlock
            title="Inclusions"
            items={offering.inclusions}
            source={offering.sources.inclusions}
          />
          <OfferingBlock
            title="Deliverables"
            items={offering.deliverables}
            source={offering.sources.deliverables}
          />
          <OfferingBlock
            title="Best fit events"
            items={offering.eventFit}
            source={offering.sources.eventFit}
          />
          {offering.addOns.length > 0 ? (
            <OfferingBlock
              title="Add-ons and upgrades"
              items={offering.addOns}
              source={offering.sources.addOns}
            />
          ) : null}
        </div>
      </div>

      {catalogueItems.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={dashLabel}>Catalogue preview</p>
              <h4 className="mt-1 font-display text-xl text-charcoal">
                {categoryDetails.catalogueLabel}
              </h4>
            </div>
            <span className="font-accent border border-gold-primary/40 bg-gold-primary/8 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gold-dark">
              {pluralize(catalogueItems.length, "row")}
            </span>
          </div>
          <div className="mt-3 space-y-4">
            {groupCatalogueItems(catalogueItems).map((group) => (
              <div key={group.itemType} className="border border-charcoal/8 bg-cream/35 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                    {categoryDetails.groupHeadings[group.itemType] ??
                      offeringLabel(group.itemType)}
                  </p>
                  <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                    {pluralize(group.items.length, "item")}
                  </span>
                </div>
                <ul className="mt-3 list-none space-y-3 pl-0">
                  {group.items.slice(0, 6).map((item) => (
                    <li key={item.id} className="border-t border-charcoal/8 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start gap-3">
                        {item.image_urls && item.image_urls.length > 0 ? (
                          <div className="h-16 w-16 shrink-0 overflow-hidden border border-charcoal/10 bg-ivory">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_urls[0]}
                              alt=""
                              width={64}
                              height={64}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-heading text-base leading-tight text-charcoal">
                                {item.name}
                              </p>
                              <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                                {item.serviceName}
                              </p>
                            </div>
                            {item.dietary_tags?.length ? (
                              <span className="border border-sage/30 bg-ivory px-2 py-1 font-heading text-[11px] text-sage">
                                {item.dietary_tags.slice(0, 2).join(", ")}
                              </span>
                            ) : null}
                          </div>
                          {item.description ? (
                            <p className="mt-2 text-xs leading-relaxed text-slate">
                              {item.description}
                            </p>
                          ) : null}
                          {item.image_urls && item.image_urls.length > 1 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.image_urls.slice(1, 5).map((url, i) => (
                                <div
                                  key={`${url}-${i}`}
                                  className="h-10 w-10 overflow-hidden border border-charcoal/10 bg-ivory"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt=""
                                    width={40}
                                    height={40}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {item.reference_url ? (
                            <a
                              href={item.reference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark hover:text-gold-primary"
                            >
                              View moodboard
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={dashLabel}>Catalogue preview</p>
              <h4 className="mt-1 font-display text-xl text-charcoal">
                {categoryDetails.catalogueLabel}
              </h4>
            </div>
            <span className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate">
              Not itemized yet
            </span>
          </div>
          <div className="mt-3 border border-dashed border-charcoal/15 bg-cream/30 p-4">
            <p className="text-sm leading-relaxed text-slate">
              This vendor has not published itemized rows yet. Use these prompts when
              you reach out:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryDetails.exampleItemNames.map((name) => (
                <span
                  key={name}
                  className="border border-charcoal/12 bg-ivory px-2.5 py-1.5 font-heading text-[11px] text-charcoal/80"
                >
                  {name}?
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div id="vendor-services" className="scroll-mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={dashLabel}>Services and packages</p>
            <h4 className="mt-1 font-display text-xl text-charcoal">
              Compare the actual sellable scope
            </h4>
          </div>
          <span className="shrink-0 border border-charcoal/12 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            {services.length} listed
          </span>
        </div>
        {services.length > 0 ? (
          <div className="mt-3 space-y-3">
            {services.map((service, index) => (
              <div
                key={`${service.name ?? "service"}-${index}`}
                className="border border-charcoal/8 bg-cream/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
                      Package {index + 1}
                    </p>
                    <p className="mt-1 font-heading text-base leading-tight text-charcoal">
                      {service.name ?? "Service"}
                    </p>
                    {service.service_scope ? (
                      <p className="mt-2 text-sm leading-relaxed text-charcoal">
                        {service.service_scope}
                      </p>
                    ) : null}
                    {service.description ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 border border-gold-primary/35 bg-ivory px-2 py-1 text-right font-accent text-[10px] uppercase tracking-[0.15em] text-gold-dark">
                    {servicePriceLabel(service)}
                  </p>
                </div>
                <ServiceDetailTags
                  label="Best for"
                  items={service.event_type_fit ?? []}
                />
                <ServiceDetailTags
                  label="Includes"
                  items={service.inclusions ?? []}
                />
                <ServiceDetailTags
                  label="Deliverables"
                  items={service.deliverables ?? []}
                />
                <ServiceDetailTags
                  label="Add-ons"
                  items={service.add_ons ?? []}
                />
                {service.items?.length ? (
                  <div className="mt-3 border-t border-charcoal/8 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                        Catalogue rows attached
                      </p>
                      <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark">
                        {pluralize(service.items.length, "row")}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {service.items.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="border border-charcoal/8 bg-ivory px-3 py-2 text-xs leading-relaxed text-slate"
                        >
                          <span className="text-charcoal">{item.name}</span>
                          <span> · {offeringLabel(item.item_type)}</span>
                          {item.dietary_tags?.length ? (
                            <span> · {item.dietary_tags.join(", ")}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 border border-dashed border-charcoal/12 bg-cream/30 p-4">
            <p className="text-sm text-slate">
              Packages are not listed yet. Shortlist this vendor so the Elysian team
              can confirm the complete scope and final pricing with you.
            </p>
          </div>
        )}
      </div>

      <div className="border border-charcoal/8 bg-cream/35 p-4">
        <p className={dashLabel}>Ask before booking</p>
        <ul className="mt-3 list-none space-y-2 pl-0">
          {offering.questions.map((question) => (
            <li key={question} className="text-sm leading-relaxed text-slate">
              {question}
            </li>
          ))}
        </ul>
      </div>

      {reviews.length > 0 ? (
        <div>
          <p className={dashLabel}>Recent reviews</p>
          <div className="mt-3 space-y-3">
            {reviews.slice(0, 2).map((review) => (
              <div key={review.id} className="border border-charcoal/8 bg-cream/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-charcoal">{review.title ?? "Guest feedback"}</p>
                    <p className="mt-1 text-xs text-slate">
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-gold-dark">
                    {review.rating}/5
                  </span>
                </div>
                {review.content ? <p className="mt-3 text-sm leading-relaxed text-slate">{review.content}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-charcoal/12 bg-cream/30 p-4">
          <p className="text-sm text-slate">No published reviews yet.</p>
        </div>
      )}
    </div>
  );
}

function OfferingBlock({
  title,
  items,
  source = "vendor",
}: {
  title: string;
  items: string[];
  source?: "vendor" | "suggested";
}) {
  const isSuggested = source === "suggested";
  return (
    <div
      className={cn(
        "border p-4",
        isSuggested
          ? "border-dashed border-charcoal/15 bg-ivory/60"
          : "border-charcoal/8 bg-cream/35"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
          {isSuggested ? `${title} — talking points` : title}
        </p>
        <span
          className={cn(
            "font-accent px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]",
            isSuggested
              ? "border border-charcoal/15 text-slate"
              : "border border-gold-primary/40 bg-gold-primary/8 text-gold-dark"
          )}
        >
          {isSuggested ? "Suggested" : `${items.length} listed`}
        </span>
      </div>
      {isSuggested ? (
        <p className="mt-2 text-xs leading-relaxed text-slate">
          The vendor has not confirmed this yet — use these as questions when you
          shortlist them.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              "px-2.5 py-1.5 font-heading text-[11px]",
              isSuggested
                ? "border border-dashed border-charcoal/20 bg-ivory text-charcoal/70"
                : "border border-charcoal/10 bg-ivory text-charcoal"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ServiceDetailTags({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  const visibleItems = items.filter(Boolean).slice(0, 5);
  if (visibleItems.length === 0) return null;

  return (
    <div className="mt-3 border-t border-charcoal/8 pt-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <span
            key={`${label}-${item}`}
            className="border border-charcoal/10 bg-ivory px-2 py-1 font-heading text-[11px] text-charcoal"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-charcoal/8 bg-cream/40 p-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
        {label}
      </p>
      <p className="mt-2 font-display text-lg text-charcoal">{value}</p>
    </div>
  );
}

function priceLabel(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L+`;
  return `₹${(amount / 1000).toFixed(0)}K+`;
}
