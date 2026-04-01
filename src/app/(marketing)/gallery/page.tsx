import type { Metadata } from "next";
import { GalleryMasonry, type GalleryImage } from "@/components/marketing/gallery/gallery-masonry";

export const metadata: Metadata = {
  title: "Our Portfolio | Elysian Celebrations",
  description:
    "A glimpse into destination weddings we have shaped—light, emotion, and design in harmony.",
};

const galleryImages: GalleryImage[] = [
  {
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80",
    alt: "Welcome dinner tablescape beneath warm evening light",
  },
  {
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
    alt: "Couple portrait framed by editorial wedding florals",
  },
  {
    src: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
    alt: "Rooftop celebration layered with candlelight and guests",
  },
  {
    src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=80",
    alt: "Golden-hour dinner scene with long-table styling",
  },
  {
    src: "https://images.unsplash.com/photo-1506014299253-3725319c7749?auto=format&fit=crop&w=1400&q=80",
    alt: "Intimate wedding moment with soft editorial composition",
  },
  {
    src: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1400&q=80",
    alt: "Couple portrait with quiet, cinematic energy",
  },
  {
    src: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9366?auto=format&fit=crop&w=1400&q=80",
    alt: "Destination venue with lake views and ceremony scale",
  },
  {
    src: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=80",
    alt: "Heritage architecture set for a destination celebration",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    alt: "Coastal setting for a luxury weekend wedding",
  },
  {
    src: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1400&q=80",
    alt: "Tropical ceremony location with lush texture and light",
  },
  {
    src: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80",
    alt: "Cliffside destination atmosphere at golden hour",
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
    alt: "Green retreat landscape suited to a quieter wedding rhythm",
  },
];

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
