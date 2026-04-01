import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

type PortalRole = "ADMIN" | "CLIENT" | "VENDOR";

type FixtureIdentity = {
  key: string;
  label: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PortalRole;
  defaultRoute: `/${"admin" | "client" | "vendor"}`;
};

type ClientFixture = FixtureIdentity & {
  partnerName: string;
  weddingDate: string;
  estimatedBudget: number;
  guestCount: number;
  notes: string;
  destinationSlug: string;
  packageTierSlug: string;
  weddingStatus: "PLANNING" | "CONFIRMED";
  weddingName: string;
  eventBlueprint: {
    name: string;
    offsetDays: number;
    venue: string;
    notes: string;
  }[];
};

type VendorFixture = FixtureIdentity & {
  businessName: string;
  slug: string;
  categorySlug: string;
  description: string;
  shortBio: string;
  city: string;
  state: string;
  experience: number;
  isVerified: boolean;
  isFeatured: boolean;
  coverImage: string;
  portfolio: string[];
  destinations: string[];
  services: {
    name: string;
    description: string;
    basePrice: number;
    maxPrice: number;
    unit: string;
  }[];
};

type ContactInquiryFixture = {
  name: string;
  email: string;
  phone: string;
  destination: string;
  weddingDate: string;
  guestCount: string;
  message: string;
  status: "NEW" | "CONTACTED" | "IN_PROGRESS";
};

type BootstrapLogin = {
  label: string;
  email: string;
  role: PortalRole;
  route: FixtureIdentity["defaultRoute"];
};

export type CloudBootstrapSummary = {
  logins: BootstrapLogin[];
  counts: {
    users: number;
    vendorProfiles: number;
    weddings: number;
    bookings: number;
    messages: number;
    reviews: number;
    notifications: number;
    inquiries: number;
  };
  ranAt: string;
};

type UserRecord = {
  id: string;
  email: string;
};

type ClientProfileRecord = {
  id: string;
  user_id: string;
};

type VendorProfileRecord = {
  id: string;
  slug: string;
};

type WeddingRecord = {
  id: string;
};

type BudgetRecord = {
  id: string;
};

type ServiceRecord = {
  id: string;
  name: string;
  vendor_profile_id: string;
};

type BookingRecord = {
  id: string;
};

const DEFAULT_TEST_PASSWORD = "ElysianTesting123!";

const VENDOR_CATEGORY_FIXTURES = [
  {
    name: "Photography & Videography",
    slug: "photography",
    description: "Films and stills that capture the atmosphere as much as the ceremony.",
    sort_order: 0,
  },
  {
    name: "Decor & Design",
    slug: "decor",
    description: "Spatial design, floral direction, installation builds, and styling.",
    sort_order: 1,
  },
  {
    name: "Catering",
    slug: "catering",
    description: "Hospitality teams for plated dinners, grazing tables, and multi-day menus.",
    sort_order: 2,
  },
  {
    name: "Makeup & Styling",
    slug: "makeup",
    description: "Hair, makeup, draping, and styling support across all wedding events.",
    sort_order: 3,
  },
  {
    name: "Entertainment & Music",
    slug: "entertainment",
    description: "Live music, DJs, production, sound, and show direction.",
    sort_order: 4,
  },
  {
    name: "Wedding Planning",
    slug: "planning",
    description: "Lead planners, coordination teams, and guest-experience operators.",
    sort_order: 5,
  },
  {
    name: "Mehendi Artist",
    slug: "mehendi",
    description: "Specialist artists for bridal and guest mehendi ceremonies.",
    sort_order: 6,
  },
  {
    name: "Invitations & Stationery",
    slug: "invitations",
    description: "Paper systems, itineraries, menus, and event collateral.",
    sort_order: 7,
  },
  {
    name: "Jewellery & Accessories",
    slug: "jewellery",
    description: "Ceremonial jewellery, accessories, and bridal finishing touches.",
    sort_order: 8,
  },
  {
    name: "Travel & Logistics",
    slug: "travel",
    description: "Guest movement, airport pickups, and rooming coordination.",
    sort_order: 9,
  },
] as const;

const DESTINATION_FIXTURES = [
  {
    name: "Udaipur",
    slug: "udaipur",
    country: "India",
    tagline: "The City of Lakes",
    description:
      "Palatial venues on serene lakefronts with a slower, ceremonial rhythm that suits multi-day weddings.",
    hero_image:
      "https://images.unsplash.com/photo-1515091943-9d5c0ad475af?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 2500000,
    venue_count: 12,
    sort_order: 0,
  },
  {
    name: "Jaipur",
    slug: "jaipur",
    country: "India",
    tagline: "The Pink City",
    description:
      "Historic forts and garden courtyards that bring pageantry without losing warmth.",
    hero_image:
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 2000000,
    venue_count: 10,
    sort_order: 1,
  },
  {
    name: "Goa",
    slug: "goa",
    country: "India",
    tagline: "Sun, Sand & Celebration",
    description:
      "Beachfront ceremonies, tropical after-hours energy, and guest-friendly hospitality.",
    hero_image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 1500000,
    venue_count: 8,
    sort_order: 2,
  },
  {
    name: "Kerala",
    slug: "kerala",
    country: "India",
    tagline: "God's Own Country",
    description:
      "Backwater calm, layered greenery, and intimate hospitality-led celebrations.",
    hero_image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 1800000,
    venue_count: 6,
    sort_order: 3,
  },
  {
    name: "Jodhpur",
    slug: "jodhpur",
    country: "India",
    tagline: "The Blue City",
    description:
      "Fort backdrops, desert light, and large-format ceremonies with dramatic scale.",
    hero_image:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 2200000,
    venue_count: 7,
    sort_order: 4,
  },
  {
    name: "Mussoorie",
    slug: "mussoorie",
    country: "India",
    tagline: "Queen of the Hills",
    description:
      "Mountain air, colonial hotels, and a cooler-weather guest experience.",
    hero_image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 1600000,
    venue_count: 5,
    sort_order: 5,
  },
  {
    name: "Rishikesh",
    slug: "rishikesh",
    country: "India",
    tagline: "Adventure Meets Serenity",
    description:
      "Riverside gatherings for couples who want spiritual calm without losing celebration energy.",
    hero_image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    ],
    starting_price: 1200000,
    venue_count: 4,
    sort_order: 6,
  },
] as const;

