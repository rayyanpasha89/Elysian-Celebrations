"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, MapPin } from "lucide-react";
import { staggerContainer, staggerItem } from "@/animations/variants";
import { destinations } from "@/data/destinations";
import { cn, formatCurrency } from "@/lib/utils";

export function DestinationsGrid() {
  const [country, setCountry] = useState<string | "all">("all");

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of destinations) {
      counts.set(d.country, (counts.get(d.country) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }, []);

  const filtered = useMemo(
    () => (country === "all" ? destinations : destinations.filter((d) => d.country === country)),
    [country]
  );

  return (
    <div className="mx-auto max-w-7xl px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 text-center"
      >
        <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">
          Destinations
        </p>
        <h1
          className="font-display mt-3 text-charcoal"
          style={{ fontSize: "var(--text-display)" }}
        >
          Where the celebration finds its stage
        </h1>
        <p className="font-heading mx-auto mt-4 max-w-2xl text-lg font-light text-slate">
          Handpicked cities and landscapes for weddings, galas, launches, and retreats that feel
          unmistakably yours.
        </p>
      </motion.header>

      <div className="mb-10 flex flex-col gap-4 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <FilterChip
            label="All regions"
            count={destinations.length}
            active={country === "all"}
            onClick={() => setCountry("all")}
          />
          {countries.map((entry) => (
            <FilterChip
              key={entry.value}
              label={entry.value}
              count={entry.count}
              active={country === entry.value}
              onClick={() => setCountry(entry.value)}
            />
          ))}
        </div>
        <p className="text-center font-accent text-[10px] uppercase tracking-[0.2em] text-slate sm:text-right">
          {filtered.length} {filtered.length === 1 ? "destination" : "destinations"}
        </p>
      </div>

      <motion.ul
        key={country}
        className="grid list-none grid-cols-1 gap-8 pl-0 sm:grid-cols-2 xl:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {filtered.map((d, index) => (
          <motion.li key={d.id} variants={staggerItem} className="h-full">
            <Link
              href={`/destinations/${d.slug}`}
              data-cursor="pointer"
              className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
            >
              <article className="glass-light flex h-full flex-col overflow-hidden rounded-2xl border border-white/40 shadow-md transition-shadow duration-300 hover:shadow-xl">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
                    style={{
                      background: `linear-gradient(${135 + index * 28}deg,
                        hsl(${28 + index * 35}, 35%, 22%) 0%,
                        hsl(${52 + index * 25}, 28%, 12%) 100%)`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/85 via-midnight/15 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="font-accent inline-flex items-center gap-1.5 rounded-full bg-ivory/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ivory backdrop-blur-md">
                      <MapPin size={12} className="text-gold-light" aria-hidden />
                      {d.country}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-display text-2xl font-semibold text-charcoal group-hover:text-gold-dark">
                    {d.name}
                  </h2>
                  <p className="font-accent mt-3 text-xs uppercase tracking-[0.15em] text-gold-primary">
                    From {formatCurrency(d.startingPrice)}
                  </p>
                  <div className="font-accent mt-6 flex items-center gap-2 text-xs text-slate">
                    <Building2 size={14} className="text-gold-primary" aria-hidden />
                    <span>{d.venueCount} curated venues</span>
                  </div>
                </div>
              </article>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 border px-3.5 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
        active
          ? "border-gold-primary bg-gold-primary/12 text-charcoal"
          : "border-charcoal/12 bg-ivory text-slate hover:border-gold-primary/45 hover:text-charcoal"
      )}
    >
      {label}
      <span className={cn("text-[9px]", active ? "text-gold-dark" : "text-slate/60")}>
        {count}
      </span>
    </button>
  );
}
