export const EVENT_TYPE_OPTIONS = [
  "Welcome",
  "Mehendi",
  "Haldi",
  "Cocktail",
  "Sangeet",
  "Ceremony",
  "Reception",
  "Brunch",
  "After Party",
  "Custom",
] as const;

export const FOOD_STYLE_OPTIONS = [
  "Plated dinner",
  "Buffet spread",
  "Live stations",
  "Family style",
  "Canapes and cocktails",
  "Brunch service",
  "Mixed format",
] as const;

export const FOOD_PREFERENCE_OPTIONS = [
  "Vegetarian",
  "Non-vegetarian",
  "Jain",
  "Vegan",
  "No onion / garlic",
  "Kids menu",
  "Regional specialties",
] as const;

export const DECOR_STYLE_OPTIONS = [
  "Royal heritage",
  "Floral garden",
  "Modern minimal",
  "Beach tropical",
  "Candlelit intimacy",
  "Vibrant festive",
  "Bespoke editorial",
] as const;

export const PLANNER_VENDOR_CATEGORIES = [
  {
    key: "catering",
    slug: "catering",
    label: "Food and menu",
    hint: "Choose a catering partner and shortlist the menu format for this event.",
  },
  {
    key: "decor",
    slug: "decor",
    label: "Decor and floral",
    hint: "Lock the mood, stage styling, and room atmosphere with a decor partner.",
  },
  {
    key: "photography",
    slug: "photography",
    label: "Photo and film",
    hint: "Assign the storyteller covering this function so the visual arc feels intentional.",
  },
  {
    key: "entertainment",
    slug: "entertainment",
    label: "Entertainment",
    hint: "Plan the sound, performances, and energy for the room.",
  },
] as const;

export type PlannerVendorCategory = (typeof PLANNER_VENDOR_CATEGORIES)[number];
export type PlannerVendorCategoryKey = PlannerVendorCategory["key"];

export type DefaultCelebrationEvent = {
  name: string;
  eventType: string;
  startTime: string | null;
  foodStyle: string | null;
  decorStyle: string | null;
};

export type DefaultCelebrationDay = {
  name: string;
  offsetDays: number;
  events: DefaultCelebrationEvent[];
};

type DayTemplateMap = Record<number, DefaultCelebrationDay[]>;