const VENUE_FIXTURES = [
  {
    destination_slug: "udaipur",
    name: "Taj Lake Palace",
    slug: "taj-lake-palace",
    description: "A floating marble palace on Lake Pichola with private jetties and iconic sunset views.",
    address: "Pichola, Udaipur",
    capacity: 200,
    price_range: "₹50L–₹1.5Cr",
    hero_image:
      "https://images.unsplash.com/photo-1515091943-9d5c0ad475af?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Lake View", "Heritage Suites", "Royal Dining", "Boat Service"],
  },
  {
    destination_slug: "udaipur",
    name: "Oberoi Udaivilas",
    slug: "oberoi-udaivilas",
    description: "Courtyards, lakefront lawns, and a polished luxury operations team.",
    address: "Haridas Ji Ki Magri, Udaipur",
    capacity: 350,
    price_range: "₹40L–₹1.2Cr",
    hero_image:
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Poolside", "Garden Lawns", "Spa", "Lakefront"],
  },
  {
    destination_slug: "jaipur",
    name: "Rambagh Palace",
    slug: "rambagh-palace",
    description: "Historic gardens and banquet spaces ideal for formal, high-touch guest experiences.",
    address: "Bhawani Singh Rd, Jaipur",
    capacity: 400,
    price_range: "₹45L–₹1.3Cr",
    hero_image:
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Mughal Gardens", "Polo Ground", "Heritage Suites", "Indoor Banquet"],
  },
  {
    destination_slug: "jaipur",
    name: "Samode Palace",
    slug: "samode-palace",
    description: "Mirrored halls, terraced lawns, and a more intimate palace atmosphere.",
    address: "Samode, Jaipur",
    capacity: 250,
    price_range: "₹30L–₹80L",
    hero_image:
      "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Sheesh Mahal", "Courtyard", "Pool Garden", "Rooftop Terrace"],
  },
  {
    destination_slug: "goa",
    name: "W Goa",
    slug: "w-goa",
    description: "Cliffside ceremonies with a younger, nightlife-ready guest flow.",
    address: "Vagator Beach, Goa",
    capacity: 200,
    price_range: "₹20L–₹60L",
    hero_image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Beach Access", "Cliff-top Lawns", "Infinity Pool", "Sunset Deck"],
  },
  {
    destination_slug: "goa",
    name: "Grand Hyatt Goa",
    slug: "grand-hyatt-goa",
    description: "A larger-format Indo-Portuguese resort for guest-heavy destination weddings.",
    address: "Bambolim, Goa",
    capacity: 500,
    price_range: "₹25L–₹75L",
    hero_image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Ballroom", "Beach Lawn", "Multiple Pools", "Spa Village"],
  },
  {
    destination_slug: "kerala",
    name: "Kumarakom Lake Resort",
    slug: "kumarakom-lake-resort",
    description: "Backwater-facing resort with intimate ceremony spaces and strong hospitality detail.",
    address: "Kumarakom, Kerala",
    capacity: 150,
    price_range: "₹15L–₹50L",
    hero_image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=80",
    gallery: [],
    amenities: ["Backwater View", "Houseboat", "Ayurvedic Spa", "Kerala Cuisine"],
  },
] as const;

const PACKAGE_TIER_FIXTURES = [
  {
    name: "Essential",
    slug: "essential",
    tagline: "A Beautiful Beginning",
    description:
      "A lean planning system with enough support to make a destination wedding feel coherent and calm.",
    starting_price: 1500000,
    inclusions: [
      "Venue coordination",
      "Basic decor styling",
      "Photography coverage",
      "Day-of coordination",
      "Guest accommodation assistance",
    ],
    sort_order: 0,
  },
  {
    name: "Curated",
    slug: "curated",
    tagline: "Full Curation",
    description:
      "A premium mid-market package with stronger art direction, vendor curation, and guest experience planning.",
    starting_price: 3500000,
    inclusions: [
      "Everything in Essential",
      "Custom decor design",
      "Premium photographer & videographer",
      "Full planning & coordination",
      "Guest experience curation",
    ],
    sort_order: 1,
  },
  {
    name: "Bespoke",
    slug: "bespoke",
    tagline: "Bespoke Luxury",
    description:
      "A fully custom destination wedding build with dedicated planning leadership and elevated sourcing.",
    starting_price: 7500000,
    inclusions: [
      "Everything in Curated",
      "Dedicated wedding architect",
      "International vendor sourcing",
      "Luxury transport fleet",
      "Multi-day event design",
    ],
    sort_order: 2,
  },
] as const;

