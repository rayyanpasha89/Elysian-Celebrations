import type { Metadata } from "next";
import { GalleryMasonry, type GalleryImage } from "@/components/marketing/gallery/gallery-masonry";

export const metadata: Metadata = {
  title: "Our Portfolio | Elysian Celebrations",
  description:
    "A glimpse into destination weddings we have shaped—light, emotion, and design in harmony.",
};

const galleryImages: GalleryImage[] = Array.from({ length: 14 }, (_, i) => ({
  src: `/images/gallery/wedding-${i + 1}.jpg`,
  alt: `Portfolio moment ${i + 1} — destination celebration`,
}));

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <header className="mx-auto max-w-4xl px-[var(--section-padding-x)] pb-10 pt-[var(--section-padding-y)] text-center md:pb-14">
        <p className="font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">Gallery</p>
        <h1
          className="font-display mt-4 text-charcoal"
          style={{ fontSize: "var(--text-display)" }}
        >
          Our Portfolio
        </h1>
        <p className="font-heading mx-auto mt-5 max-w-2xl text-lg font-light text-slate">
          Moments captured where design meets devotion—each frame a chapter from celebrations we have
          had the honour to craft.
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-[var(--section-padding-x)] pb-[var(--section-padding-y)]">
        <GalleryMasonry images={galleryImages} />
      </div>
    </main>
  );
}
