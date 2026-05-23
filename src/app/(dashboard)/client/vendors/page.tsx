"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { categoryCopy } from "@/lib/vendor-offering";
import { cn } from "@/lib/utils";

const categories = [
  "All",
  "Photography",
  "Decor",
  "Catering",
  "Music & DJ",
  "Makeup",
  "Venues",
] as const;

type Cat = (typeof categories)[number];

const categoryApiSlug: Record<Exclude<Cat, "All">, string | null> = {
  Photography: "photography",
  Decor: "decor",
  Catering: "catering",
  "Music & DJ": "entertainment",
  Makeup: "makeup",
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
    "A complete wedding service scope with planning notes, pricing cues, and deliverables that can be matched to individual events.",
  inclusions: [
    "Pre-event consultation",
    "Event-specific scope alignment",
    "On-ground execution support",
    "Final confirmation checklist",
  ],
  deliverables: [
    "Service proposal",
    "Package or quote breakdown",
    "Timeline coordination notes",
    "Final handover before event day",
  ],
  eventFit: ["Welcome dinner", "Haldi", "Sangeet", "Wedding", "Reception"],
  questions: [
    "What is included in the base quote?",
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
      "Which areas are included in the quoted scope?",
      "What is rented vs custom-built?",
      "How many hours are needed for setup?",
    ],
  },
  photography: {
    promise:
      "Coverage planning, team size, deliverables, edit timelines, and story-led documentation across the full wedding.",
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

export default function ClientVendorsPage() {
  const [cat, setCat] = useState<Cat>("All");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorCardApi[]>([]);
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
      } catch {
        if (!cancelled) setVendors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cat, q]);

  useEffect(() => {
    if (!selectedSlug && vendors.length > 0) {
      setSelectedSlug(vendors[0].slug);
    }
  }, [selectedSlug, vendors]);

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
        if (!cancelled) setSelectedVendor(json as VendorDetailApi);
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

  const selectedSummary = selectedVendor ?? vendors.find((vendor) => vendor.slug === selectedSlug) ?? null;
  const savedCount = savedSlugs.length;

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
      <motion.div variants={fadeUp} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className={dashLabel}>Discovery</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal md:text-4xl">
            Vendors
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
            A curated vendor marketplace with real profiles, real pricing cues, and
            a shortlist synced to your account so your planning follows you across
            sessions and devices.
          </p>
          {savedCount === 0 ? (
            <div className="mt-4 border border-dashed border-gold-primary/30 bg-gold-primary/8 px-4 py-3">
              <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
                Start your shortlist
              </p>
              <p className="mt-1 text-sm leading-relaxed text-charcoal">
                Open a profile and tap <span className="text-gold-dark">Shortlist</span> to
                save vendors here. You can compare their catalogues, scope, and
                imagery before reaching out.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="border border-charcoal/8 bg-ivory px-4 py-3">
            <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
              Saved to your account
            </p>
            <p className="mt-1 font-display text-lg text-charcoal">{savedCount}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSavedOnly((value) => !value)}
            className={cn(
              "font-accent inline-flex items-center justify-center border px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-all duration-500",
              showSavedOnly
                ? "border-gold-primary bg-gold-primary/10 text-gold-dark"
                : "border-charcoal/15 text-charcoal hover:border-gold-primary hover:text-gold-dark"
            )}
          >
            {showSavedOnly ? "Showing saved" : "View saved"}
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8">
        <label htmlFor="vendor-disc-search" className={dashLabel}>
          Search
        </label>
        <input
          id="vendor-disc-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, city, or style"
          className="mt-3 w-full max-w-xl border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-2 border-b border-charcoal/15 pb-4">
        {categories.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
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
      </motion.div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse border border-charcoal/8 bg-charcoal/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <ListEmptyState
              title={showSavedOnly ? "No saved vendors yet" : q.trim() ? "No vendors match your search" : "No vendors in this destination"}
              hint={
                showSavedOnly
                  ? "Shortlist vendors to keep a synced list attached to your account."
                  : q.trim()
                    ? "Try a different name or category."
                    : "Select a different location or check back later as more vendors are added."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filtered.map((v) => {
                const loc = formatLocation(v.city, v.country);
                const catName = v.category?.name ?? "Vendor";
                const isSaved = savedSlugs.includes(v.slug);
                const isSelected = selectedSlug === v.slug;
                const offering = offeringForVendor(v);

                return (
                  <motion.article
                    key={v.id}
                    variants={staggerItem}
                    className={cn(
                      dashCard,
                      "border transition-all duration-300",
                      isSelected
                        ? "border-gold-primary/45 shadow-[0_20px_50px_rgba(201,169,110,0.12)]"
                        : "border-charcoal/8"
                    )}
                  >
                    <div className="aspect-[4/3] border border-charcoal/10 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.22),transparent_35%),linear-gradient(145deg,#111827_0%,#292536_55%,#0f172a_100%)]" />
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg text-charcoal">{v.business_name}</h3>
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
                        {catName}
                      </span>
                    </div>
                    <p className="font-heading mt-3 line-clamp-2 text-sm text-slate">
                      {v.short_bio ?? "Open the profile for more detail and pricing context."}
                    </p>
                    <div className="mt-4 border border-charcoal/8 bg-cream/35 p-3">
                      <p className={dashLabel}>What they cover</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate">
                        {offering.promise}
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="border border-charcoal/8 bg-cream/40 p-3">
                        <p className={dashLabel}>Rating</p>
                        <p className="mt-2 font-display text-lg text-charcoal">{ratingLabel(v.rating)}</p>
                      </div>
                      <div className="border border-charcoal/8 bg-cream/40 p-3">
                        <p className={dashLabel}>Starting from</p>
                        <p className="mt-2 font-display text-lg text-charcoal">{priceRangeFromVendor(v)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSlug(v.slug)}
                        className={dashBtn}
                      >
                        View Profile
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
                            ? "Saved"
                            : "Shortlist"}
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="self-start">
          <div className="sticky top-6 border border-charcoal/8 bg-ivory p-5">
            <p className={dashLabel}>Profile preview</p>
            {detailLoading ? (
              <div className="mt-4 space-y-3 animate-pulse">
                <div className="h-56 bg-charcoal/5" />
                <div className="h-6 w-48 bg-charcoal/5" />
                <div className="h-4 w-32 bg-charcoal/5" />
                <div className="h-24 bg-charcoal/5" />
              </div>
            ) : detailError ? (
              <div className="mt-4">
                <ListEmptyState title="Could not load profile" hint={detailError} />
              </div>
            ) : selectedSummary ? (
              <VendorDetailPanel
                vendor={selectedVendor ?? selectedSummary}
                isSaved={savedSlugs.includes(selectedSummary.slug)}
                saving={syncingSlug === selectedSummary.slug}
                onToggleSaved={() => void toggleSaved(selectedSummary.slug)}
                onSelectSlug={setSelectedSlug}
              />
            ) : (
              <ListEmptyState
                title="Open a vendor profile"
                hint="Pick a vendor card to see the full profile, services, and reviews here."
              />
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function VendorDetailPanel({
  vendor,
  isSaved,
  saving,
  onToggleSaved,
  onSelectSlug,
}: {
  vendor: VendorDetailApi | VendorCardApi;
  isSaved: boolean;
  saving: boolean;
  onToggleSaved: () => void;
  onSelectSlug: (slug: string) => void;
}) {
  const reviews = sortReviews("reviews" in vendor ? vendor.reviews : null);
  const services = (vendor.services ?? []).slice(0, 6);
  const offering = offeringForVendor(vendor);
  const catalogueItems = catalogueItemsFromServices(services);
  const detailCopy =
    "description" in vendor
      ? vendor.description ?? vendor.short_bio ?? "Detailed profile available below."
      : vendor.short_bio ?? "Open the profile for the full vendor detail."

  return (
    <div className="mt-4 space-y-5">
      <div className="aspect-[4/3] overflow-hidden border border-charcoal/10 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_35%),linear-gradient(155deg,#111827_0%,#1f2937_55%,#0b1220_100%)]" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-2xl text-charcoal">{vendor.business_name}</h3>
          <p className="mt-1 text-sm text-slate">
            {formatLocation(vendor.city, vendor.country)}
          </p>
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

      <p className="text-sm leading-relaxed text-slate">
        {detailCopy}
      </p>

      <div className="border border-charcoal/10 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.2),transparent_34%),linear-gradient(145deg,#111827_0%,#1f2937_58%,#0b1220_100%)] p-4 text-ivory">
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
          {saving ? "Saving..." : isSaved ? "Saved" : "Shortlist"}
        </button>
        <button
          type="button"
          onClick={() => onSelectSlug(vendor.slug)}
          className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          Refresh profile
        </button>
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
            <p className={dashLabel}>{categoryCopy(vendor.category?.slug).catalogueLabel}</p>
            <span className="font-accent border border-gold-primary/40 bg-gold-primary/8 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gold-dark">
              {catalogueItems.length} listed by vendor
            </span>
          </div>
          <div className="mt-3 space-y-4">
            {groupCatalogueItems(catalogueItems).map((group) => (
              <div key={group.itemType} className="border border-charcoal/8 bg-cream/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
                    {categoryCopy(vendor.category?.slug).groupHeadings[group.itemType] ??
                      offeringLabel(group.itemType)}
                  </p>
                  <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                    {group.items.length}
                  </span>
                </div>
                <ul className="mt-3 list-none space-y-2 pl-0">
                  {group.items.slice(0, 6).map((item) => (
                    <li key={item.id} className="border-t border-charcoal/8 pt-2 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-start gap-3">
                        {item.image_urls && item.image_urls.length > 0 ? (
                          <div className="h-14 w-14 shrink-0 overflow-hidden border border-charcoal/10 bg-cream/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_urls[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-heading text-sm text-charcoal">
                              {item.name}
                            </p>
                            <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                              {item.serviceName}
                            </p>
                          </div>
                          {item.dietary_tags?.length ? (
                            <span className="border border-sage/30 px-2 py-1 font-heading text-[11px] text-sage">
                              {item.dietary_tags.slice(0, 2).join(", ")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {item.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-slate">
                          {item.description}
                        </p>
                      ) : null}
                      {item.image_urls && item.image_urls.length > 1 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.image_urls.slice(1, 5).map((url, i) => (
                            <div
                              key={`${url}-${i}`}
                              className="h-10 w-10 overflow-hidden border border-charcoal/10 bg-cream/40"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
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
                          View moodboard →
                        </a>
                      ) : null}
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
            <p className={dashLabel}>{categoryCopy(vendor.category?.slug).catalogueLabel}</p>
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
              {categoryCopy(vendor.category?.slug).exampleItemNames.map((name) => (
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

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className={dashLabel}>Services and packages</p>
          <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-charcoal">{service.name ?? "Service"}</p>
                    {service.service_scope ? (
                      <p className="mt-2 text-xs leading-relaxed text-charcoal">
                        {service.service_scope}
                      </p>
                    ) : null}
                    {service.description ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-right font-accent text-[10px] uppercase tracking-[0.15em] text-gold-dark">
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
                    <p className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                      Selectable items
                    </p>
                    <div className="mt-2 space-y-2">
                      {service.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="text-xs leading-relaxed text-slate">
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
              Packages are not listed yet. Use the shortlist to request a full scope
              and quote.
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
