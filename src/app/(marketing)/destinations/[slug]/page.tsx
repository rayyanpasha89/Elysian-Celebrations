import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  Heart,
  PartyPopper,
  Plane,
  Sparkles,
  Users2,
  Wand2,
} from "lucide-react";
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

const EVENT_TYPES_HERE = [
  {
    icon: Heart,
    title: "Weddings",
    copy: "Multi-day ceremonies, receptions, and family rituals with room to breathe.",
  },
  {
    icon: Building2,
    title: "Corporate & Conferences",
    copy: "Offsites, launches, award nights, and leadership summits.",
  },
  {
    icon: PartyPopper,
    title: "Galas & Celebrations",
    copy: "Milestone birthdays, anniversaries, and social galas.",
  },
  {
    icon: Sparkles,
    title: "Retreats",
    copy: "Wellness, creative, and leadership retreats over several days.",
  },
] as const;

const PLANNING_INCLUDES = [
  {
    icon: Building2,
    title: "Vetted venues",
    copy: "Heritage palaces, waterfront estates, garden resorts, and boutique hotels.",
  },
  {
    icon: Users2,
    title: "Guest hospitality",
    copy: "Room blocks, transfers, welcome moments, and on-property logistics.",
  },
  {
    icon: Plane,
    title: "Travel & logistics",
    copy: "Airport coordination, shuttles, and movement mapped day by day.",
  },
  {
    icon: Wand2,
    title: "Design & vendors",
    copy: "Decor, food, photo, and entertainment partners curated for the setting.",
  },
] as const;

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  const others = destinations.filter((d) => d.slug !== dest.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      {/* Hero */}
      <section className="relative bg-midnight">
        <ParallaxSection className="relative min-h-[60vh] w-full md:min-h-[72vh]" speed={0.45}>
          <div className="relative min-h-[60vh] w-full md:min-h-[72vh]">
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
              <div className="mt-7 flex flex-wrap gap-2.5">
                <HeroChip icon={Building2} label={`${dest.venueCount}+ venues`} />
                <HeroChip icon={Sparkles} label={`From ${formatCurrency(dest.startingPrice)}`} />
                <HeroChip icon={CalendarRange} label={dest.peakSeason} />
              </div>
            </div>
          </div>
        </ParallaxSection>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-3xl px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
        <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">
          The setting
        </p>
        <p className="mt-5 font-heading text-lg leading-relaxed text-slate md:text-xl">
          {dest.description}
        </p>
      </section>

      {/* Events we design here */}
      <section className="border-t border-gold-light/30 bg-cream/50 px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
        <div className="mx-auto max-w-6xl">
          <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">
            Beyond weddings
          </p>
          <h2 className="mt-4 font-display text-charcoal" style={{ fontSize: "var(--text-h1)" }}>
            Events we design in {dest.name}
          </h2>
          <p className="mt-3 max-w-2xl font-heading text-slate">
            One destination, many formats. The same vetted venues and partners flex from intimate
            ceremonies to full production weekends.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EVENT_TYPES_HERE.map((item) => (
              <FeatureCard key={item.title} icon={item.icon} title={item.title} copy={item.copy} />
            ))}
          </div>
        </div>
      </section>

      {/* What planning here includes */}
      <section className="px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-charcoal" style={{ fontSize: "var(--text-h1)" }}>
            What planning here includes
          </h2>
          <p className="mt-3 max-w-2xl font-heading text-slate">
            Full venue shortlists, vendor curation, and the on-ground logistics unlock once we begin
            planning together — vetted for service, accessibility, and the kind of light that
            flatters every frame.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANNING_INCLUDES.map((item) => (
              <FeatureCard key={item.title} icon={item.icon} title={item.title} copy={item.copy} />
            ))}
          </div>
        </div>
      </section>

      {/* More destinations */}
      {others.length > 0 ? (
        <section className="border-t border-charcoal/8 bg-midnight px-[var(--section-padding-x)] py-[var(--section-padding-y)] text-ivory">
          <div className="mx-auto max-w-6xl">
            <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-light">
              Keep exploring
            </p>
            <h2 className="mt-4 font-display text-ivory" style={{ fontSize: "var(--text-h2)" }}>
              More destinations
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <Link
                  key={other.id}
                  href={`/destinations/${other.slug}`}
                  data-cursor="pointer"
                  className="group relative block overflow-hidden border border-white/10"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={other.heroImage}
                      alt={other.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-5">
                      <div>
                        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light">
                          {other.country}
                        </p>
                        <p className="mt-1 font-display text-xl text-ivory">{other.name}</p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-ivory/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="px-[var(--section-padding-x)] py-16 text-center md:py-24">
        <h2 className="font-display text-charcoal" style={{ fontSize: "var(--text-h2)" }}>
          Start planning in {dest.name}
        </h2>
        <p className="font-heading mx-auto mt-3 max-w-xl text-slate">
          Share your event type, dates, and guest count — we will map venues, vendors, and a budget
          that respects both.
        </p>
        <Link
          href="/contact"
          data-cursor="pointer"
          className="font-accent mt-8 inline-flex rounded-full bg-gradient-to-r from-gold-dark via-gold-primary to-gold-dark px-10 py-4 text-xs uppercase tracking-[0.2em] text-midnight shadow-[var(--shadow-gold)] transition hover:opacity-95"
        >
          Begin your brief
        </Link>
      </section>
    </main>
  );
}

function HeroChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 border border-ivory/15 bg-midnight/40 px-3.5 py-2 font-accent text-[10px] uppercase tracking-[0.16em] text-ivory/85 backdrop-blur-md">
      <Icon className="h-3.5 w-3.5 text-gold-light" />
      {label}
    </span>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  copy: string;
}) {
  return (
    <div className="group border border-charcoal/10 bg-ivory p-6 transition-colors hover:border-gold-primary/40">
      <div className="flex h-11 w-11 items-center justify-center border border-gold-primary/30 bg-gold-primary/10 text-gold-dark">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 font-display text-lg text-charcoal">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate">{copy}</p>
    </div>
  );
}
