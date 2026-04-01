"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
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
  services: { base_price?: number; name?: string }[] | null;
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

      {services.length > 0 ? (
        <div>
          <p className={dashLabel}>Services</p>
          <div className="mt-3 space-y-2">
            {services.map((service, index) => (
              <div
                key={`${service.name ?? "service"}-${index}`}
                className="flex items-center justify-between gap-3 border border-charcoal/8 bg-cream/40 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-charcoal">{service.name ?? "Service"}</p>
                </div>
                <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                  {service.base_price ? priceLabel(service.base_price) : "On request"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
