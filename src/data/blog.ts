export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  date: string;
  tags: string[];
  readingMinutes: number;
  body: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-destination-weddings-feel-different",
    title: "Why Destination Weddings Feel Different",
    excerpt:
      "There is a shift in tempo when you leave home—guests arrive as travellers, and every meal becomes a shared story.",
    coverImage: "/images/blog/cover-1.jpg",
    date: "2025-01-12",
    tags: ["Planning", "Inspiration"],
    readingMinutes: 6,
    body: [
      "A destination wedding is not simply a ceremony in another postcode; it is an invitation to slow down. Guests trade commutes for sunsets, and the weekend stretches into a narrative arc—welcome drinks, rituals at dawn, a dance floor that feels earned rather than rushed.",
      "The logistics are real—travel windows, climate, local permits—but the emotional payoff is clarity. You design fewer but richer moments, and the setting does half the storytelling: a palace courtyard, a cliff-edge lawn, or a backwater deck becomes the character everyone remembers.",
      "At Elysian, we treat the destination as a creative brief, not a backdrop. Budgets stay transparent, vendors align to your taste, and the plan bends when weather or whims ask it to—so the day still feels inevitable, wherever in the world it unfolds.",
    ],
  },
  {
    slug: "udaipur-palace-weddings-light-and-shadow",
    title: "Udaipur Palace Weddings: Light and Shadow",
    excerpt:
      "Marble courtyards, lake breezes, and the golden hour that flatters every frame—how we choreograph time in the City of Lakes.",
    coverImage: "/images/blog/cover-2.jpg",
    date: "2024-12-03",
    tags: ["Udaipur", "Design"],
    readingMinutes: 5,
    body: [
      "Udaipur rewards planners who respect the sun. Midday ceremonies can glare off pale stone; late afternoon brings Lake Pichola into its softest palette. We map processions and portraits around those beats so your photographer works with the light, not against it.",
      "Palace properties vary in scale—some suit two hundred guests with ease, others shine when kept intimate. We shortlist venues where flow feels natural: where baraat entries do not bottleneck, and where elderly guests never face impossible stairs without graceful alternatives.",
      "The city’s romance is old, but production values are modern. From wireless audio in stone arcades to wind-aware floral installs, the goal is simple: every chapter feels cinematic without ever feeling staged.",
    ],
  },
  {
    slug: "budgeting-without-the-spreadsheet-anxiety",
    title: "Budgeting Without the Spreadsheet Anxiety",
    excerpt:
      "Category-level transparency, scenario planning, and the quiet confidence of knowing where every rupee is meant to land.",
    coverImage: "/images/blog/cover-3.jpg",
    date: "2024-11-18",
    tags: ["Budget", "Transparency"],
    readingMinutes: 7,
    body: [
      "Most couples do not fear numbers—they fear surprises. Our budget framework breaks the weekend into clear categories: venue, production, hospitality, attire, photo-film, and contingency. You see ranges before you commit, and revisions stay tied to decisions you actually made.",
      "Scenario planning matters when guest counts shift or when you fall in love with a linen upgrade. We model trade-offs in plain language: fewer imported blooms versus an extra percussionist; a second shooter versus an extended cocktail hour.",
      "The outcome is not a thinner celebration—it is a calmer one. You approve line items with context, and your family hears answers backed by data, not drama.",
    ],
  },
  {
    slug: "goa-beach-vs-cliff-venues-choosing-your-rhythm",
    title: "Goa: Beach vs. Cliff Venues—Choosing Your Rhythm",
    excerpt:
      "Sand underfoot or wind on a plateau—two Goan moods, two timelines, and how to pick the one that matches your guest list.",
    coverImage: "/images/blog/cover-4.jpg",
    date: "2024-10-07",
    tags: ["Goa", "Venues"],
    readingMinutes: 5,
    body: [
      "Beachfront estates invite barefoot welcome dinners and late sound curfews negotiated with care. Cliff-top villas trade sand for panorama—fewer surprises from tide, more drama in photographs. Neither is better; they ask different shoes, different shuttles, different backup tents.",
      "Humidity and salt air influence florals and hair trials; we bake those tests into the schedule so the day-of looks like the mood board. Monsoon windows need honest conversation—we will never recommend a date that trades romance for risk without a plan B you love.",
      "Goa works when movement is solved early: rooming lists, driver routes, and clear signage for guests arriving on different flights. Rhythm beats decoration every time.",
    ],
  },
  {
    slug: "multi-day-itineraries-that-dont-exhaust-guests",
    title: "Multi-Day Itineraries That Don’t Exhaust Guests",
    excerpt:
      "Spacing, hydration, and the art of leaving whitespace so the celebration feels generous, not gruelling.",
    coverImage: "/images/blog/cover-5.jpg",
    date: "2024-09-22",
    tags: ["Planning", "Guest Experience"],
    readingMinutes: 6,
    body: [
      "The best destination weekends breathe. We avoid stacking heavy rituals back-to-back without recovery time—especially for parents and children. A pool afternoon or a slow brunch can be as memorable as the sangeet if the pacing respects jet lag and heat.",
      "Hydration stations, shaded seating, and honest start times matter more than elaborate favours. Guests forgive a late band; they remember feeling cared for when the sun was cruel.",
      "Whitespace is not empty time; it is permission to connect. The conversations that happen during unscripted hours often become the stories people repeat for years.",
    ],
  },
  {
    slug: "photography-briefs-that-actually-help-your-team",
    title: "Photography Briefs That Actually Help Your Team",
    excerpt:
      "From shot lists to family hierarchies—how to brief creatives so they capture feeling, not just faces.",
    coverImage: "/images/blog/cover-6.jpg",
    date: "2024-08-30",
    tags: ["Photography", "Tips"],
    readingMinutes: 4,
    body: [
      "A useful brief names priorities: the people who must appear in formal portraits, the rituals you never want missed, and the candid dynamics you cherish—siblings, mentors, chosen family. It also names sensitivities: divorced parents, cultural modesty, surprise performances.",
      "We encourage references that describe light and emotion more than Pinterest poses. The best frames emerge when photographers understand relationships, not only layouts.",
      "Buffer time protects art. Ten extra minutes between events often yields the frame you will print largest—because calm subjects photograph like themselves.",
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
