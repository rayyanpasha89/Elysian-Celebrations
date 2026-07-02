"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryCategory =
  | "Weddings"
  | "Corporate"
  | "Galas & Social"
  | "Destinations"
  | "Decor & Tablescapes";

export type GalleryImage = { src: string; alt: string; category: GalleryCategory };

const aspectCycle = ["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[5/6]", "aspect-[2/3]"];

function MasonryItem({
  item,
  index,
  onOpen,
}: {
  item: GalleryImage;
  index: number;
  onOpen: (item: GalleryImage) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const aspectClass = aspectCycle[index % aspectCycle.length];

  return (
    <div ref={ref} className="mb-4 break-inside-avoid">
      <div
        className={cn(
          "relative w-full overflow-hidden border border-charcoal/8 bg-cream shadow-[0_18px_55px_rgba(51,61,41,0.08)]",
          aspectClass
        )}
      >
        <button
          type="button"
          onClick={() => onOpen(item)}
          data-cursor="pointer"
          className="group relative block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary"
        >
          <Image
            src={item.src}
            alt={item.alt}
            fill
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(51,61,41,0.02),rgba(51,61,41,0.05)_42%,rgba(51,61,41,0.78)_100%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 border border-ivory/14 bg-midnight/42 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-ivory/78 backdrop-blur-md">
            <Camera className="h-3.5 w-3.5 text-gold-light" />
            {item.category}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between gap-4">
              <p className="max-w-[75%] text-left text-sm leading-relaxed text-ivory/84 transition-transform duration-500 group-hover:-translate-y-0.5">
                {item.alt}
              </p>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-ivory/14 bg-midnight/40 text-ivory/72 backdrop-blur-md transition-all duration-500 group-hover:border-gold-primary/35 group-hover:bg-gold-primary/12 group-hover:text-gold-light">
                <ImageIcon className="h-4 w-4" />
              </span>
            </div>
          </div>
          <motion.div
            className="pointer-events-none absolute inset-0 origin-right bg-gold-primary"
            initial={{ scaleX: 1 }}
            animate={inView ? { scaleX: 0 } : { scaleX: 1 }}
            transition={{
              duration: 0.85,
              delay: (index % 8) * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: "right" }}
          />
        </button>
      </div>
    </div>
  );
}

export function GalleryMasonry({ images }: { images: GalleryImage[] }) {
  const [category, setCategory] = useState<GalleryCategory | "all">("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Category chips with live counts, ordered by how many frames each holds.
  const categories = useMemo(() => {
    const counts = new Map<GalleryCategory, number>();
    for (const image of images) {
      counts.set(image.category, (counts.get(image.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }, [images]);

  const filtered = useMemo(
    () => (category === "all" ? images : images.filter((image) => image.category === category)),
    [images, category]
  );

  const active = activeIndex == null ? null : filtered[activeIndex] ?? null;

  const step = (delta: number) => {
    setActiveIndex((current) => {
      if (current == null) return current;
      return (current + delta + filtered.length) % filtered.length;
    });
  };

  useEffect(() => {
    if (active == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, filtered.length]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="-mx-1 flex flex-wrap gap-2">
          <FilterChip
            label="All"
            count={images.length}
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {categories.map((entry) => (
            <FilterChip
              key={entry.value}
              label={entry.value}
              count={entry.count}
              active={category === entry.value}
              onClick={() => setCategory(entry.value)}
            />
          ))}
        </div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          {filtered.length} {filtered.length === 1 ? "frame" : "frames"}
        </p>
      </div>

      {/* Re-key by category so the reveal animation replays on each filter change. */}
      <div key={category} className="columns-2 gap-4 md:columns-3 lg:columns-4" role="list">
        {filtered.map((item, index) => (
          <MasonryItem
            key={item.src}
            item={item}
            index={index}
            onOpen={() => setActiveIndex(index)}
          />
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/92 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={() => setActiveIndex(null)}
          >
            <button
              type="button"
              data-cursor="pointer"
              className="absolute right-4 top-4 z-[110] rounded-full bg-ivory/10 p-2 text-ivory backdrop-blur-md transition hover:bg-ivory/20"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(null);
              }}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            {filtered.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={(event) => {
                    event.stopPropagation();
                    step(-1);
                  }}
                  className="absolute left-3 top-1/2 z-[110] hidden -translate-y-1/2 rounded-full bg-ivory/10 p-3 text-ivory backdrop-blur-md transition hover:bg-ivory/20 sm:block"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={(event) => {
                    event.stopPropagation();
                    step(1);
                  }}
                  className="absolute right-3 top-1/2 z-[110] hidden -translate-y-1/2 rounded-full bg-ivory/10 p-3 text-ivory backdrop-blur-md transition hover:bg-ivory/20 sm:block"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <motion.div
              key={active.src}
              className="relative max-h-[90vh] max-w-[min(96vw,1200px)]"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={active.src}
                alt={active.alt}
                width={1600}
                height={1200}
                className="max-h-[85vh] w-auto max-w-full rounded-lg border border-white/10 object-contain shadow-2xl"
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-ivory/80">
                <span className="inline-flex items-center gap-1.5 border border-ivory/14 px-2.5 py-1 font-accent text-[9px] uppercase tracking-[0.16em] text-gold-light">
                  <Camera className="h-3 w-3" />
                  {active.category}
                </span>
                <p className="font-heading">{active.alt}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
