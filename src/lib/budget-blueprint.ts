export type BudgetBlueprintItem = {
  name: string;
  estimatedCost: number;
};

export type BudgetBlueprintCategory = {
  name: string;
  color: string;
  recommendedShare: number;
  items: BudgetBlueprintItem[];
};

export const BUDGET_ITEM_DRAG_MIME = "application/x-elysian-budget-item";

export const BUDGET_CATEGORY_BLUEPRINTS: BudgetBlueprintCategory[] = [
  {
    name: "Venue & Hospitality",
    color: "#C9A96E",
    recommendedShare: 0.28,
    items: [
      { name: "Wedding Venue", estimatedCost: 500000 },
      { name: "Mehendi Venue", estimatedCost: 150000 },
      { name: "Sangeet Venue", estimatedCost: 200000 },
      { name: "Reception Venue", estimatedCost: 300000 },
      { name: "Hotel Rooms (Guests)", estimatedCost: 400000 },
      { name: "Suite (Couple)", estimatedCost: 50000 },
    ],
  },
  {
    name: "Decor & Design",
    color: "#D4A0A0",
    recommendedShare: 0.18,
    items: [
      { name: "Mandap Decoration", estimatedCost: 200000 },
      { name: "Stage Setup", estimatedCost: 150000 },
      { name: "Floral Arrangements", estimatedCost: 100000 },
      { name: "Lighting Design", estimatedCost: 80000 },
      { name: "Entry Gate", estimatedCost: 50000 },
      { name: "Table Centerpieces", estimatedCost: 40000 },
    ],
  },
  {
    name: "Catering",
    color: "#9CAF88",
    recommendedShare: 0.18,
    items: [
      { name: "Wedding Dinner", estimatedCost: 300000 },
      { name: "Cocktail Party", estimatedCost: 150000 },
      { name: "Mehendi Food", estimatedCost: 100000 },
      { name: "Welcome Dinner", estimatedCost: 120000 },
      { name: "Beverages & Bar", estimatedCost: 80000 },
      { name: "Wedding Cake", estimatedCost: 30000 },
    ],
  },
  {
    name: "Photography & Video",
    color: "#7BA7C9",
    recommendedShare: 0.12,
    items: [
      { name: "Wedding Photography", estimatedCost: 200000 },
      { name: "Wedding Videography", estimatedCost: 150000 },
      { name: "Pre-Wedding Shoot", estimatedCost: 80000 },
      { name: "Drone Coverage", estimatedCost: 50000 },
      { name: "Photo Album", estimatedCost: 25000 },
    ],
  },
  {
    name: "Makeup & Styling",
    color: "#C4956A",
    recommendedShare: 0.07,
    items: [
      { name: "Bridal Makeup", estimatedCost: 80000 },
      { name: "Groom Styling", estimatedCost: 30000 },
      { name: "Family Makeup", estimatedCost: 50000 },
      { name: "Hair Styling", estimatedCost: 20000 },
    ],
  },
  {
    name: "Entertainment",
    color: "#D4A843",
    recommendedShare: 0.07,
    items: [
      { name: "DJ / Sound System", estimatedCost: 80000 },
      { name: "Live Band", estimatedCost: 150000 },
      { name: "Choreographer", estimatedCost: 60000 },
      { name: "Anchor / MC", estimatedCost: 40000 },
      { name: "Fireworks", estimatedCost: 50000 },
    ],
  },
  {
    name: "Travel & Logistics",
    color: "#8B7EC8",
    recommendedShare: 0.06,
    items: [
      { name: "Guest Transport", estimatedCost: 100000 },
      { name: "Couple Travel", estimatedCost: 50000 },
      { name: "Airport Transfers", estimatedCost: 30000 },
      { name: "Event Coordination", estimatedCost: 100000 },
    ],
  },
  {
    name: "Miscellaneous",
    color: "#6B7280",
    recommendedShare: 0.04,
    items: [
      { name: "Wedding Invitations", estimatedCost: 40000 },
      { name: "Favors & Gifts", estimatedCost: 50000 },
      { name: "Mehndi Artist", estimatedCost: 30000 },
      { name: "Pandit / Officiant", estimatedCost: 25000 },
      { name: "Insurance", estimatedCost: 20000 },
    ],
  },
];

export function budgetColorForCategory(name: string) {
  return (
    BUDGET_CATEGORY_BLUEPRINTS.find(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    )?.color ?? "#6B7280"
  );
}

export function recommendedAllocation(name: string, totalBudget: number) {
  const share =
    BUDGET_CATEGORY_BLUEPRINTS.find(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    )?.recommendedShare ?? 0;

  return Math.round(totalBudget * share);
}
