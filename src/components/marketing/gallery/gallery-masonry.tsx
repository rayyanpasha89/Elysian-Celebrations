"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { X } from "lucide-react";
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

  return (
    <div ref={ref} className="mb-4 break-inside-avoid">
      <div className={cn("relative w-full overflow-hidden rounded-xl bg-cream", aspectClass)}>
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
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
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
                  className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                />
              </div>
              <p className="font-heading mt-4 text-center text-sm text-ivory/80">{active.alt}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