const BLOG_POST_FIXTURES = [
  {
    title: "Why Destination Weddings Feel Different",
    slug: "why-destination-weddings-feel-different",
    excerpt:
      "A destination wedding changes the cadence of the event, the guest experience, and the kind of memories people carry home.",
    content:
      "Destination weddings work because they compress attention. Guests arrive with fewer competing routines, couples get more shared time with the people they care about, and the place itself becomes part of the ceremony. The point is not scale for its own sake. The point is designing an atmosphere people can feel as soon as they arrive.",
    author: "Elysian Editorial",
    tags: ["destination", "planning", "editorial"],
    is_published: true,
    published_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    title: "Budgeting Without the Spreadsheet Anxiety",
    slug: "budgeting-without-the-spreadsheet-anxiety",
    excerpt:
      "A wedding budget becomes far more useful when it behaves like an investment plan instead of a punishment spreadsheet.",
    content:
      "Most couples do not need more budget tabs. They need a system that separates what matters, what is still quoted, and what is already committed. The practical move is to establish category targets early, then update actuals only as decisions harden. That creates financial visibility without draining momentum from the creative work.",
    author: "Elysian Editorial",
    tags: ["budget", "planning", "guide"],
    is_published: true,
    published_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    title: "The Art of the Guest Experience",
    slug: "the-art-of-the-guest-experience",
    excerpt:
      "The strongest guest experiences are built from transitions: arrival, rooming, event movement, and the quiet moments between the formal ones.",
    content:
      "Guest experience is operational design. It starts before the ceremony with airport pickups, rooming notes, and welcome touchpoints. It continues with pacing, signage, transport, and how quickly guests know where they should be next. The best weddings feel generous because friction has already been removed.",
    author: "Elysian Editorial",
    tags: ["guests", "planning", "experience"],
    is_published: true,
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
] as const;

const TESTIMONIAL_FIXTURES = [
  {
    couple_name: "Priya & Arjun",
    destination: "Udaipur",
    quote:
      "They understood what we wanted the atmosphere to feel like, not just what vendors to book.",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80",
    is_published: true,
    sort_order: 0,
  },
  {
    couple_name: "Meera & Vikram",
    destination: "Jaipur",
    quote:
      "We never felt like we were being pushed through a template. Every decision felt tailored.",
    image:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80",
    is_published: true,
    sort_order: 1,
  },
  {
    couple_name: "Aisha & Rohan",
    destination: "Goa",
    quote:
      "The guest flow was so smooth that the weekend felt effortless even though it had many moving pieces.",
    image:
      "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=900&q=80",
    is_published: true,
    sort_order: 2,
  },
] as const;

const ADMIN_FIXTURE: FixtureIdentity = {
  key: "platform-admin",
  label: "Platform Admin",
  email: "testing+admin@elysiancelebrations.app",
  firstName: "Elysian",
  lastName: "Admin",
  role: "ADMIN",
  defaultRoute: "/admin",
};

const CLIENT_FIXTURES: ClientFixture[] = [
  {
    key: "priya-arjun",
    label: "Priya & Arjun",
    email: "testing+priya-arjun@elysiancelebrations.app",
    firstName: "Priya",
    lastName: "Malhotra",
    role: "CLIENT",
    defaultRoute: "/client",
    partnerName: "Priya & Arjun",
    weddingDate: "2026-11-18T16:00:00.000Z",
    estimatedBudget: 6800000,
    guestCount: 180,
    notes:
      "High-touch Udaipur wedding with strong guest hospitality, live music, and a polished floral build.",
    destinationSlug: "udaipur",
    packageTierSlug: "curated",
    weddingStatus: "CONFIRMED",
    weddingName: "Priya & Arjun in Udaipur",
    eventBlueprint: [
      {
        name: "Welcome Dinner",
        offsetDays: -2,
        venue: "Oberoi Udaivilas",
        notes: "Lake-facing welcome evening with live instrumentals and room-drop gifts.",
      },
      {
        name: "Sangeet Night",
        offsetDays: -1,
        venue: "Taj Lake Palace",
        notes: "Performance-heavy evening with family choreography and a couture afterparty look.",
      },
      {
        name: "Wedding Ceremony",
        offsetDays: 0,
        venue: "Taj Lake Palace",
        notes: "Sunset pheras followed by seated dinner and floating candle installation.",
      },
    ],
  },
  {
    key: "aisha-rohan",
    label: "Aisha & Rohan",
    email: "testing+aisha-rohan@elysiancelebrations.app",
    firstName: "Aisha",
    lastName: "Kapoor",
    role: "CLIENT",
    defaultRoute: "/client",
    partnerName: "Aisha & Rohan",
    weddingDate: "2026-09-05T15:30:00.000Z",
    estimatedBudget: 4200000,
    guestCount: 120,
    notes:
      "Goa beach wedding with a lighter, hospitality-led guest experience and stronger focus on music.",
    destinationSlug: "goa",
    packageTierSlug: "essential",
    weddingStatus: "PLANNING",
    weddingName: "Aisha & Rohan in Goa",
    eventBlueprint: [
      {
        name: "Beach Welcome Dinner",
        offsetDays: -1,
        venue: "W Goa",
        notes: "Informal oceanfront dinner with acoustic trio and open seating.",
      },
      {
        name: "Sunset Ceremony",
        offsetDays: 0,
        venue: "W Goa",
        notes: "Cliffside vows with a smaller floral frame and low, warm lighting.",
      },
      {
        name: "After Party",
        offsetDays: 0,
        venue: "Grand Hyatt Goa",
        notes: "Late-night DJ set, custom lighting package, and recovery brunch invitations.",
      },
    ],
  },
] as const;

const VENDOR_FIXTURES: VendorFixture[] = [
  {
    key: "the-story-room",
    label: "The Story Room",
    email: "testing+the-story-room@elysiancelebrations.app",
    firstName: "Rana",
    lastName: "Sethi",
    role: "VENDOR",
    defaultRoute: "/vendor",
    businessName: "The Story Room",
    slug: "the-story-room",
    categorySlug: "photography",
    description:
      "Editorial wedding photography and short-form film coverage focused on movement, architecture, and atmosphere.",
    shortBio: "Editorial wedding photography for destination celebrations.",
    city: "Udaipur",
    state: "Rajasthan",
    experience: 11,
    isVerified: true,
    isFeatured: true,
    coverImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?auto=format&fit=crop&w=1200&q=80",
    ],
    destinations: ["udaipur", "jaipur", "goa"],
    services: [
      {
        name: "Wedding Day Coverage",
        description: "Two shooters, 12-hour coverage, and a 10-day highlight delivery.",
        basePrice: 325000,
        maxPrice: 485000,
        unit: "event",
      },
      {
        name: "Multi-day Editorial Film",
        description: "A cinematic destination wedding film with rehearsal and brunch coverage.",
        basePrice: 425000,
        maxPrice: 650000,
        unit: "project",
      },
    ],
  },
  {
    key: "house-of-petals",
    label: "House of Petals",
    email: "testing+house-of-petals@elysiancelebrations.app",
    firstName: "Naina",
    lastName: "Bedi",
    role: "VENDOR",
    defaultRoute: "/vendor",
    businessName: "House of Petals",
    slug: "house-of-petals",
    categorySlug: "decor",
    description:
      "Full-scale floral direction, stage architecture, and event styling for luxury weddings.",
    shortBio: "Large-format floral and decor builds with architectural discipline.",
    city: "Jaipur",
    state: "Rajasthan",
    experience: 9,
    isVerified: true,
    isFeatured: true,
    coverImage:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80",
    ],
    destinations: ["jaipur", "udaipur", "jodhpur"],
    services: [
      {
        name: "Floral Design Direction",
        description: "Concept decks, floral sourcing, and ceremony styling.",
        basePrice: 210000,
        maxPrice: 480000,
        unit: "event",
      },
      {
        name: "Sangeet Production Decor",
        description: "Set build, stage styling, lounge zones, and lighting coordination.",
        basePrice: 260000,
        maxPrice: 620000,
        unit: "event",
      },
    ],
  },
  {
    key: "saffron-feast",
    label: "Saffron Feast",
    email: "testing+saffron-feast@elysiancelebrations.app",
    firstName: "Kabir",
    lastName: "Ahuja",
    role: "VENDOR",
    defaultRoute: "/vendor",
    businessName: "Saffron Feast",
    slug: "saffron-feast",
    categorySlug: "catering",
    description:
      "Destination wedding catering teams built for service speed, menu variety, and guest hospitality.",
    shortBio: "Catering systems that still feel personal for multi-day weddings.",
    city: "Delhi",
    state: "Delhi",
    experience: 13,
    isVerified: true,
    isFeatured: false,
    coverImage:
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1400&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80",
    ],
    destinations: ["udaipur", "jaipur", "goa"],
    services: [
      {
        name: "Signature Wedding Menu",
        description: "Full-service wedding catering with live counters and curated service staff.",
        basePrice: 680000,
        maxPrice: 1400000,
        unit: "event",
      },
      {
        name: "Guest Welcome Hampers",
        description: "Arrival snacks, room drops, and breakfast pantry curation.",
        basePrice: 85000,
        maxPrice: 220000,
        unit: "project",
      },
    ],
  },
  {
    key: "velvet-notes-collective",
    label: "Velvet Notes Collective",
    email: "testing+velvet-notes@elysiancelebrations.app",
    firstName: "Ira",
    lastName: "Shah",
    role: "VENDOR",
    defaultRoute: "/vendor",
    businessName: "Velvet Notes Collective",
    slug: "velvet-notes-collective",
    categorySlug: "entertainment",
    description:
      "Music direction, DJs, live acts, and production support for events with a stronger performance identity.",
    shortBio: "Entertainment direction for couples who want the event arc to feel intentional.",
    city: "Mumbai",
    state: "Maharashtra",
    experience: 8,
    isVerified: false,
    isFeatured: false,
    coverImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1200&q=80",
    ],
    destinations: ["goa", "jaipur"],
    services: [
      {
        name: "Sangeet Music Direction",
        description: "Live act sequencing, DJ handoffs, rehearsals, and production notes.",
        basePrice: 165000,
        maxPrice: 320000,
        unit: "event",
      },
      {
        name: "After Party DJ Set",
        description: "Late-night DJ coverage with a custom set and MC support.",
        basePrice: 90000,
        maxPrice: 180000,
        unit: "event",
      },
    ],
  },
  {
    key: "noor-bridal-atelier",
    label: "Noor Bridal Atelier",
    email: "testing+noor-bridal@elysiancelebrations.app",
    firstName: "Noor",
    lastName: "Chawla",
    role: "VENDOR",
    defaultRoute: "/vendor",
    businessName: "Noor Bridal Atelier",
    slug: "noor-bridal-atelier",
    categorySlug: "makeup",
    description:
      "Bridal beauty direction covering ceremony looks, draping, and event-to-event styling continuity.",
    shortBio: "Soft-glam beauty direction with full event-day support.",
    city: "Goa",
    state: "Goa",
    experience: 7,
    isVerified: true,
    isFeatured: false,
    coverImage:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1400&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    ],
    destinations: ["goa", "kerala"],
    services: [
      {
        name: "Bridal Ceremony Glam",
        description: "Main ceremony look with hair, makeup, draping, and touch-up kit.",
        basePrice: 85000,
        maxPrice: 140000,
        unit: "event",
      },
      {
        name: "Two-event Styling Support",
        description: "Pre-function and wedding day beauty support with one assistant artist.",
        basePrice: 125000,
        maxPrice: 190000,
        unit: "project",
      },
    ],
  },
  {
    key: "the-wedding-chapter",
    label: "The Wedding Chapter",
    email: "testing+the-wedding-chapter@elysiancelebrations.app",
    firstName: "Sonia",
    lastName: "Bajaj",
    role: "VENDOR",
    defaultRoute: "/vendor",
    businessName: "The Wedding Chapter",
    slug: "the-wedding-chapter",
    categorySlug: "planning",
    description:
      "Lead planners for couples who need operational structure without losing the feel of a personal celebration.",
    shortBio: "Destination wedding planning with strong guest logistics and calm operations.",
    city: "Delhi",
    state: "Delhi",
    experience: 12,
    isVerified: true,
    isFeatured: true,
    coverImage:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
    ],
    destinations: ["udaipur", "goa", "jaipur", "kerala"],
    services: [
      {
        name: "Full Planning Retainer",
        description: "Planning, vendor coordination, guest movement, and event execution.",
        basePrice: 360000,
        maxPrice: 680000,
        unit: "project",
      },
      {
        name: "Guest Experience Desk",
        description: "Airport pickups, rooming matrix, welcome notes, and live guest support.",
        basePrice: 125000,
        maxPrice: 260000,
        unit: "project",
      },
    ],
  },
] as const;

