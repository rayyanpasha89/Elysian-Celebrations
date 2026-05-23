import Link from "next/link";
import { redirect } from "next/navigation";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { getOptionalAuthSession } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PortfolioRow = {
  id: string;
  business_name: string | null;
  slug: string | null;
  cover_image: string | null;
  portfolio: string[] | null;
};

async function loadVendorPortfolio() {
  const session = await getOptionalAuthSession();
  if (!session) return { kind: "unauthenticated" as const };
  if (session.role !== "vendor") return { kind: "forbidden" as const };

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, slug, cover_image, portfolio")
    .eq("user_id", session.userId)
    .maybeSingle<PortfolioRow>();

  if (error) {
    console.error("vendor portfolio load:", error);
    return { kind: "error" as const, message: "Could not load your portfolio." };
  }
  if (!data) return { kind: "missing-profile" as const };
  return { kind: "ok" as const, profile: data };
}

export default async function VendorPortfolioPage() {
  const result = await loadVendorPortfolio();
  if (result.kind === "unauthenticated") redirect("/login");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className={dashLabel}>Showcase</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Portfolio
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            The imagery couples see across vendor profiles, service previews,
            and the Event Editor catalogue. Edits live alongside the rest of
            your profile.
          </p>
        </div>
        <Link href="/vendor/profile" className={dashBtn}>
          Edit profile + imagery
        </Link>
      </header>

      {result.kind === "forbidden" ? (
        <div className={cn(dashCard, "border-dashed border-charcoal/15")}>
          <p className={dashLabel}>Vendor portal only</p>
          <p className="mt-2 text-sm text-slate">
            This page is reserved for vendor accounts.
          </p>
        </div>
      ) : null}

      {result.kind === "error" ? (
        <div className={cn(dashCard, "border-dashed border-error/40")}>
          <p className={dashLabel}>Could not load portfolio</p>
          <p className="mt-2 text-sm text-slate">{result.message}</p>
        </div>
      ) : null}

      {result.kind === "missing-profile" ? (
        <div className={cn(dashCard, "border-dashed border-gold-primary/40 bg-gold-primary/8")}>
          <p className={cn(dashLabel, "text-gold-dark")}>What to do next</p>
          <p className="mt-2 font-heading text-sm leading-relaxed text-charcoal">
            Your vendor profile hasn&apos;t been published yet. Add business
            details and at least a cover image to start your portfolio.
          </p>
          <Link href="/vendor/profile" className={cn(dashBtn, "mt-4")}>
            Set up your profile
          </Link>
        </div>
      ) : null}

      {result.kind === "ok" ? (
        <PortfolioGallery profile={result.profile} />
      ) : null}
    </div>
  );
}

function PortfolioGallery({ profile }: { profile: PortfolioRow }) {
  const portfolio = (profile.portfolio ?? []).filter(Boolean);
  const cover = profile.cover_image?.trim() || null;
  const hasAnything = Boolean(cover) || portfolio.length > 0;

  if (!hasAnything) {
    return (
      <div className={cn(dashCard, "border-dashed border-gold-primary/40 bg-gold-primary/8")}>
        <p className={cn(dashLabel, "text-gold-dark")}>Empty portfolio</p>
        <p className="mt-2 font-heading text-sm leading-relaxed text-charcoal">
          Couples haven&apos;t seen anything from you yet. Add a strong cover
          image and 4–8 portfolio shots that lead with your strongest work.
        </p>
        <Link href="/vendor/profile" className={cn(dashBtn, "mt-4")}>
          Upload imagery
        </Link>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square border border-dashed border-charcoal/15 bg-cream/40"
              aria-hidden
            />
          ))}
        </div>
        <ListEmptyState
          title="Tip"
          hint="Shots that read at editorial scale work best — atmospheric, in-focus, and lightly cropped."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cover ? (
        <section className="space-y-3">
          <p className={dashLabel}>Cover image</p>
          <div className="relative overflow-hidden border border-charcoal/8 bg-cream/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={`${profile.business_name ?? "Vendor"} cover`}
              className="h-[320px] w-full object-cover md:h-[420px]"
            />
            <span className="absolute left-4 top-4 border border-gold-primary/40 bg-midnight/60 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-light backdrop-blur">
              Cover
            </span>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={dashLabel}>Portfolio</p>
            <p className="mt-1 text-xs text-slate">
              {portfolio.length}{" "}
              {portfolio.length === 1 ? "image" : "images"} shown publicly
            </p>
          </div>
          <Link
            href="/vendor/profile"
            className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark hover:underline"
          >
            Edit public profile
          </Link>
        </div>
        {portfolio.length === 0 ? (
          <div className={cn(dashCard, "border-dashed border-charcoal/15")}>
            <p className="text-sm text-slate">
              Cover image is published but the gallery is empty. Add at least
              four portfolio shots so couples have a real frame of reference.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {portfolio.map((url, i) => (
              <figure
                key={`${url}-${i}`}
                className="relative aspect-[4/5] overflow-hidden border border-charcoal/8 bg-cream/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Portfolio ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
                <figcaption className="absolute bottom-2 right-2 border border-charcoal/10 bg-ivory/85 px-2 py-0.5 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal/70">
                  {String(i + 1).padStart(2, "0")}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
