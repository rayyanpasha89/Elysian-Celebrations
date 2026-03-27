import type { VendorCategory } from "@/types/common";

export const vendorCategories: VendorCategory[] = [
  {
    id: "vc-venues",
    name: "Venues",
    slug: "venues",
    description:
      "Palaces, resorts, private villas, and beachfront estates—spaces that match your scale and story.",
    icon: "Building2",
    count: 128,
  },
  {
    id: "vc-catering",
    name: "Catering",
    slug: "catering",
    description:
      "From regional tasting menus to international live stations curated for multi-day celebrations.",
    icon: "UtensilsCrossed",
    count: 86,
  },
  {
    id: "vc-photography",
    name: "Photography",
    slug: "photography",
    description:
      "Editorial storytellers who capture emotion, light, and the in-between moments you will revisit forever.",
    icon: "Camera",
    count: 72,
  },
  {
    id: "vc-videography",
    name: "Videography",
    slug: "videography",
    description:
      "Cinematic films and highlight reels with sound design that carries you back to the day.",
    icon: "Clapperboard",
    count: 54,
  },
  {
    id: "vc-floral-decor",
    name: "Floral & Decor",
    slug: "floral-decor",
    description:
      "Installations, mandaps, tablescapes, and lighting plots that translate mood boards into atmosphere.",
    icon: "Flower2",
    count: 95,
  },
  {
    id: "vc-music-entertainment",
    name: "Music & Entertainment",
    slug: "music-entertainment",
    description:
      "DJs, live bands, folk ensembles, and performers who read the room and lift every celebration.",
    icon: "Music",
    count: 61,
  },
  {
    id: "vc-makeup-styling",
    name: "Makeup & Styling",
    slug: "makeup-styling",
    description:
      "Bridal artists and stylists for every function—camera-ready, climate-aware, and culturally fluent.",
    icon: "Palette",
    count: 48,
  },
  {
    id: "vc-travel-logistics",
    name: "Travel & Logistics",
    slug: "travel-logistics",
    description:
      "Ground transport, charter coordination, rooming lists, and on-ground teams who keep guests moving.",
    icon: "Plane",
    count: 39,
  },
];