const CONTACT_INQUIRY_FIXTURES: ContactInquiryFixture[] = [
  {
    name: "Sanya Khanna",
    email: "testing+lead-one@elysiancelebrations.app",
    phone: "+91 98765 10001",
    destination: "Jaipur",
    weddingDate: "February 2027",
    guestCount: "220",
    message:
      "We want a Jaipur palace wedding with stronger guest logistics support and help curating entertainment.",
    status: "NEW",
  },
  {
    name: "Aditya Rao",
    email: "testing+lead-two@elysiancelebrations.app",
    phone: "+91 98765 10002",
    destination: "Goa",
    weddingDate: "December 2026",
    guestCount: "110",
    message:
      "Looking for a smaller Goa wedding with a hospitality-led experience and a faster planning timeline.",
    status: "CONTACTED",
  },
  {
    name: "Tara Mehta",
    email: "testing+lead-three@elysiancelebrations.app",
    phone: "+91 98765 10003",
    destination: "Udaipur",
    weddingDate: "November 2026",
    guestCount: "180",
    message:
      "Need support comparing venues, guest room blocks, and photography options for a three-day celebration.",
    status: "IN_PROGRESS",
  },
] as const;

const BOOKING_FIXTURES = [
  {
    key: "priya-photo",
    clientKey: "priya-arjun",
    vendorSlug: "the-story-room",
    serviceName: "Wedding Day Coverage",
    eventName: "Wedding Ceremony",
    status: "CONFIRMED",
    totalAmount: 360000,
    paidAmount: 120000,
    notes: "Need one sunrise couple session the morning after the wedding.",
  },
  {
    key: "priya-decor",
    clientKey: "priya-arjun",
    vendorSlug: "house-of-petals",
    serviceName: "Sangeet Production Decor",
    eventName: "Sangeet Night",
    status: "QUOTE_SENT",
    totalAmount: 325000,
    paidAmount: 0,
    notes: "Family wants a richer stage look and lounge corners for elderly guests.",
  },
  {
    key: "priya-catering",
    clientKey: "priya-arjun",
    vendorSlug: "saffron-feast",
    serviceName: "Signature Wedding Menu",
    eventName: "Wedding Ceremony",
    status: "DEPOSIT_PAID",
    totalAmount: 920000,
    paidAmount: 280000,
    notes: "Need Jain menu options and breakfast hampers for room drops.",
  },
  {
    key: "aisha-entertainment",
    clientKey: "aisha-rohan",
    vendorSlug: "velvet-notes-collective",
    serviceName: "After Party DJ Set",
    eventName: "After Party",
    status: "INQUIRY",
    totalAmount: 125000,
    paidAmount: 0,
    notes: "Couple wants a lighter set that can move from afrobeats into classic Bollywood.",
  },
  {
    key: "aisha-makeup",
    clientKey: "aisha-rohan",
    vendorSlug: "noor-bridal-atelier",
    serviceName: "Bridal Ceremony Glam",
    eventName: "Sunset Ceremony",
    status: "CONFIRMED",
    totalAmount: 98000,
    paidAmount: 30000,
    notes: "Need humidity-friendly finish and a touch-up artist on standby.",
  },
  {
    key: "aisha-planning",
    clientKey: "aisha-rohan",
    vendorSlug: "the-wedding-chapter",
    serviceName: "Full Planning Retainer",
    eventName: null,
    status: "COMPLETED",
    totalAmount: 420000,
    paidAmount: 420000,
    notes: "Planning retainer closed after final reconciliation.",
  },
] as const;

const REVIEW_FIXTURES = [
  {
    clientKey: "priya-arjun",
    vendorSlug: "the-story-room",
    rating: 5,
    title: "Understood the atmosphere immediately",
    content:
      "They captured the architecture and the quieter in-between moments without making the coverage feel staged.",
  },
  {
    clientKey: "priya-arjun",
    vendorSlug: "saffron-feast",
    rating: 4,
    title: "Strong hospitality team",
    content:
      "Service was fast, special menus were handled well, and guest feedback on breakfast hampers was excellent.",
  },
  {
    clientKey: "aisha-rohan",
    vendorSlug: "the-wedding-chapter",
    rating: 5,
    title: "Planning stayed calm from start to finish",
    content:
      "They kept our guest movement and event timings under control even when decisions changed late.",
  },
] as const;

