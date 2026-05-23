import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalAuthSession } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  dashBtn,
  dashCard,
  dashLabel,
  statusBadgeBase,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_published: boolean;
  created_at: string;
  client: {
    partner_name: string | null;
    user: { name: string | null } | null;
  } | null;
};

type LoadResult =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "missing-profile" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      vendor: { id: string; business_name: string | null; rating: number | null; review_count: number | null };
      reviews: ReviewRow[];
    };

async function loadVendorReviews(): Promise<LoadResult> {
  const session = await getOptionalAuthSession();
  if (!session) return { kind: "unauthenticated" };
  if (session.role !== "vendor") return { kind: "forbidden" };

  const supabase = createAdminSupabaseClient();
  const { data: vendor, error: vErr } = await supabase
    .from("vendor_profiles")
    .select("id, business_name, rating, review_count")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (vErr) {
    console.error("vendor reviews vendor load:", vErr);
    return { kind: "error", message: "Could not load your vendor profile." };
  }
  if (!vendor) return { kind: "missing-profile" };

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select(
      `id, rating, title, content, is_published, created_at,
       client:client_profiles(partner_name, user:users(name))`
    )
    .eq("vendor_profile_id", vendor.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("vendor reviews list:", error);
    return { kind: "error", message: "Could not load reviews." };
  }

  // Supabase may return relations as arrays — normalise to singular shape.
  const normalised: ReviewRow[] = (reviews ?? []).map((row) => {
    const clientRaw = Array.isArray(row.client) ? row.client[0] : row.client;
    const userRaw = clientRaw
      ? Array.isArray(clientRaw.user)
        ? clientRaw.user[0]
        : clientRaw.user
      : null;
    return {
      id: row.id,
      rating: row.rating,
      title: row.title,
      content: row.content,
      is_published: row.is_published,
      created_at: row.created_at,
      client: clientRaw
        ? {
            partner_name: clientRaw.partner_name ?? null,
            user: userRaw ? { name: userRaw.name ?? null } : null,
          }
        : null,
    };
  });

  return {
    kind: "ok",
    vendor: {
      id: vendor.id,
      business_name: vendor.business_name,
      rating: vendor.rating,
      review_count: vendor.review_count,
    },
    reviews: normalised,
  };
}

function formatDate(raw: string | null) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function coupleLabelFor(client: ReviewRow["client"]): string {
  if (!client) return "Anonymous couple";
  if (client.partner_name && client.partner_name.trim()) {
    return client.partner_name.trim();
  }
  if (client.user?.name && client.user.name.trim()) return client.user.name.trim();
  return "Anonymous couple";
}

export default async function VendorReviewsPage() {
  const result = await loadVendorReviews();
  if (result.kind === "unauthenticated") redirect("/login");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className={dashLabel}>Reputation</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Reviews
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            Published reviews appear on your vendor profile and in shortlist
            previews. Unpublished feedback is hidden from couples until you
            request publication.
          </p>
        </div>
        <Link href="/vendor/bookings" className={dashBtn}>
          Encourage post-event feedback
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

      {result.kind === "missing-profile" ? (
        <div className={cn(dashCard, "border-dashed border-gold-primary/40 bg-gold-primary/8")}>
          <p className={cn(dashLabel, "text-gold-dark")}>What to do next</p>
          <p className="mt-2 font-heading text-sm leading-relaxed text-charcoal">
            Publish your vendor profile first — couples need to book you before
            they can leave a review.
          </p>
          <Link href="/vendor/profile" className={cn(dashBtn, "mt-4")}>
            Set up your profile
          </Link>
        </div>
      ) : null}

      {result.kind === "error" ? (
        <div className={cn(dashCard, "border-dashed border-error/40")}>
          <p className={dashLabel}>Could not load reviews</p>
          <p className="mt-2 text-sm text-slate">{result.message}</p>
        </div>
      ) : null}

      {result.kind === "ok" ? (
        <ReviewsList vendor={result.vendor} reviews={result.reviews} />
      ) : null}
    </div>
  );
}

function ReviewsList({
  vendor,
  reviews,
}: {
  vendor: { rating: number | null; review_count: number | null };
  reviews: ReviewRow[];
}) {
  const published = reviews.filter((review) => review.is_published);
  const pending = reviews.filter((review) => !review.is_published);
  const averagePublished =
    published.length > 0
      ? published.reduce((sum, r) => sum + r.rating, 0) / published.length
      : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Average rating"
          value={
            published.length > 0
              ? `${averagePublished.toFixed(1)} / 5`
              : vendor.rating
                ? `${Number(vendor.rating).toFixed(1)} / 5`
                : "—"
          }
          hint={
            published.length > 0
              ? `From ${published.length} published ${published.length === 1 ? "review" : "reviews"}`
              : "No published reviews yet"
          }
        />
        <MetricCard
          label="Published"
          value={`${published.length}`}
          hint="Visible on your public profile"
        />
        <MetricCard
          label="Awaiting publication"
          value={`${pending.length}`}
          hint={pending.length > 0 ? "Held until you approve" : "All clear"}
          tone={pending.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {reviews.length === 0 ? (
        <div className={cn(dashCard, "border-dashed border-charcoal/15")}>
          <p className={dashLabel}>No reviews yet</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
            Reviews appear here when couples submit feedback after a booking.
            After a wedding wraps, follow up from{" "}
            <Link href="/vendor/bookings" className="text-gold-dark underline-offset-2 hover:underline">
              your bookings
            </Link>{" "}
            and ask for one — most couples will say yes if asked within a week.
          </p>
        </div>
      ) : null}

      {published.length > 0 ? (
        <section className="space-y-3">
          <h3 className={dashLabel}>Published</h3>
          <ul className="list-none space-y-3 pl-0">
            {published.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="space-y-3">
          <h3 className={dashLabel}>Awaiting publication</h3>
          <ul className="list-none space-y-3 pl-0">
            {pending.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const dateLabel = formatDate(review.created_at);
  const couple = coupleLabelFor(review.client);
  return (
    <article className={cn(dashCard)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg text-charcoal">
            {review.title?.trim() || "Guest feedback"}
          </p>
          <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            {couple}
            {dateLabel ? ` · ${dateLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              statusBadgeBase,
              review.is_published
                ? "border-sage/40 text-sage"
                : "border-gold-primary/45 text-gold-dark"
            )}
          >
            {review.is_published ? "Published" : "Pending"}
          </span>
          <span className="font-accent border border-gold-primary/45 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gold-dark">
            {review.rating}/5
          </span>
        </div>
      </div>
      {review.content ? (
        <p className="mt-4 text-sm leading-relaxed text-charcoal">
          {review.content}
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate/70">No written notes.</p>
      )}
    </article>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className={cn(dashCard, "bg-cream/35")}>
      <p className={dashLabel}>{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl",
          tone === "warning" ? "text-gold-dark" : "text-charcoal"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate">{hint}</p>
    </div>
  );
}
