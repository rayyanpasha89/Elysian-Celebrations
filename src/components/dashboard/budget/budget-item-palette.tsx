"use client";

import { useMemo, useState } from "react";
import {
  BUDGET_CATEGORY_BLUEPRINTS,
  BUDGET_ITEM_DRAG_MIME,
} from "@/lib/budget-blueprint";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useBudgetStore } from "@/stores/budget-store";
import { cn } from "@/lib/utils";

export function BudgetItemPalette() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    BUDGET_CATEGORY_BLUEPRINTS[0]?.name ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const categories = useBudgetStore((state) => state.categories);
  const addItem = useBudgetStore((state) => state.addItem);

  const filteredPalette = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return BUDGET_CATEGORY_BLUEPRINTS;

    return BUDGET_CATEGORY_BLUEPRINTS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.name.toLowerCase().includes(query)
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const handleAddItem = (
    groupName: string,
    item: { name: string; estimatedCost: number }
  ) => {
    const targetCategory = categories.find(
      (category) => category.name.toLowerCase() === groupName.toLowerCase()
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

  return (
    <div className="space-y-4">
      <div className="border border-charcoal/8 bg-cream/60 p-4">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Budget Builder
        </p>
        <h3 className="mt-2 font-display text-xl text-charcoal">
          Add line items with intent
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate">
          Click to add instantly, or drag an item onto a category to shape your
          plan around the wedding you actually want.
        </p>
      </div>

      <div>
        <label
          htmlFor="budget-item-search"
          className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate"
        >
          Search palette
        </label>
        <input
          id="budget-item-search"
          type="text"
          placeholder="Venue, decor, transport..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="mt-3 w-full border-b border-charcoal/15 bg-transparent px-0 py-2 text-sm text-charcoal placeholder:text-slate/50 transition-colors focus:border-gold-primary focus:outline-none"
        />
      </div>

      <div className="scrollbar-elysian max-h-[calc(100vh-310px)] space-y-2 overflow-y-auto pr-1">
        {filteredPalette.map((group) => {
          const isOpen = expandedCategory === group.name;

          return (
            <div
              key={group.name}
              className="border border-charcoal/8 bg-ivory/90 backdrop-blur"
            >
              <button
                onClick={() => setExpandedCategory(isOpen ? null : group.name)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-cream/70"
              >
                <div className="min-w-0">
                  <p
                    className="font-accent text-[11px] uppercase tracking-[0.15em]"
                    style={{ color: group.color }}
                  >
                    {group.name}
                  </p>
                  <p className="mt-1 text-xs text-slate">
                    Target {Math.round(group.recommendedShare * 100)}% of plan
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-charcoal">
                    {group.items.length} items
                  </p>
                  <p className="mt-1 text-xs text-slate">
                    From {formatNumber(group.items[0]?.estimatedCost ?? 0)}
                  </p>
                </div>
              </button>

              {isOpen ? (
                <div className="space-y-2 border-t border-charcoal/6 px-3 py-3">
                  {group.items.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData(
                          BUDGET_ITEM_DRAG_MIME,
                          JSON.stringify(item)
                        );
                      }}
                      onClick={() => handleAddItem(group.name, item)}
                      className={cn(
                        "group flex w-full items-center justify-between gap-3 border border-charcoal/8 px-3 py-3 text-left transition-all duration-300",
                        "hover:-translate-y-0.5 hover:border-gold-primary/35 hover:bg-gold-primary/5"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-charcoal group-hover:text-gold-dark">
                          {item.name}
                        </p>
                        <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                          Drag to a category or click to add
                        </p>
                      </div>
                      <span className="shrink-0 font-accent text-[10px] uppercase tracking-[0.15em] text-charcoal">
                        {formatCurrency(item.estimatedCost)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