const MESSAGE_BLUEPRINTS: Record<string, string[]> = {
  "priya-photo": [
    "We loved the editorial examples on your profile. Can you also cover the welcome dinner?",
    "Yes, we can extend coverage to the welcome dinner and build the final quote around both events.",
    "Please include one quiet sunrise session if the schedule allows.",
  ],
  "priya-decor": [
    "Sharing the first Sangeet references. We want a stronger stage and warmer lighting.",
    "We can move the quote toward a richer stage build and lounge corners without losing circulation space.",
  ],
  "priya-catering": [
    "Need Jain counters, kid-friendly breakfast, and room drops for close family.",
    "Understood. We will structure the menu with dedicated Jain counters and room-drop hampers.",
  ],
  "aisha-entertainment": [
    "We want the after party to feel looser than the main ceremony, with no hard EDM turn.",
    "That works. We can build a warm set arc and keep the transition from live music into DJ smooth.",
  ],
  "aisha-makeup": [
    "Can you keep the makeup lightweight enough for the beach ceremony humidity?",
    "Yes, we would prep for humidity and keep an artist for quick touch-ups before the ceremony starts.",
  ],
  "aisha-planning": [
    "Thanks again for getting the rooming and transport matrix under control.",
    "Glad it helped. We have closed the final reconciliation and shared the last planning notes.",
  ],
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createSupabaseAdminClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function createClerkAdminClient() {
  return createClerkClient({
    secretKey: requireEnv("CLERK_SECRET_KEY"),
  });
}

async function ensureSuccess(
  action: string,
  promise: PromiseLike<{ error: { message?: string } | null }>
) {
  const { error } = await promise;
  if (error) {
    throw new Error(`${action}: ${error.message ?? "Unknown Supabase error"}`);
  }
}

async function seedReferenceData(supabase: SupabaseClient) {
  await ensureSuccess(
    "Seeding vendor categories",
    supabase
      .from("vendor_categories")
      .upsert(VENDOR_CATEGORY_FIXTURES, { onConflict: "slug" })
  );

  await ensureSuccess(
    "Seeding destinations",
    supabase.from("destinations").upsert(DESTINATION_FIXTURES, {
      onConflict: "slug",
    })
  );

  const { data: destinationRows, error: destinationError } = await supabase
    .from("destinations")
    .select("id, slug");
  if (destinationError) {
    throw new Error(`Loading destination ids: ${destinationError.message}`);
  }

  const destinationIdBySlug = new Map(
    (destinationRows ?? []).map((row) => [row.slug as string, row.id as string])
  );

  const venueRows = VENUE_FIXTURES.map((fixture) => {
    const destinationId = destinationIdBySlug.get(fixture.destination_slug);
    if (!destinationId) {
      throw new Error(`Destination not found for venue fixture: ${fixture.destination_slug}`);
    }

    return {
      destination_id: destinationId,
      name: fixture.name,
      slug: fixture.slug,
      description: fixture.description,
      address: fixture.address,
      capacity: fixture.capacity,
      price_range: fixture.price_range,
      hero_image: fixture.hero_image,
      gallery: fixture.gallery,
      amenities: fixture.amenities,
      is_active: true,
    };
  });

  await ensureSuccess(
    "Seeding venues",
    supabase.from("venues").upsert(venueRows, { onConflict: "slug" })
  );

  await ensureSuccess(
    "Seeding package tiers",
    supabase.from("package_tiers").upsert(PACKAGE_TIER_FIXTURES, {
      onConflict: "slug",
    })
  );

  await ensureSuccess(
    "Seeding blog posts",
    supabase.from("blog_posts").upsert(BLOG_POST_FIXTURES, {
      onConflict: "slug",
    })
  );

  await ensureSuccess(
    "Clearing fixture testimonials",
    supabase
      .from("testimonials")
      .delete()
      .in(
        "couple_name",
        TESTIMONIAL_FIXTURES.map((fixture) => fixture.couple_name)
      )
  );

  await ensureSuccess(
    "Seeding testimonials",
    supabase.from("testimonials").insert(TESTIMONIAL_FIXTURES)
  );
}

async function ensureFixtureUser(
  clerk: ClerkClient,
  supabase: SupabaseClient,
  fixture: FixtureIdentity,
  password: string
) {
  const existing = await clerk.users.getUserList({
    emailAddress: [fixture.email],
    limit: 1,
  });

  const createPayload = {
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    password,
    skipPasswordChecks: true,
    skipPasswordRequirement: true,
    publicMetadata: {
      role: fixture.role.toLowerCase(),
    },
  };
  const updatePayload = {
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    password,
    skipPasswordChecks: true,
    publicMetadata: {
      role: fixture.role.toLowerCase(),
    },
  };

  const clerkUser =
    existing.data[0] ??
    (await clerk.users.createUser({
      emailAddress: [fixture.email],
      ...createPayload,
    }));

  if (existing.data[0]) {
    await clerk.users.updateUser(clerkUser.id, updatePayload);
  }

  const displayName = `${fixture.firstName} ${fixture.lastName}`.trim();
  const { data: userRow, error } = await supabase
    .from("users")
    .upsert(
      {
        id: clerkUser.id,
        email: fixture.email,
        name: displayName,
        role: fixture.role,
        is_active: true,
      },
      { onConflict: "id" }
    )
    .select("id, email")
    .single();

  if (error || !userRow) {
    throw new Error(`Upserting app user for ${fixture.email}: ${error?.message ?? "No row returned"}`);
  }

  return userRow as UserRecord;
}

async function loadLookupMap(
  supabase: SupabaseClient,
  table: "vendor_categories" | "destinations" | "package_tiers"
) {
  const { data, error } = await supabase.from(table).select("id, slug");
  if (error) {
    throw new Error(`Loading ${table}: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.slug as string, row.id as string]));
}

async function upsertClientProfiles(
  supabase: SupabaseClient,
  users: Map<string, UserRecord>
) {
  const records = new Map<string, ClientProfileRecord>();

  for (const fixture of CLIENT_FIXTURES) {
    const user = users.get(fixture.key);
    if (!user) {
      throw new Error(`Missing user record for client fixture: ${fixture.key}`);
    }

    const { data, error } = await supabase
      .from("client_profiles")
      .upsert(
        {
          user_id: user.id,
          partner_name: fixture.partnerName,
          wedding_date: fixture.weddingDate,
          estimated_budget: fixture.estimatedBudget,
          guest_count: fixture.guestCount,
          notes: fixture.notes,
        },
        { onConflict: "user_id" }
      )
      .select("id, user_id")
      .single();

    if (error || !data) {
      throw new Error(`Upserting client profile for ${fixture.email}: ${error?.message ?? "No row returned"}`);
    }

    records.set(fixture.key, data as ClientProfileRecord);
  }

  return records;
}

async function upsertVendorProfiles(
  supabase: SupabaseClient,
  users: Map<string, UserRecord>,
  categoryIds: Map<string, string>
) {
  const records = new Map<string, VendorProfileRecord>();

  for (const fixture of VENDOR_FIXTURES) {
    const user = users.get(fixture.key);
    if (!user) {
      throw new Error(`Missing user record for vendor fixture: ${fixture.key}`);
    }

    const categoryId = categoryIds.get(fixture.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category ${fixture.categorySlug} for vendor ${fixture.slug}`);
    }

    const { data, error } = await supabase
      .from("vendor_profiles")
      .upsert(
        {
          user_id: user.id,
          business_name: fixture.businessName,
          slug: fixture.slug,
          category_id: categoryId,
          description: fixture.description,
          short_bio: fixture.shortBio,
          cover_image: fixture.coverImage,
          portfolio: fixture.portfolio,
          city: fixture.city,
          state: fixture.state,
          country: "India",
          experience: fixture.experience,
          is_verified: fixture.isVerified,
          is_featured: fixture.isFeatured,
          rating: 0,
          review_count: 0,
        },
        { onConflict: "user_id" }
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`Upserting vendor profile for ${fixture.email}: ${error?.message ?? "No row returned"}`);
    }

    records.set(fixture.slug, data as VendorProfileRecord);
  }

  return records;
}

async function resetFixtureData(
  supabase: SupabaseClient,
  userIds: string[],
  clientProfileIds: string[],
  vendorProfileIds: string[],
  inquiryEmails: string[]
) {
  if (vendorProfileIds.length > 0) {
    await ensureSuccess(
      "Clearing vendor services",
      supabase.from("vendor_services").delete().in("vendor_profile_id", vendorProfileIds)
    );
    await ensureSuccess(
      "Clearing vendor destinations",
      supabase.from("vendor_destinations").delete().in("vendor_profile_id", vendorProfileIds)
    );
  }

  if (clientProfileIds.length > 0) {
    const { data: bookingRows, error: bookingLoadError } = await supabase
      .from("bookings")
      .select("id")
      .in("client_profile_id", clientProfileIds);
    if (bookingLoadError) {
      throw new Error(`Loading existing bookings: ${bookingLoadError.message}`);
    }

    const bookingIds = (bookingRows ?? []).map((row) => row.id as string);
    if (bookingIds.length > 0) {
      await ensureSuccess(
        "Clearing booking messages",
        supabase.from("messages").delete().in("booking_id", bookingIds)
      );
    }

    await ensureSuccess(
      "Clearing bookings",
      supabase.from("bookings").delete().in("client_profile_id", clientProfileIds)
    );
    await ensureSuccess(
      "Clearing reviews",
      supabase.from("reviews").delete().in("client_profile_id", clientProfileIds)
    );
    await ensureSuccess(
      "Clearing weddings",
      supabase.from("weddings").delete().in("client_profile_id", clientProfileIds)
    );
    await ensureSuccess(
      "Clearing budgets",
      supabase.from("budgets").delete().in("client_profile_id", clientProfileIds)
    );
    await ensureSuccess(
      "Clearing guest lists",
      supabase.from("guest_lists").delete().in("client_profile_id", clientProfileIds)
    );
    await ensureSuccess(
      "Clearing mood boards",
      supabase.from("mood_boards").delete().in("client_profile_id", clientProfileIds)
    );
  }

  if (userIds.length > 0) {
    await ensureSuccess(
      "Clearing notifications",
      supabase.from("notifications").delete().in("user_id", userIds)
    );
  }

  if (inquiryEmails.length > 0) {
    await ensureSuccess(
      "Clearing contact inquiries",
      supabase.from("contact_inquiries").delete().in("email", inquiryEmails)
    );
  }
}

