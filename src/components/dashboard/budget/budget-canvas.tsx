"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useBudgetStore,
  type BudgetCategory,
  type BudgetItem,
} from "@/stores/budget-store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BudgetCanvas() {
  const categories = useBudgetStore((s) => s.categories);
  const activeCategoryId = useBudgetStore((s) => s.activeCategoryId);
  const setActiveCategoryId = useBudgetStore((s) => s.setActiveCategoryId);
  const reorderItems = useBudgetStore((s) => s.reorderItems);
  const moveItem = useBudgetStore((s) => s.moveItem);

  const [draggedItem, setDraggedItem] = useState<BudgetItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    for (const cat of categories) {
      const item = cat.items.find((i) => i.id === active.id);
      if (item) {
        setDraggedItem(item);
        break;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    // Find source category
    let sourceCatId: string | null = null;
    let sourceIndex = -1;
    for (const cat of categories) {
      const idx = cat.items.findIndex((i) => i.id === active.id);
      if (idx !== -1) {
        sourceCatId = cat.id;
        sourceIndex = idx;
        break;
      }
    }

    if (!sourceCatId) return;

    // Find target — could be another item or a category zone
    let targetCatId: string | null = null;
    let targetIndex = -1;

    for (const cat of categories) {
      const idx = cat.items.findIndex((i) => i.id === over.id);
      if (idx !== -1) {
        targetCatId = cat.id;
        targetIndex = idx;
        break;
      }
    }

    // If dropped on a category zone
    if (!targetCatId) {
      const cat = categories.find((c) => c.id === over.id);
      if (cat) {
        targetCatId = cat.id;
        targetIndex = cat.items.length;
      }
    }

    if (!targetCatId) return;

    if (sourceCatId === targetCatId) {
      reorderItems(sourceCatId, sourceIndex, targetIndex);
    } else {
      moveItem(sourceCatId, targetCatId, active.id as string);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          Budget Categories
        </p>

        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={activeCategoryId === category.id}
            onToggle={() =>
              setActiveCategoryId(
                activeCategoryId === category.id ? null : category.id
              )
            }
          />
        ))}
      </div>

      <DragOverlay>
        {draggedItem ? <DragOverlayItem item={draggedItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Category Section ─────────────────────────────────────────

function CategorySection({
  category,
  isExpanded,
  onToggle,
}: {
  category: BudgetCategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const removeItem = useBudgetStore((s) => s.removeItem);
  const updateItem = useBudgetStore((s) => s.updateItem);

  const categoryTotal = category.items.reduce(
    (sum, item) => sum + item.estimatedCost * item.quantity,
    0
  );

  return (
    <div className="border border-charcoal/8 bg-ivory">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-cream/50"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="font-accent text-[11px] uppercase tracking-[0.15em] text-charcoal">
            {category.name}
          </span>
          <span className="font-accent text-[10px] text-slate">
            {category.items.length} {category.items.length === 1 ? "item" : "items"}
          </span>
        </div>
        <span className="font-display text-sm font-semibold text-charcoal tabular-nums">
          {formatCurrency(categoryTotal)}
        </span>
      </button>

      {/* Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-charcoal/5 px-4 py-2">
              <SortableContext
                items={category.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {category.items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate/50">
                    Add items from the palette on the left
                  </p>
                ) : (
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <SortableBudgetItem
                        key={item.id}
                        item={item}
                        categoryId={category.id}
                        onUpdate={(updates) =>
                          updateItem(category.id, item.id, updates)
                        }
                        onRemove={() => removeItem(category.id, item.id)}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sortable Budget Item ─────────────────────────────────────

function SortableBudgetItem({
  item,
  categoryId,
  onUpdate,
  onRemove,
}: {
  item: BudgetItem;
  categoryId: string;
  onUpdate: (updates: Partial<BudgetItem>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 border-b border-charcoal/5 py-2.5 last:border-0"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none px-1 text-charcoal/20 hover:text-charcoal/50 active:cursor-grabbing"
      >
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="6" cy="2" r="1.5" />
          <circle cx="2" cy="7" r="1.5" />
          <circle cx="6" cy="7" r="1.5" />
          <circle cx="2" cy="12" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Paid checkbox */}
      <button
        onClick={() => onUpdate({ isPaid: !item.isPaid })}
        className={cn(
          "h-4 w-4 flex-shrink-0 border transition-colors",
          item.isPaid
            ? "border-gold-primary bg-gold-primary"
            : "border-charcoal/20 hover:border-gold-primary"
        )}
      >
        {item.isPaid && (
          <svg viewBox="0 0 16 16" fill="none" className="text-ivory">
            <path
              d="M4 8l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        )}
      </button>

      {/* Item name */}
      <span
        className={cn(
          "flex-1 text-xs",
          item.isPaid ? "text-slate line-through" : "text-charcoal"
        )}
      >
        {item.name}
      </span>

      {/* Quantity */}
      {item.quantity > 1 && (
        <span className="font-accent text-[10px] text-slate">
          x{item.quantity}
        </span>
      )}

      {/* Cost */}
      {isEditing ? (
        <input
          type="number"
          defaultValue={item.estimatedCost}
          onBlur={(e) => {
            onUpdate({ estimatedCost: Number(e.target.value) || 0 });
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUpdate({
                estimatedCost: Number((e.target as HTMLInputElement).value) || 0,
              });
              setIsEditing(false);
            }
          }}
          autoFocus
          className="w-24 border-b border-gold-primary bg-transparent px-1 py-0.5 text-right font-accent text-[11px] text-charcoal focus:outline-none tabular-nums"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="font-accent text-[11px] text-charcoal tabular-nums hover:text-gold-primary transition-colors"
        >
          {formatCurrency(item.estimatedCost * item.quantity)}
        </button>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="px-1 text-charcoal/0 transition-colors group-hover:text-charcoal/30 hover:!text-red-500"
        aria-label="Remove item"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M1 1l8 8M9 1l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Drag Overlay ─────────────────────────────────────────────

function DragOverlayItem({ item }: { item: BudgetItem }) {
  return (
    <div className="flex items-center gap-3 border border-gold-primary/30 bg-ivory px-4 py-2.5 shadow-lg">
      <span className="text-xs text-charcoal">{item.name}</span>
      <span className="ml-auto font-accent text-[11px] text-charcoal tabular-nums">
        {formatCurrency(item.estimatedCost)}
      </span>
    </div>
  );
}