const DAY_TEMPLATES: DayTemplateMap = {
  1: [
    {
      name: "Wedding Day",
      offsetDays: 0,
      events: [
        {
          name: "Ceremony",
          eventType: "Ceremony",
          startTime: "16:00",
          foodStyle: "Plated dinner",
          decorStyle: "Royal heritage",
        },
        {
          name: "Reception",
          eventType: "Reception",
          startTime: "20:00",
          foodStyle: "Buffet spread",
          decorStyle: "Candlelit intimacy",
        },
      ],
    },
  ],
  2: [
    {
      name: "Arrival and Welcome",
      offsetDays: -1,
      events: [
        {
          name: "Welcome Dinner",
          eventType: "Welcome",
          startTime: "19:00",
          foodStyle: "Canapes and cocktails",
          decorStyle: "Modern minimal",
        },
      ],
    },
    {
      name: "Wedding Day",
      offsetDays: 0,
      events: [
        {
          name: "Ceremony",
          eventType: "Ceremony",
          startTime: "16:00",
          foodStyle: "Plated dinner",
          decorStyle: "Royal heritage",
        },
        {
          name: "Reception",
          eventType: "Reception",
          startTime: "20:00",
          foodStyle: "Buffet spread",
          decorStyle: "Bespoke editorial",
        },
      ],
    },
  ],
  3: [
    {
      name: "Mehendi and Haldi",
      offsetDays: -2,
      events: [
        {
          name: "Mehendi Lunch",
          eventType: "Mehendi",
          startTime: "12:30",
          foodStyle: "Live stations",
          decorStyle: "Vibrant festive",
        },
        {
          name: "Haldi",
          eventType: "Haldi",
          startTime: "16:00",
          foodStyle: "Buffet spread",
          decorStyle: "Floral garden",
        },
      ],
    },
    {
      name: "Sangeet Night",
      offsetDays: -1,
      events: [
        {
          name: "Cocktail Hour",
          eventType: "Cocktail",
          startTime: "18:30",
          foodStyle: "Canapes and cocktails",
          decorStyle: "Modern minimal",
        },
        {
          name: "Sangeet",
          eventType: "Sangeet",
          startTime: "20:00",
          foodStyle: "Buffet spread",
          decorStyle: "Bespoke editorial",
        },
      ],
    },
    {
      name: "Wedding Day",
      offsetDays: 0,
      events: [
        {
          name: "Ceremony",
          eventType: "Ceremony",
          startTime: "16:00",
          foodStyle: "Plated dinner",
          decorStyle: "Royal heritage",
        },
        {
          name: "Reception",
          eventType: "Reception",
          startTime: "20:30",
          foodStyle: "Buffet spread",
          decorStyle: "Candlelit intimacy",
        },
      ],
    },
  ],
  4: [
    {
      name: "Arrival and Check-in",
      offsetDays: -3,
      events: [
        {
          name: "Welcome Dinner",
          eventType: "Welcome",
          startTime: "19:30",
          foodStyle: "Canapes and cocktails",
          decorStyle: "Modern minimal",
        },
      ],
    },
    {
      name: "Mehendi Afternoon",
      offsetDays: -2,
      events: [
        {
          name: "Mehendi",
          eventType: "Mehendi",
          startTime: "14:00",
          foodStyle: "Live stations",
          decorStyle: "Floral garden",
        },
      ],
    },
    {
      name: "Sangeet Evening",
      offsetDays: -1,
      events: [
        {
          name: "Cocktail Hour",
          eventType: "Cocktail",
          startTime: "18:30",
          foodStyle: "Canapes and cocktails",
          decorStyle: "Modern minimal",
        },
        {
          name: "Sangeet",
          eventType: "Sangeet",
          startTime: "20:00",
          foodStyle: "Buffet spread",
          decorStyle: "Vibrant festive",
        },
      ],
    },
    {
      name: "Wedding Day",
      offsetDays: 0,
      events: [
        {
          name: "Ceremony",
          eventType: "Ceremony",
          startTime: "16:00",
          foodStyle: "Plated dinner",
          decorStyle: "Royal heritage",
        },
        {
          name: "Reception",
          eventType: "Reception",
          startTime: "20:30",
          foodStyle: "Buffet spread",
          decorStyle: "Bespoke editorial",
        },
      ],
    },
  ],
  5: [
    {
      name: "Arrival and Welcome",
      offsetDays: -4,
      events: [
        {
          name: "Welcome Dinner",
          eventType: "Welcome",
          startTime: "19:30",
          foodStyle: "Canapes and cocktails",
          decorStyle: "Modern minimal",
        },
      ],
    },
    {
      name: "Mehendi",
      offsetDays: -3,
      events: [
        {
          name: "Mehendi Lunch",
          eventType: "Mehendi",
          startTime: "13:00",
          foodStyle: "Live stations",
          decorStyle: "Floral garden",
        },
      ],
    },
    {
      name: "Haldi and Family Lunch",
      offsetDays: -2,
      events: [
        {
          name: "Haldi",
          eventType: "Haldi",
          startTime: "11:30",
          foodStyle: "Buffet spread",
          decorStyle: "Vibrant festive",
        },
      ],
    },
    {
      name: "Sangeet Night",
      offsetDays: -1,
      events: [
        {
          name: "Cocktail Hour",
          eventType: "Cocktail",
          startTime: "18:30",
          foodStyle: "Canapes and cocktails",
          decorStyle: "Modern minimal",
        },
        {
          name: "Sangeet",
          eventType: "Sangeet",
          startTime: "20:00",
          foodStyle: "Buffet spread",
          decorStyle: "Bespoke editorial",
        },
      ],
    },
    {
      name: "Wedding Day",
      offsetDays: 0,
      events: [
        {
          name: "Ceremony",
          eventType: "Ceremony",
          startTime: "16:00",
          foodStyle: "Plated dinner",
          decorStyle: "Royal heritage",
        },
        {
          name: "Reception",
          eventType: "Reception",
          startTime: "20:30",
          foodStyle: "Buffet spread",
          decorStyle: "Candlelit intimacy",
        },
      ],
    },
  ],
};

function normaliseDayCount(raw: number) {
  if (!Number.isFinite(raw)) return 3;
  return Math.min(7, Math.max(1, Math.round(raw)));
}

function dateAtMiddayIso(rawDate: string | null | undefined, offsetDays: number) {
  if (!rawDate) return null;
  const base = new Date(rawDate);
  if (Number.isNaN(base.getTime())) return null;

  const shifted = new Date(base);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  shifted.setUTCHours(12, 0, 0, 0);
  return shifted.toISOString();
}

function genericDayTemplate(count: number): DefaultCelebrationDay[] {
  return Array.from({ length: count }, (_, index) => ({
    name: index === count - 1 ? "Wedding Day" : `Day ${index + 1}`,
    offsetDays: index - (count - 1),
    events: [
      {
        name: index === count - 1 ? "Ceremony" : `Event ${index + 1}`,
        eventType: index === count - 1 ? "Ceremony" : "Custom",
        startTime: index === count - 1 ? "16:00" : null,
        foodStyle: null,
        decorStyle: null,
      },
    ],
  }));
}

export function buildDefaultCelebrationPlan(
  requestedDayCount: number,
  weddingDate: string | null
) {
  const dayCount = normaliseDayCount(requestedDayCount);
  const template = DAY_TEMPLATES[dayCount] ?? genericDayTemplate(dayCount);

  return template.map((day, dayIndex) => ({
    ...day,
    sortOrder: dayIndex,
    date: dateAtMiddayIso(weddingDate, day.offsetDays),
    events: day.events.map((event, eventIndex) => ({
      ...event,
      sortOrder: eventIndex,
    })),
  }));
}