async function seedVendorServicesAndDestinations(
  supabase: SupabaseClient,
  vendorProfiles: Map<string, VendorProfileRecord>,
  destinationIds: Map<string, string>
) {
  const serviceRows: ServiceRecord[] = [];

  for (const fixture of VENDOR_FIXTURES) {
    const vendorProfile = vendorProfiles.get(fixture.slug);
    if (!vendorProfile) {
      throw new Error(`Missing vendor profile for ${fixture.slug}`);
    }

    await ensureSuccess(
      `Seeding destinations for ${fixture.slug}`,
      supabase.from("vendor_destinations").insert(
        fixture.destinations.map((destinationSlug) => {
          const destinationId = destinationIds.get(destinationSlug);
          if (!destinationId) {
            throw new Error(`Missing destination ${destinationSlug} for vendor ${fixture.slug}`);
          }
          return {
            vendor_profile_id: vendorProfile.id,
            destination_id: destinationId,
          };
        })
      )
    );

    const { data: insertedServices, error } = await supabase
      .from("vendor_services")
      .insert(
        fixture.services.map((service) => ({
          vendor_profile_id: vendorProfile.id,
          name: service.name,
          description: service.description,
          base_price: service.basePrice,
          max_price: service.maxPrice,
          unit: service.unit,
          is_active: true,
        }))
      )
      .select("id, name, vendor_profile_id");

    if (error) {
      throw new Error(`Seeding services for ${fixture.slug}: ${error.message}`);
    }

    serviceRows.push(...((insertedServices ?? []) as ServiceRecord[]));
  }

  return serviceRows;
}

function getFixtureByClientKey(key: string) {
  const fixture = CLIENT_FIXTURES.find((item) => item.key === key);
  if (!fixture) {
    throw new Error(`Unknown client fixture: ${key}`);
  }
  return fixture;
}

