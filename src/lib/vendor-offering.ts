export type VendorOfferingArrays = {
  eventTypeFit: string[];
  inclusions: string[];
  deliverables: string[];
  addOns: string[];
};

export type VendorServiceItemInput = {
  itemType: string;
  name: string;
  description: string | null;
  dietaryTags: string[];
  sortOrder: number | null;
};

const ITEM_TYPE_WHITELIST = new Set([
  "inclusion",
  "menu",
  "setup",
  "deliverable",
  "performance",
  "look",
  "addon",
]);

function toStringArray(raw: unknown, max = 16, perItem = 80): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim().slice(0, perItem);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeOfferingArrays(
  body: Record<string, unknown>
): VendorOfferingArrays {
  return {
    eventTypeFit: toStringArray(body.eventTypeFit, 12, 60),
    inclusions: toStringArray(body.inclusions, 20, 120),
    deliverables: toStringArray(body.deliverables, 20, 120),
    addOns: toStringArray(body.addOns, 20, 120),
  };
}

export function normalizeServiceItems(raw: unknown): VendorServiceItemInput[] {
  if (!Array.isArray(raw)) return [];
  const items: VendorServiceItemInput[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") continue;
    const entry = candidate as Record<string, unknown>;
    const name =
      typeof entry.name === "string"
        ? entry.name.replace(/\s+/g, " ").trim()
        : "";
    if (!name) continue;
    const itemTypeRaw =
      typeof entry.itemType === "string"
        ? entry.itemType.trim().toLowerCase()
        : "";
    const itemType = ITEM_TYPE_WHITELIST.has(itemTypeRaw)
      ? itemTypeRaw
      : "inclusion";
    const description =
      typeof entry.description === "string" && entry.description.trim()
        ? entry.description.trim().slice(0, 600)
        : null;
    const dietaryTags = toStringArray(entry.dietaryTags, 6, 40);
    const sortOrderRaw = Number(entry.sortOrder);
    const sortOrder = Number.isFinite(sortOrderRaw)
      ? Math.max(0, Math.min(9999, Math.floor(sortOrderRaw)))
      : null;
    items.push({
      itemType,
      name: name.slice(0, 120),
      description,
      dietaryTags,
      sortOrder,
    });
    if (items.length >= 30) break;
  }
  return items;
}

export type VendorCategorySlug =
  | "catering"
  | "decor"
  | "photography"
  | "entertainment"
  | "makeup"
  | string;

export type CategoryCopy = {
  catalogueLabel: string;
  catalogueHint: string;
  itemTypeOptions: Array<{ value: string; label: string }>;
  defaultItemType: string;
  scopePrompt: string;
  examplePromise: string;
  exampleInclusions: string[];
  exampleDeliverables: string[];
  exampleAddOns: string[];
  exampleEventFit: string[];
  exampleItemNames: string[];
  groupHeadings: Record<string, string>;
  showDietary: boolean;
  itemNamePrompt: string;
};

const FALLBACK_COPY: CategoryCopy = {
  catalogueLabel: "Offerings",
  catalogueHint: "Add the rows that make up this package.",
  itemTypeOptions: [
    { value: "inclusion", label: "Inclusion" },
    { value: "deliverable", label: "Deliverable" },
    { value: "addon", label: "Add-on" },
  ],
  defaultItemType: "inclusion",
  scopePrompt:
    "What does this package actually cover from start to finish? Mention scope, hours, deliverables.",
  examplePromise:
    "Full execution support with pre-event planning, on-site coordination, and final handover.",
  exampleInclusions: [
    "Consultation call",
    "Detailed scope sheet",
    "On-ground execution",
    "Final handover",
  ],
  exampleDeliverables: ["Proposal", "Quote breakdown", "Execution checklist"],
  exampleAddOns: ["Custom add-on", "Extended hours"],
  exampleEventFit: ["Welcome", "Main event", "Reception"],
  exampleItemNames: ["Discovery call", "Scope sheet", "Execution day"],
  groupHeadings: {
    inclusion: "Inclusions",
    deliverable: "Deliverables",
    addon: "Add-ons",
    menu: "Menu",
    setup: "Setups",
    performance: "Performance",
    look: "Looks",
  },
  showDietary: false,
  itemNamePrompt: "Offering name",
};

