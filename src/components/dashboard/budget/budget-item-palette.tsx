"use client";

import { useState } from "react";
import { useBudgetStore } from "@/stores/budget-store";
import { cn } from "@/lib/utils";

const PALETTE_ITEMS = [
  {
    category: "Venue & Hospitality",
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
    category: "Decor & Design",
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
    category: "Catering",
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
    category: "Photography & Video",
    items: [
      { name: "Wedding Photography", estimatedCost: 200000 },
      { name: "Wedding Videography", estimatedCost: 150000 },
      { name: "Pre-Wedding Shoot", estimatedCost: 80000 },
      { name: "Drone Coverage", estimatedCost: 50000 },
      { name: "Photo Album", estimatedCost: 25000 },
    ],
  },
  {
    category: "Makeup & Styling",
    items: [
      { name: "Bridal Makeup", estimatedCost: 80000 },
      { name: "Groom Styling", estimatedCost: 30000 },
      { name: "Family Makeup", estimatedCost: 50000 },
      { name: "Hair Styling", estimatedCost: 20000 },
    ],
  },
  {
    category: "Entertainment",
    items: [
      { name: "DJ / Sound System", estimatedCost: 80000 },
      { name: "Live Band", estimatedCost: 150000 },
      { name: "Choreographer", estimatedCost: 60000 },
      { name: "Anchor / MC", estimatedCost: 40000 },
      { name: "Fireworks", estimatedCost: 50000 },
    ],
  },
  {
    category: "Travel & Logistics",
    items: [
      { name: "Guest Transport", estimatedCost: 100000 },
      { name: "Couple Travel", estimatedCost: 50000 },
      { name: "Airport Transfers", estimatedCost: 30000 },
      { name: "Event Coordination", estimatedCost: 100000 },
    ],
  },
  {
    category: "Miscellaneous",
    items: [
      { name: "Wedding Invitations", estimatedCost: 40000 },
      { name: "Favors & Gifts", estimatedCost: 50000 },
      { name: "Mehndi Artist", estimatedCost: 30000 },
      { name: "Pandit / Officiant", estimatedCost: 25000 },
      { name: "Insurance", estimatedCost: 20000 },
    ],
  },
];

export function BudgetItemPalette() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const categories = useBudgetStore((s) => s.categories);
  const addItem = useBudgetStore((s) => s.addItem);

  const handleAddItem = (
    paletteCategory: string,
    item: { name: string; estimatedCost: number }
  ) => {
    // Find matching budget category
    const targetCategory = categories.find((c) =>
      c.name.toLowerCase() === paletteCategory.toLowerCase()
    );
    if (!targetCategory) return;

    addItem(targetCategory.id, {
      name: item.name,
      estimatedCost: item.estimatedCost,
      actualCost: null,
      quantity: 1,
      isPaid: false,
      notes: "",
    });
  };

  const filteredPalette = searchQuery
    ? PALETTE_ITEMS.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((group) => group.items.length > 0)
    : PALETTE_ITEMS;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate mb-3">
          Add Items
        </p>
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border-b border-charcoal/15 bg-transparent px-0 py-2 text-sm text-charcoal placeholder:text-slate/50 focus:border-gold-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="scrollbar-elysian max-h-[calc(100vh-300px)] space-y-1 overflow-y-auto">
        {filteredPalette.map((group) => (
          <div key={group.category}>
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === group.category ? null : group.category
                )
              }
              className={cn(
                "flex w-full items-center justify-between py-2.5 font-accent text-[11px] uppercase tracking-[0.15em] transition-colors",
                expandedCategory === group.category
                  ? "text-gold-primary"
                  : "text-charcoal hover:text-gold-primary"
              )}
            >
              <span>{group.category}</span>
              <span className="text-[10px] text-slate">
                {group.items.length}
              </span>
            </button>

            {expandedCategory === group.category && (
              <div className="space-y-1 pb-3">
                {group.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddItem(group.category, item)}
                    className="group flex w-full items-center justify-between border border-charcoal/8 px-3 py-2.5 text-left transition-all hover:border-gold-primary/30 hover:bg-gold-primary/5"
                  >
                    <span className="text-xs text-charcoal group-hover:text-gold-dark">
                      {item.name}
                    </span>
                    <span className="font-accent text-[10px] text-slate tabular-nums">
                      ₹{(item.estimatedCost / 1000).toFixed(0)}K
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