function addDays(iso: string, offsetDays: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

function buildBudgetCategories(client: ClientFixture) {
  const venueWeight = Math.round(client.estimatedBudget * 0.36);
  const decorWeight = Math.round(client.estimatedBudget * 0.16);
  const contentWeight = Math.round(client.estimatedBudget * 0.14);
  const hospitalityWeight = Math.round(client.estimatedBudget * 0.12);
  const logisticsWeight = Math.round(client.estimatedBudget * 0.1);
  const contingencyWeight =
    client.estimatedBudget -
    venueWeight -
    decorWeight -
    contentWeight -
    hospitalityWeight -
    logisticsWeight;

  return [
    {
      name: "Venue & Hospitality",
      allocated: venueWeight,
      items: [
        {
          name: `${client.destinationSlug.toUpperCase()} venue hold`,
          estimated_cost: Math.round(venueWeight * 0.7),
          actual_cost: Math.round(venueWeight * 0.68),
          quantity: 1,
          is_paid: true,
          notes: "Primary venue reservation with guest room block.",
        },
        {
          name: "Guest rooming uplift",
          estimated_cost: Math.round(venueWeight * 0.3),
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Overflow room block and early check-in support.",
        },
      ],
    },
    {
      name: "Design & Decor",
      allocated: decorWeight,
      items: [
        {
          name: "Ceremony floral build",
          estimated_cost: Math.round(decorWeight * 0.55),
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Main floral frame, aisle, and stage styling.",
        },
        {
          name: "Sangeet styling",
          estimated_cost: Math.round(decorWeight * 0.45),
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Stage design, lounges, and practical lighting.",
        },
      ],
    },
    {
      name: "Photo, Film & Beauty",
      allocated: contentWeight,
      items: [
        {
          name: "Photography & film",
          estimated_cost: Math.round(contentWeight * 0.7),
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Editorial stills plus short-form film coverage.",
        },
        {
          name: "Styling & beauty",
          estimated_cost: Math.round(contentWeight * 0.3),
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Ceremony look plus one additional event.",
        },
      ],
    },
    {
      name: "Guests, Logistics & Contingency",
      allocated: hospitalityWeight + logisticsWeight + contingencyWeight,
      items: [
        {
          name: "Transport & pickups",
          estimated_cost: logisticsWeight,
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Airport movement, on-site carts, and elderly guest assistance.",
        },
        {
          name: "Welcome hampers",
          estimated_cost: hospitalityWeight,
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Room drops, stationery, and local snacks.",
        },
        {
          name: "Buffer",
          estimated_cost: contingencyWeight,
          actual_cost: null,
          quantity: 1,
          is_paid: false,
          notes: "Reserved for scope changes and weather pivots.",
        },
      ],
    },
  ];
}

function buildGuestRows(client: ClientFixture) {
  const prefixes =
    client.key === "priya-arjun"
      ? ["Malhotra", "Singh", "Bedi", "Khanna", "Ahuja", "Mehra"]
      : ["Kapoor", "Rao", "Shah", "Gupta", "Kohli", "Sethi"];

  return prefixes.map((family, index) => ({
    name: `${family} Family ${index + 1}`,
    email: `testing+${client.key}-guest-${index + 1}@elysiancelebrations.app`,
    phone: `+91 98765${String(20000 + index).padStart(5, "0")}`,
    side: index % 2 === 0 ? "BRIDE" : "GROOM",
    rsvp_status: index < 4 ? "CONFIRMED" : "PENDING",
    meal_pref: index % 3 === 0 ? "Vegetarian" : "No preference",
    plus_one: index % 2 === 0,
    table_number: index < 4 ? index + 1 : null,
    notes: index === 0 ? "Needs airport pickup coordination." : null,
  }));
}

function buildTimelineRows(client: ClientFixture) {
  return [
    {
      title: "Lock final guest rooming plan",
      description: "Confirm room types, arrival windows, and early check-in exceptions.",
      due_date: addDays(client.weddingDate, -45),
      is_completed: false,
      sort_order: 0,
    },
    {
      title: "Approve decor moodboards",
      description: "Freeze color palette, floral direction, and set build constraints.",
      due_date: addDays(client.weddingDate, -35),
      is_completed: false,
      sort_order: 1,
    },
    {
      title: "Close vendor payment schedule",
      description: "Line up deposits, holdbacks, and final payment windows.",
      due_date: addDays(client.weddingDate, -28),
      is_completed: false,
      sort_order: 2,
    },
    {
      title: "Send guest movement note",
      description: "Share transport timings and event entry details with key guests.",
      due_date: addDays(client.weddingDate, -14),
      is_completed: false,
      sort_order: 3,
    },
    {
      title: "Run final production call",
      description: "Confirm arrival times, show flow, and handoff between planners and venue.",
      due_date: addDays(client.weddingDate, -4),
      is_completed: false,
      sort_order: 4,
    },
  ];
}

function buildMoodBoardRows(client: ClientFixture) {
  if (client.destinationSlug === "udaipur") {
    return [
      {
        image_url:
          "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
        caption: "Warm candlelight, mirrored water, and ivory florals.",
        source_url: "https://unsplash.com/photos/5WQJ_ejZ7y8",
        sort_order: 0,
      },
      {
        image_url:
          "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
        caption: "Formal tablescape with brass accents and layered runners.",
        source_url: "https://unsplash.com/photos/QN4OQ8vY6RY",
        sort_order: 1,
      },
      {
        image_url:
          "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
        caption: "Editorial portrait energy for quiet couple moments.",
        source_url: "https://unsplash.com/photos/nmTm7knUnqs",
        sort_order: 2,
      },
    ];
  }

  return [
    {
      image_url:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      caption: "Open-air beach dinners with warm lantern light.",
      source_url: "https://unsplash.com/photos/v9FQR4tbIq8",
      sort_order: 0,
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
      caption: "Music-forward afterparty energy without a harsh club feel.",
      source_url: "https://unsplash.com/photos/0fN7Fxv1eWA",
      sort_order: 1,
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
      caption: "Soft-glam beauty references that hold up in humidity.",
      source_url: "https://unsplash.com/photos/Pc16vUGYkY4",
      sort_order: 2,
    },
  ];
}

async function seedClientPlanningData(
  supabase: SupabaseClient,
  clientProfiles: Map<string, ClientProfileRecord>,
  destinationIds: Map<string, string>,
  packageTierIds: Map<string, string>
) {
  const weddingIds = new Map<string, string>();
  const eventIds = new Map<string, string>();

  for (const fixture of CLIENT_FIXTURES) {
    const clientProfile = clientProfiles.get(fixture.key);
    if (!clientProfile) {
      throw new Error(`Missing client profile for ${fixture.key}`);
    }

    const destinationId = destinationIds.get(fixture.destinationSlug);
    const packageTierId = packageTierIds.get(fixture.packageTierSlug);
    if (!destinationId || !packageTierId) {
      throw new Error(`Missing destination or package tier for ${fixture.key}`);
    }

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .insert({
        client_profile_id: clientProfile.id,
        name: fixture.weddingName,
        date: fixture.weddingDate,
        destination_id: destinationId,
        package_tier_id: packageTierId,
        status: fixture.weddingStatus,
      })
      .select("id")
      .single();

    if (weddingError || !wedding) {
      throw new Error(`Creating wedding for ${fixture.key}: ${weddingError?.message ?? "No row returned"}`);
    }

    weddingIds.set(fixture.key, (wedding as WeddingRecord).id);

    const { data: eventRows, error: eventError } = await supabase
      .from("wedding_events")
      .insert(
        fixture.eventBlueprint.map((event, index) => ({
          wedding_id: (wedding as WeddingRecord).id,
          name: event.name,
          date: addDays(fixture.weddingDate, event.offsetDays),
          venue: event.venue,
          notes: event.notes,
          sort_order: index,
        }))
      )
      .select("id, name");

    if (eventError) {
      throw new Error(`Creating wedding events for ${fixture.key}: ${eventError.message}`);
    }

    for (const row of eventRows ?? []) {
      eventIds.set(`${fixture.key}:${row.name as string}`, row.id as string);
    }

    const { data: budget, error: budgetError } = await supabase
      .from("budgets")
      .insert({
        client_profile_id: clientProfile.id,
        name: `${fixture.partnerName} Planning Budget`,
        total_budget: fixture.estimatedBudget,
      })
      .select("id")
      .single();

    if (budgetError || !budget) {
      throw new Error(`Creating budget for ${fixture.key}: ${budgetError?.message ?? "No row returned"}`);
    }

    const categories = buildBudgetCategories(fixture);
    for (const [categoryIndex, category] of categories.entries()) {
      const { data: budgetCategory, error: categoryError } = await supabase
        .from("budget_categories")
        .insert({
          budget_id: (budget as BudgetRecord).id,
          name: category.name,
          allocated: category.allocated,
          sort_order: categoryIndex,
        })
        .select("id")
        .single();

      if (categoryError || !budgetCategory) {
        throw new Error(`Creating budget category ${category.name}: ${categoryError?.message ?? "No row returned"}`);
      }

      await ensureSuccess(
        `Creating budget items for ${category.name}`,
        supabase.from("budget_items").insert(
          category.items.map((item, itemIndex) => ({
            budget_category_id: (budgetCategory as BudgetRecord).id,
            name: item.name,
            estimated_cost: item.estimated_cost,
            actual_cost: item.actual_cost,
            quantity: item.quantity,
            is_paid: item.is_paid,
            notes: item.notes,
            sort_order: itemIndex,
          }))
        )
      );
    }

    const { data: guestList, error: guestListError } = await supabase
      .from("guest_lists")
      .insert({
        client_profile_id: clientProfile.id,
        name: `${fixture.partnerName} Main Guest List`,
      })
      .select("id")
      .single();

    if (guestListError || !guestList) {
      throw new Error(`Creating guest list for ${fixture.key}: ${guestListError?.message ?? "No row returned"}`);
    }

    await ensureSuccess(
      `Creating guests for ${fixture.key}`,
      supabase.from("guests").insert(
        buildGuestRows(fixture).map((guest) => ({
          guest_list_id: (guestList as BudgetRecord).id,
          ...guest,
        }))
      )
    );

    await ensureSuccess(
      `Creating timeline for ${fixture.key}`,
      supabase.from("timeline_items").insert(
        buildTimelineRows(fixture).map((item) => ({
          wedding_id: (wedding as WeddingRecord).id,
          ...item,
        }))
      )
    );

    const { data: moodBoard, error: moodBoardError } = await supabase
      .from("mood_boards")
      .insert({
        client_profile_id: clientProfile.id,
        name: `${fixture.partnerName} Visual Direction`,
      })
      .select("id")
      .single();

    if (moodBoardError || !moodBoard) {
      throw new Error(`Creating mood board for ${fixture.key}: ${moodBoardError?.message ?? "No row returned"}`);
    }

    await ensureSuccess(
      `Creating mood board items for ${fixture.key}`,
      supabase.from("mood_board_items").insert(
        buildMoodBoardRows(fixture).map((item) => ({
          mood_board_id: (moodBoard as BudgetRecord).id,
          ...item,
        }))
      )
    );
  }

  return { weddingIds, eventIds };
}

async function seedBookings(
  supabase: SupabaseClient,
  clientProfiles: Map<string, ClientProfileRecord>,
  vendorProfiles: Map<string, VendorProfileRecord>,
  services: ServiceRecord[],
  eventIds: Map<string, string>
) {
  const bookingIds = new Map<string, string>();

  for (const fixture of BOOKING_FIXTURES) {
    const clientProfile = clientProfiles.get(fixture.clientKey);
    const vendorProfile = vendorProfiles.get(fixture.vendorSlug);
    if (!clientProfile || !vendorProfile) {
      throw new Error(`Missing profile references for booking ${fixture.key}`);
    }

    const service = services.find(
      (row) =>
        row.vendor_profile_id === vendorProfile.id && row.name === fixture.serviceName
    );
    if (!service) {
      throw new Error(`Missing service ${fixture.serviceName} for vendor ${fixture.vendorSlug}`);
    }

    const clientFixture = getFixtureByClientKey(fixture.clientKey);
    const eventId = fixture.eventName
      ? eventIds.get(`${fixture.clientKey}:${fixture.eventName}`)
      : null;

    const eventDate = fixture.eventName
      ? addDays(
          clientFixture.weddingDate,
          clientFixture.eventBlueprint.find((event) => event.name === fixture.eventName)
            ?.offsetDays ?? 0
        )
      : clientFixture.weddingDate;

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        client_profile_id: clientProfile.id,
        vendor_profile_id: vendorProfile.id,
        vendor_service_id: service.id,
        wedding_event_id: eventId,
        status: fixture.status,
        event_date: eventDate,
        total_amount: fixture.totalAmount,
        paid_amount: fixture.paidAmount,
        notes: fixture.notes,
      })
      .select("id")
      .single();

    if (error || !booking) {
      throw new Error(`Creating booking ${fixture.key}: ${error?.message ?? "No row returned"}`);
    }

    bookingIds.set(fixture.key, (booking as BookingRecord).id);
  }

  return bookingIds;
}