const CATEGORY_COPY: Record<string, CategoryCopy> = {
  catering: {
    catalogueLabel: "Menu and counters",
    catalogueHint:
      "Add menu sections, live counters, beverage stations, and dessert offerings.",
    itemTypeOptions: [
      { value: "menu", label: "Menu section" },
      { value: "addon", label: "Counter or station" },
      { value: "inclusion", label: "Service inclusion" },
    ],
    defaultItemType: "menu",
    scopePrompt:
      "What is the meal flow, service style, and culinary direction for this package?",
    examplePromise:
      "Multi-cuisine plated and buffet flow with live counters, dietary handling, and full service staffing.",
    exampleInclusions: [
      "Cuisine planning",
      "Veg, non-veg, Jain handling",
      "Live counter setup",
      "Service staff",
    ],
    exampleDeliverables: [
      "Menu proposal",
      "Tasting notes",
      "Per-person quote",
      "Service checklist",
    ],
    exampleAddOns: [
      "Late-night snack counter",
      "Mocktail bar",
      "Regional dessert station",
    ],
    exampleEventFit: [
      "Welcome dinner",
      "Haldi brunch",
      "Sangeet dinner",
      "Wedding feast",
      "Reception",
    ],
    exampleItemNames: [
      "Welcome beverage station",
      "Live chaat counter",
      "Main course spread",
      "Dessert bar",
    ],
    groupHeadings: {
      menu: "Menu sections",
      addon: "Live counters and stations",
      inclusion: "Service inclusions",
      deliverable: "Deliverables",
    },
    showDietary: true,
    itemNamePrompt: "Menu item or counter name",
  },
  decor: {
    catalogueLabel: "Setups and areas",
    catalogueHint:
      "Add entry moments, stage or mandap focal pieces, table styling, lighting, and installations.",
    itemTypeOptions: [
      { value: "setup", label: "Setup area" },
      { value: "deliverable", label: "Deliverable" },
      { value: "addon", label: "Upgrade or installation" },
    ],
    defaultItemType: "setup",
    scopePrompt:
      "How does the visual story translate across entry, stage, tables, and lighting?",
    examplePromise:
      "Theme translation across entry, mandap, stage, tables, and lighting with floral and prop styling.",
    exampleInclusions: [
      "Concept direction",
      "Stage and mandap setup",
      "Floral styling",
      "Setup and strike",
    ],
    exampleDeliverables: [
      "Moodboard",
      "Area-wise scope sheet",
      "Setup references",
      "Production timeline",
    ],
    exampleAddOns: [
      "Custom signage",
      "Statement installation",
      "Candle upgrade",
    ],
    exampleEventFit: ["Mehendi", "Haldi", "Sangeet", "Wedding", "Reception"],
    exampleItemNames: [
      "Entry moment",
      "Mandap or stage focal",
      "Guest table styling",
      "Lighting atmosphere",
    ],
    groupHeadings: {
      setup: "Setup areas",
      deliverable: "Deliverables",
      addon: "Upgrades and installations",
      inclusion: "Inclusions",
    },
    showDietary: false,
    itemNamePrompt: "Setup area or feature",
  },
  photography: {
    catalogueLabel: "Coverage and deliverables",
    catalogueHint:
      "Add what is shot, who covers it, and what gets delivered — photo, film, reel, drone.",
    itemTypeOptions: [
      { value: "deliverable", label: "Coverage or deliverable" },
      { value: "inclusion", label: "Team or inclusion" },
      { value: "addon", label: "Add-on" },
    ],
    defaultItemType: "deliverable",
    scopePrompt:
      "What does coverage look like — team size, hours, story direction, and turnaround?",
    examplePromise:
      "Lead photographer with supporting team, candid and traditional coverage, edited gallery, and film options.",
    exampleInclusions: [
      "Lead photographer",
      "Second shooter",
      "Candid and traditional coverage",
      "Detail and decor coverage",
    ],
    exampleDeliverables: [
      "Edited gallery",
      "Highlight film",
      "Album draft",
      "Delivery timeline",
    ],
    exampleAddOns: ["Drone", "Same-day edit", "Reels package", "Premium album"],
    exampleEventFit: [
      "Pre-wedding",
      "Mehendi",
      "Sangeet",
      "Wedding",
      "Reception",
    ],
    exampleItemNames: [
      "Candid event coverage",
      "Portrait and detail set",
      "Edited gallery",
      "Highlight film",
    ],
    groupHeadings: {
      deliverable: "Coverage and deliverables",
      inclusion: "Team and inclusions",
      addon: "Add-ons",
    },
    showDietary: false,
    itemNamePrompt: "Coverage or deliverable",
  },
  entertainment: {
    catalogueLabel: "Sets and tech",
    catalogueHint:
      "Add performance sets, soundcheck, tech rider, and after-party options.",
    itemTypeOptions: [
      { value: "performance", label: "Performance set" },
      { value: "inclusion", label: "Tech or rider" },
      { value: "addon", label: "Add-on" },
    ],
    defaultItemType: "performance",
    scopePrompt:
      "What is the set format, runtime, and technical setup for the night?",
    examplePromise:
      "Headline artist set with sound, lights, soundcheck, emcee cues, and run-sheet coordination.",
    exampleInclusions: [
      "Performance set",
      "Sound coordination",
      "Technical rider",
      "Soundcheck",
    ],
    exampleDeliverables: [
      "Run sheet",
      "Playlist direction",
      "Technical checklist",
      "Stage timing",
    ],
    exampleAddOns: [
      "Additional artist",
      "LED wall",
      "After-party extension",
    ],
    exampleEventFit: [
      "Welcome night",
      "Cocktail",
      "Sangeet",
      "After-party",
      "Reception",
    ],
    exampleItemNames: [
      "Performance set",
      "Soundcheck and rider",
      "Emcee cue flow",
      "After-party extension",
    ],
    groupHeadings: {
      performance: "Performance sets",
      inclusion: "Technical rider",
      addon: "Add-ons",
    },
    showDietary: false,
    itemNamePrompt: "Set, rider, or add-on",
  },
  makeup: {
    catalogueLabel: "Looks and coverage",
    catalogueHint:
      "Add bridal looks, second changes, family coverage, and touch-up windows.",
    itemTypeOptions: [
      { value: "look", label: "Look" },
      { value: "inclusion", label: "Inclusion" },
      { value: "addon", label: "Add-on" },
    ],
    defaultItemType: "look",
    scopePrompt:
      "What looks are included, who is covered, and how is touch-up handled across the day?",
    examplePromise:
      "Bridal look planning with hair, makeup, draping, family coverage, and touch-up support across events.",
    exampleInclusions: [
      "Look consultation",
      "Hair and makeup",
      "Draping support",
      "Touch-up planning",
    ],
    exampleDeliverables: [
      "Look references",
      "Day-wise schedule",
      "Product notes",
      "Family allocation",
    ],
    exampleAddOns: [
      "Extra family looks",
      "Second change",
      "Extended touch-up",
    ],
    exampleEventFit: ["Mehendi", "Haldi", "Wedding", "Reception", "After-party"],
    exampleItemNames: [
      "Primary bridal look",
      "Second change",
      "Family styling block",
      "Touch-up window",
    ],
    groupHeadings: {
      look: "Looks and changes",
      inclusion: "Inclusions",
      addon: "Add-ons",
    },
    showDietary: false,
    itemNamePrompt: "Look, change, or touch-up",
  },
};

export function categoryCopy(slug?: string | null): CategoryCopy {
  if (!slug) return FALLBACK_COPY;
  return CATEGORY_COPY[slug.toLowerCase()] ?? FALLBACK_COPY;
}
