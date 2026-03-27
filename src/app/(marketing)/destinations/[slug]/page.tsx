import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParallaxSection } from "@/components/shared/parallax-section";
import { destinations, getDestinationBySlug } from "@/data/destinations";
import { formatCurrency } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) return { title: "Destination" };
  return {
    title: `${dest.name} | Elysian Celebrations`,
    description: dest.tagline,
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <section className="relative bg-midnight">
        <ParallaxSection className="relative min-h-[55vh] w-full md:min-h-[65vh]" speed={0.45}>
          <div className="relative min-h-[55vh] w-full md:min-h-[65vh]">
            <Image
              src={dest.heroImage}
              alt={`${dest.name} — ${dest.tagline}`}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/25" />
            <div className="absolute inset-0 flex flex-col justify-end px-[var(--section-padding-x)] pb-12 pt-24 md:pb-16">
              <p className="font-accent text-xs uppercase tracking-[0.35em] text-gold-light">
                {dest.country}
              </p>
              <h1
                className="font-display mt-3 max-w-4xl text-ivory"
                style={{ fontSize: "var(--text-display)" }}
              >
                {dest.name}
              </h1>
              <p className="font-heading mt-4 max-w-2xl text-lg font-light text-ivory/85 md:text-xl">
                {dest.tagline}
              </p>
            </div>
          </div>
        </ParallaxSection>
      </section>

      <section className="mx-auto max-w-3xl px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
        <p className="font-heading text-lg leading-relaxed text-slate md:text-xl">{dest.description}</p>

        <dl className="mt-12 grid gap-6 border-y border-gold-light/40 py-10 sm:grid-cols-3">
          <div>
            <dt className="font-accent text-xs uppercase tracking-[0.2em] text-gold-dark">Venues</dt>
            <dd className="font-display mt-2 text-2xl text-charcoal">{dest.venueCount}+</dd>
          </div>
          <div>
            <dt className="font-accent text-xs uppercase tracking-[0.2em] text-gold-dark">
              Starting from
            </dt>
            <dd className="font-display mt-2 text-2xl text-charcoal">
              {formatCurrency(dest.startingPrice)}
            </dd>
          </div>
          <div>
            <dt className="font-accent text-xs uppercase tracking-[0.2em] text-gold-dark">
              Peak season
            </dt>
            <dd className="font-heading mt-2 text-lg text-charcoal">{dest.peakSeason}</dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-gold-light/30 bg-cream/60 px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-charcoal" style={{ fontSize: "var(--text-h1)" }}>
            Venues
          </h2>
          <p className="font-heading mt-3 max-w-2xl text-slate">
            Palace terraces, private villas, beachfront estates, and boutique resorts—each vetted for
            service, accessibility, and the kind of light that flatters every frame. Full venue
            shortlists unlock once we begin planning together.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["Heritage properties", "Waterfront estates", "Garden resorts", "Boutique hotels"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-xl border border-charcoal/10 bg-ivory/80 px-5 py-6 text-center font-heading text-charcoal shadow-sm"
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="px-[var(--section-padding-x)] py-16 text-center md:py-24">
        <h2 className="font-display text-charcoal" style={{ fontSize: "var(--text-h2)" }}>
          Start planning
        </h2>
        <p className="font-heading mx-auto mt-3 max-w-xl text-slate">
          Share your dates and guest count—we will map venues, vendors, and a budget that respects
          both.
        </p>
        <Link
          href="/#contact"
          data-cursor="pointer"
          className="font-accent mt-8 inline-flex rounded-full bg-gradient-to-r from-gold-dark via-gold-primary to-gold-dark px-10 py-4 text-xs uppercase tracking-[0.2em] text-midnight shadow-[var(--shadow-gold)] transition hover:opacity-95"
        >
          Begin your journey
        </Link>
      </section>
    </main>
  );
}