async function seedMessagesAndNotifications(
  supabase: SupabaseClient,
  users: Map<string, UserRecord>,
  bookingIds: Map<string, string>
) {
  let messageCount = 0;

  for (const bookingFixture of BOOKING_FIXTURES) {
    const bookingId = bookingIds.get(bookingFixture.key);
    const clientUser = users.get(bookingFixture.clientKey);
    const vendorFixture = VENDOR_FIXTURES.find(
      (item) => item.slug === bookingFixture.vendorSlug
    );
    const vendorUser = vendorFixture ? users.get(vendorFixture.key) : null;

    if (!bookingId || !clientUser || !vendorUser) {
      throw new Error(`Missing message references for booking ${bookingFixture.key}`);
    }

    const messages = MESSAGE_BLUEPRINTS[bookingFixture.key] ?? [];
    await ensureSuccess(
      `Creating messages for ${bookingFixture.key}`,
      supabase.from("messages").insert(
        messages.map((content, index) => ({
          booking_id: bookingId,
          sender_id: index % 2 === 0 ? clientUser.id : vendorUser.id,
          content,
          is_read: index < messages.length - 1,
        }))
      )
    );
    messageCount += messages.length;
  }

  const notificationRows = [
    {
      user_id: users.get("priya-arjun")?.id,
      type: "BOOKING_UPDATE",
      title: "Photography confirmed",
      message: "The Story Room accepted the booking and shared the coverage extension note.",
      link: "/client/bookings",
    },
    {
      user_id: users.get("priya-arjun")?.id,
      type: "MESSAGE",
      title: "Decor quote updated",
      message: "House of Petals replied with a refined Sangeet stage approach.",
      link: "/client/messages",
    },
    {
      user_id: users.get("aisha-rohan")?.id,
      type: "SYSTEM",
      title: "Mood board ready",
      message: "Your Goa mood board has been preloaded with visual references.",
      link: "/client/mood-board",
    },
    {
      user_id: users.get("the-story-room")?.id,
      type: "MESSAGE",
      title: "New client message",
      message: "Priya & Arjun asked about extending coverage to the welcome dinner.",
      link: "/vendor/messages",
    },
    {
      user_id: users.get("velvet-notes-collective")?.id,
      type: "BOOKING_UPDATE",
      title: "New inquiry",
      message: "Aisha & Rohan requested an after-party music direction note.",
      link: "/vendor/bookings",
    },
    {
      user_id: users.get("platform-admin")?.id,
      type: "SYSTEM",
      title: "Testing leads loaded",
      message: "Three fresh contact inquiries were seeded for admin review.",
      link: "/admin/inquiries",
    },
  ].filter(
    (
      row
    ): row is {
      user_id: string;
      type: "BOOKING_UPDATE" | "MESSAGE" | "SYSTEM";
      title: string;
      message: string;
      link: string;
    } => Boolean(row.user_id)
  );

  await ensureSuccess(
    "Creating notifications",
    supabase.from("notifications").insert(notificationRows)
  );

  return {
    messageCount,
    notificationCount: notificationRows.length,
  };
}

async function seedReviews(
  supabase: SupabaseClient,
  clientProfiles: Map<string, ClientProfileRecord>,
  vendorProfiles: Map<string, VendorProfileRecord>
) {
  await ensureSuccess(
    "Creating reviews",
    supabase.from("reviews").insert(
      REVIEW_FIXTURES.map((fixture) => {
        const clientProfile = clientProfiles.get(fixture.clientKey);
        const vendorProfile = vendorProfiles.get(fixture.vendorSlug);
        if (!clientProfile || !vendorProfile) {
          throw new Error(`Missing profile references for review ${fixture.vendorSlug}`);
        }
        return {
          client_profile_id: clientProfile.id,
          vendor_profile_id: vendorProfile.id,
          rating: fixture.rating,
          title: fixture.title,
          content: fixture.content,
          is_published: true,
        };
      })
    )
  );

  for (const vendor of VENDOR_FIXTURES) {
    const vendorProfile = vendorProfiles.get(vendor.slug);
    if (!vendorProfile) continue;

    const reviews = REVIEW_FIXTURES.filter(
      (fixture) => fixture.vendorSlug === vendor.slug
    );

    const reviewCount = reviews.length;
    const rating =
      reviewCount > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : 0;

    await ensureSuccess(
      `Updating vendor aggregate for ${vendor.slug}`,
      supabase
        .from("vendor_profiles")
        .update({
          rating: Math.round(rating * 10) / 10,
          review_count: reviewCount,
        })
        .eq("id", vendorProfile.id)
    );
  }
}

async function seedContactInquiries(supabase: SupabaseClient) {
  await ensureSuccess(
    "Creating contact inquiries",
    supabase.from("contact_inquiries").insert(
      CONTACT_INQUIRY_FIXTURES.map((fixture) => ({
        client_profile_id: null,
        name: fixture.name,
        email: fixture.email,
        phone: fixture.phone,
        destination: fixture.destination,
        wedding_date: fixture.weddingDate,
        guest_count: fixture.guestCount,
        message: fixture.message,
        status: fixture.status,
      }))
    )
  );
}

export async function bootstrapCloudTestingData(): Promise<CloudBootstrapSummary> {
  const clerk = createClerkAdminClient();
  const supabase = createSupabaseAdminClient();
  const password =
    process.env.ELYSIAN_TEST_USER_PASSWORD?.trim() || DEFAULT_TEST_PASSWORD;

  await seedReferenceData(supabase);

  const users = new Map<string, UserRecord>();
  const allFixtures: FixtureIdentity[] = [
    ADMIN_FIXTURE,
    ...CLIENT_FIXTURES,
    ...VENDOR_FIXTURES,
  ];

  for (const fixture of allFixtures) {
    users.set(fixture.key, await ensureFixtureUser(clerk, supabase, fixture, password));
  }

  const categoryIds = await loadLookupMap(supabase, "vendor_categories");
  const destinationIds = await loadLookupMap(supabase, "destinations");
  const packageTierIds = await loadLookupMap(supabase, "package_tiers");

  const clientProfiles = await upsertClientProfiles(supabase, users);
  const vendorProfiles = await upsertVendorProfiles(supabase, users, categoryIds);

  await resetFixtureData(
    supabase,
    [...users.values()].map((user) => user.id),
    [...clientProfiles.values()].map((profile) => profile.id),
    [...vendorProfiles.values()].map((profile) => profile.id),
    CONTACT_INQUIRY_FIXTURES.map((fixture) => fixture.email)
  );

  const services = await seedVendorServicesAndDestinations(
    supabase,
    vendorProfiles,
    destinationIds
  );
  const { eventIds } = await seedClientPlanningData(
    supabase,
    clientProfiles,
    destinationIds,
    packageTierIds
  );
  const bookingIds = await seedBookings(
    supabase,
    clientProfiles,
    vendorProfiles,
    services,
    eventIds
  );
  const { messageCount, notificationCount } =
    await seedMessagesAndNotifications(supabase, users, bookingIds);
  await seedReviews(supabase, clientProfiles, vendorProfiles);
  await seedContactInquiries(supabase);

  return {
    logins: allFixtures.map((fixture) => ({
      label: fixture.label,
      email: fixture.email,
      role: fixture.role,
      route: fixture.defaultRoute,
    })),
    counts: {
      users: allFixtures.length,
      vendorProfiles: VENDOR_FIXTURES.length,
      weddings: CLIENT_FIXTURES.length,
      bookings: BOOKING_FIXTURES.length,
      messages: messageCount,
      reviews: REVIEW_FIXTURES.length,
      notifications: notificationCount,
      inquiries: CONTACT_INQUIRY_FIXTURES.length,
    },
    ranAt: new Date().toISOString(),
  };
}

export function getCloudBootstrapPassword() {
  return process.env.ELYSIAN_TEST_USER_PASSWORD?.trim() || DEFAULT_TEST_PASSWORD;
}
