import type { Destination } from "@/types/common";

export const destinations: Destination[] = [
  {
    id: "dest-udaipur",
    name: "Udaipur",
    slug: "udaipur",
    country: "India",
    tagline: "The Venice of the East, carved in marble and moonlight.",
    description:
      "Palace terraces spill toward Lake Pichola as brass lamps trace reflections across the water—Udaipur is romance written in sandstone and silk. Exchange vows beneath frescoed domes, drift across the lake at golden hour, and let candlelit courtyards hold every whispered promise. Here, heritage is not a backdrop; it is the very rhythm of your celebration.",
    heroImage: "/images/destinations/udaipur.jpg",
    startingPrice: 2800000,
    peakSeason: "October – March",
    venueCount: 42,
    gallery: [
      "/images/destinations/udaipur/gallery-1.jpg",
      "/images/destinations/udaipur/gallery-2.jpg",
      "/images/destinations/udaipur/gallery-3.jpg",
      "/images/destinations/udaipur/gallery-4.jpg",
    ],
  },
  {
    id: "dest-jaipur",
    name: "Jaipur",
    slug: "jaipur",
    country: "India",
    tagline: "Pink city walls, amber sunsets, and royal halls made for forever.",
    description:
      "Jaipur drapes your wedding in the warm blush of its ramparts and the grandeur of Rajput courts reborn for modern love. Picture baraat processions through arched gateways, mehndi in fragrant gardens, and sangeet nights where chandeliers tremble with every beat. The Pink City turns tradition into theatre—bold, luminous, unforgettable.",
    heroImage: "/images/destinations/jaipur.jpg",
    startingPrice: 2400000,
    peakSeason: "November – February",
    venueCount: 38,
    gallery: [
      "/images/destinations/jaipur/gallery-1.jpg",
      "/images/destinations/jaipur/gallery-2.jpg",
      "/images/destinations/jaipur/gallery-3.jpg",
    ],
  },
  {
    id: "dest-goa",
    name: "Goa",
    slug: "goa",
    country: "India",
    tagline: "Sea breeze, swaying palms, vows carried on the tide.",
    description:
      "Goa trades marble corridors for open skies and the slow percussion of waves on sand. Whether you choose a cliff-top estate or a hidden beach cove, the air tastes of salt and celebration. Sundowners melt into starlit receptions; barefoot dances feel like the truest luxury. This is a destination for couples who want their love story to breathe.",
    heroImage: "/images/destinations/goa.jpg",
    startingPrice: 2200000,
    peakSeason: "November – February",
    venueCount: 56,
    gallery: [
      "/images/destinations/goa/gallery-1.jpg",
      "/images/destinations/goa/gallery-2.jpg",
      "/images/destinations/goa/gallery-3.jpg",
      "/images/destinations/goa/gallery-4.jpg",
    ],
  },
  {
    id: "dest-kerala",
    name: "Kerala",
    slug: "kerala",
    country: "India",
    tagline: "Backwaters, spice air, and serenity woven into every ritual.",
    description:
      "In Kerala, time moves like a houseboat on still water—graceful, unhurried, deeply intimate. Exchange garlands among coconut groves, host a serene ceremony on a lotus-lined lagoon, and gather loved ones for Sadya feasts that honour abundance. Verdant hills and Ayurvedic calm make this the soulful counterpoint to high-octane revelry.",
    heroImage: "/images/destinations/kerala.jpg",
    startingPrice: 2000000,
    peakSeason: "September – March",
    venueCount: 33,
    gallery: [
      "/images/destinations/kerala/gallery-1.jpg",
      "/images/destinations/kerala/gallery-2.jpg",
      "/images/destinations/kerala/gallery-3.jpg",
    ],
  },
  {
    id: "dest-jim-corbett",
    name: "Jim Corbett",
    slug: "jim-corbett",
    country: "India",
    tagline: "Where the forest listens, and your promises echo through the trees.",
    description:
      "Jim Corbett offers a wedding wrapped in mist, birdsong, and the quiet thrill of the wild. Boutique lodges and riverside lawns set the stage for intimate gatherings with a touch of adventure—bonfires under constellations, morning rituals as dew lifts from the grass. Perfect for couples who crave nature’s cathedral and unscripted magic.",
    heroImage: "/images/destinations/jim-corbett.jpg",
    startingPrice: 1800000,
    peakSeason: "November – April",
    venueCount: 18,
    gallery: [
      "/images/destinations/jim-corbett/gallery-1.jpg",
      "/images/destinations/jim-corbett/gallery-2.jpg",
      "/images/destinations/jim-corbett/gallery-3.jpg",
    ],
  },
  {
    id: "dest-bali",
    name: "Bali",
    slug: "bali",
    country: "Indonesia",
    tagline: "Cliff-edge vows, jungle whispers, and offerings of frangipani light.",
    description:
      "Bali folds spirituality into every gesture—canang sari at dawn, gamelan at dusk, and villas that float between rice terraces and infinity pools. Your celebration can be minimalist and modern or layered with Balinese blessing rituals; either way, the island’s warmth extends from the staff’s smiles to the humid evening air. A destination for dreamers who want design, soul, and sea in one frame.",
    heroImage: "/images/destinations/bali.jpg",
    startingPrice: 3500000,
    peakSeason: "April – October",
    venueCount: 64,
    gallery: [
      "/images/destinations/bali/gallery-1.jpg",
      "/images/destinations/bali/gallery-2.jpg",
      "/images/destinations/bali/gallery-3.jpg",
      "/images/destinations/bali/gallery-4.jpg",
    ],
  },
  {
    id: "dest-santorini",
    name: "Santorini",
    slug: "santorini",
    country: "Greece",
    tagline: "Caldera blues, whitewashed curves, and sunsets that steal every breath.",
    description:
      "Santorini is the postcard made real—terraces stepping toward the Aegean, domes catching the last blush of day, and tables set for small, exquisite parties. Say ‘I do’ as the caldera glows gold, then dance under strings of light while the sea turns ink below. For couples who want European elegance with the drama of an island suspended between sky and water.",
    heroImage: "/images/destinations/santorini.jpg",
    startingPrice: 5500000,
    peakSeason: "May – September",
    venueCount: 27,
    gallery: [
      "/images/destinations/santorini/gallery-1.jpg",
      "/images/destinations/santorini/gallery-2.jpg",
      "/images/destinations/santorini/gallery-3.jpg",
    ],
  },
];

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}
