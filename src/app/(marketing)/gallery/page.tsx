import type { Metadata } from "next";
import { GalleryMasonry, type GalleryImage } from "@/components/marketing/gallery/gallery-masonry";

export const metadata: Metadata = {
  title: "Portfolio | Elysian Celebrations",
  description:
    "A glimpse into the destination events we have shaped — weddings, galas, launches, and retreats where light, emotion, and design move in harmony.",
};

const galleryImages: GalleryImage[] = [
  {
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80",
    alt: "Welcome dinner tablescape beneath warm evening light",
    category: "Decor & Tablescapes",
  },
  {
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
    alt: "Portrait framed by editorial florals",
    category: "Weddings",
  },
  {
    src: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
    alt: "Rooftop reception layered with candlelight and guests",
    category: "Galas & Social",
  },
  {
    src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=80",
    alt: "Golden-hour dinner with long-table styling",
    category: "Decor & Tablescapes",
  },
  {
    src: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80",
    alt: "Conference stage set for a brand launch",
    category: "Corporate",
  },
  {
    src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
    alt: "Gala crowd under suspended lighting",
    category: "Galas & Social",
  },
  {
    src: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1400&q=80",
    alt: "Lakeside venue with ceremony scale",
    category: "Destinations",
  },
  {
    src: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=80",
    alt: "Heritage architecture set for a destination celebration",
    category: "Destinations",
  },
  {
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1400&q=80",
    alt: "Milestone birthday lounge in jewel tones",
    category: "Galas & Social",
  },
  {
    src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80",
    alt: "Celebration toast among friends",
    category: "Galas & Social",
  },
  {
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80",
    alt: "Keynote moment at a corporate offsite",
    category: "Corporate",
  },
  {
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80",
    alt: "Intimate ceremony with soft editorial composition",
    category: "Weddings",
  },
  {
    src: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1400&q=80",
    alt: "Couple portrait with quiet, cinematic energy",
    category: "Weddings",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    alt: "Coastal setting for a luxury weekend",
    category: "Destinations",
  },
  {
    src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
    alt: "Floral arch and aisle styling",
    category: "Decor & Tablescapes",
  },
  {
    src: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80",
    alt: "Cliffside destination atmosphere at golden hour",
    category: "Destinations",
  },
  {
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=80",
    alt: "Networking reception in a glass atrium",
    category: "Corporate",
  },
  {
    src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=80",
    alt: "Reception florals and centrepiece detail",
    category: "Decor & Tablescapes",
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
          The Portfolio
        </h1>
        <p className="font-heading mx-auto mt-5 max-w-2xl text-lg font-light text-slate">
          Weddings, galas, launches, and retreats — each frame a chapter from events we have had the
          honour to design. Filter by the kind of moment you are planning.
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-[var(--section-padding-x)] pb-[var(--section-padding-y)]">
        <GalleryMasonry images={galleryImages} />
      </div>
    </main>
  );
}
