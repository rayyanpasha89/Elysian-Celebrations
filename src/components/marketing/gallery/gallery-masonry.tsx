"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export type GalleryImage = { src: string; alt: string };

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
  const isWideFrame = index % 4 === 1;

  return (
    <div ref={ref} className="mb-4 break-inside-avoid">
      <div
        className={cn(
          "relative w-full overflow-hidden border border-charcoal/8 bg-cream shadow-[0_18px_55px_rgba(26,26,46,0.08)]",
          aspectClass,
          isWideFrame && "md:scale-[1.01]"
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
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.02),rgba(17,24,39,0.05)_42%,rgba(17,24,39,0.78)_100%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 border border-ivory/14 bg-midnight/42 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-ivory/78 backdrop-blur-md">
            <Camera className="h-3.5 w-3.5 text-gold-light" />
            {item.alt.split(" — ")[0]}
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
              delay: index * 0.06,
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
  const [active, setActive] = useState<GalleryImage | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  return (
    <>
      <div className="mb-6 grid gap-4 border border-charcoal/8 bg-ivory/70 p-4 md:grid-cols-3">
        <div className="border border-charcoal/8 bg-white/80 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary">
            Portfolio
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            A visual archive of atmosphere, composition, and the kind of detail that makes a
            celebration feel directed rather than decorated.
          </p>
        </div>
        <div className="border border-charcoal/8 bg-white/80 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary">
            Curation
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            Each frame should feel like part of a story, not a random image dump.
          </p>
        </div>
        <div className="border border-charcoal/8 bg-white/80 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-primary">
            Interaction
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            Tap any card to open a larger preview and inspect the mood in detail.
          </p>
        </div>
      </div>

      <div className="columns-2 gap-4 md:columns-3 lg:columns-4" role="list">
        {images.map((item, index) => (
          <MasonryItem key={item.src} item={item} index={index} onOpen={setActive} />
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
            onClick={() => setActive(null)}
          >
            <motion.button
              type="button"
              data-cursor="pointer"
              className="absolute right-4 top-4 z-[110] rounded-full bg-ivory/10 p-2 text-ivory backdrop-blur-md transition hover:bg-ivory/20"
              onClick={(e) => {
                e.stopPropagation();
                setActive(null);
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </motion.button>
            <motion.div
              className="relative max-h-[90vh] max-w-[min(96vw,1200px)]"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Image
                  src={active.src}
                  alt={active.alt}
                  width={1600}
                  height={1200}
                  className="max-h-[85vh] w-auto max-w-full rounded-lg border border-white/10 object-contain shadow-2xl"
                />
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ivory/80">
                <ImageIcon className="h-4 w-4 text-gold-light" />
                <p className="font-heading">{active.alt}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
