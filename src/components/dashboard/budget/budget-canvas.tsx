"use client";

import { useMemo, useState, type DragEvent as NativeDragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BUDGET_ITEM_DRAG_MIME } from "@/lib/budget-blueprint";
import { cn, formatCurrency } from "@/lib/utils";
import {
  useBudgetStore,
  type BudgetCategory,
  type BudgetItem,
} from "@/stores/budget-store";

type PaletteBudgetItem = {
  name: string;
  estimatedCost: number;
};

export function BudgetCanvas() {
  const categories = useBudgetStore((state) => state.categories);
  const activeCategoryId = useBudgetStore((state) => state.activeCategoryId);
  const setActiveCategoryId = useBudgetStore((state) => state.setActiveCategoryId);
  const reorderItems = useBudgetStore((state) => state.reorderItems);
  const moveItem = useBudgetStore((state) => state.moveItem);
  const addItem = useBudgetStore((state) => state.addItem);

  const [draggedItem, setDraggedItem] = useState<BudgetItem | null>(null);
  const [nativeDropCategoryId, setNativeDropCategoryId] = useState<string | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    for (const category of categories) {
      const item = category.items.find((entry) => entry.id === active.id);
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

    let sourceCategoryId: string | null = null;
    let sourceIndex = -1;

    for (const category of categories) {
      const index = category.items.findIndex((item) => item.id === active.id);
      if (index !== -1) {
        sourceCategoryId = category.id;
        sourceIndex = index;
        break;
      }
    }

    if (!sourceCategoryId) return;

    let targetCategoryId: string | null = null;
    let targetIndex = -1;

    for (const category of categories) {
      const index = category.items.findIndex((item) => item.id === over.id);
      if (index !== -1) {
        targetCategoryId = category.id;
        targetIndex = index;
        break;
      }
    }

    if (!targetCategoryId) {
      const category = categories.find((entry) => entry.id === over.id);
      if (category) {
        targetCategoryId = category.id;
        targetIndex = category.items.length;
      }
    }

    if (!targetCategoryId) return;

    if (sourceCategoryId === targetCategoryId) {
      reorderItems(sourceCategoryId, sourceIndex, targetIndex);
      return;
    }

    moveItem(sourceCategoryId, targetCategoryId, String(active.id), targetIndex);
  }

  function handleNativeDragOver(categoryId: string, event: NativeDragEvent) {
    if (!event.dataTransfer.types.includes(BUDGET_ITEM_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setNativeDropCategoryId(categoryId);
  }

  function handleNativeDrop(categoryId: string, event: NativeDragEvent) {
    if (!event.dataTransfer.types.includes(BUDGET_ITEM_DRAG_MIME)) return;
    event.preventDefault();
    setNativeDropCategoryId(null);

    try {
      const payload = JSON.parse(
        event.dataTransfer.getData(BUDGET_ITEM_DRAG_MIME)
      ) as PaletteBudgetItem;

      if (!payload?.name) return;

      addItem(categoryId, {
        name: payload.name,
        estimatedCost: payload.estimatedCost ?? 0,
        actualCost: null,
        quantity: 1,
        isPaid: false,
        notes: "",
      });
      setActiveCategoryId(categoryId);
    } catch {
      // Ignore invalid drag payloads.
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
        <div className="border border-charcoal/8 bg-cream/40 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
            Planning Canvas
          </p>
          <h3 className="mt-2 font-display text-xl text-charcoal">
            Build the budget like a real wedding plan
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            Each category tracks target allocation, live quotes, actuals, and paid
            amounts so you can see pressure before it becomes a surprise.
          </p>
        </div>

        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={activeCategoryId === category.id}
            isNativeDropActive={nativeDropCategoryId === category.id}
            onToggle={() =>
              setActiveCategoryId(
                activeCategoryId === category.id ? null : category.id
              )
            }
            onNativeDragOver={(event) => handleNativeDragOver(category.id, event)}
            onNativeDrop={(event) => handleNativeDrop(category.id, event)}
            onNativeDragLeave={() =>
              setNativeDropCategoryId((current) =>
                current === category.id ? null : current
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

function CategorySection({
  category,
  isExpanded,
  isNativeDropActive,
  onToggle,
  onNativeDragOver,
  onNativeDrop,
  onNativeDragLeave,
}: {
  category: BudgetCategory;
  isExpanded: boolean;
  isNativeDropActive: boolean;
  onToggle: () => void;
  onNativeDragOver: (event: NativeDragEvent) => void;
  onNativeDrop: (event: NativeDragEvent) => void;
  onNativeDragLeave: () => void;
}) {
  const removeItem = useBudgetStore((state) => state.removeItem);
  const updateItem = useBudgetStore((state) => state.updateItem);
  const setCategoryAllocation = useBudgetStore(
    (state) => state.setCategoryAllocation
  );

  const metrics = useMemo(() => {
    const quoted = category.items.reduce(
      (sum, item) => sum + item.estimatedCost * item.quantity,
      0
    );
    const actual = category.items.reduce(
      (sum, item) => sum + (item.actualCost ?? 0) * item.quantity,
      0
    );
    const paid = category.items.reduce((sum, item) => {
      if (!item.isPaid) return sum;
      return sum + (item.actualCost ?? item.estimatedCost) * item.quantity;
    }, 0);

    return {
      quoted,
      actual,
      paid,
      variance: quoted - category.allocated,
    };
  }, [category]);

  return (
    <div
      onDragOver={onNativeDragOver}
      onDrop={onNativeDrop}
      onDragLeave={onNativeDragLeave}
      className={cn(
        "border bg-ivory transition-all duration-300",
        isNativeDropActive
          ? "border-gold-primary/60 shadow-[0_18px_50px_rgba(201,169,110,0.18)]"
          : "border-charcoal/8"
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full flex-col gap-4 px-4 py-4 text-left transition-colors hover:bg-cream/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_4px_rgba(201,169,110,0.12)]"
                style={{ backgroundColor: category.color }}
              />
              <span className="font-accent text-[11px] uppercase tracking-[0.15em] text-charcoal">
                {category.name}
              </span>
              <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                {category.items.length}{" "}
                {category.items.length === 1 ? "line item" : "line items"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate">
              Target {formatCurrency(category.allocated)} and watch the variance
              as quotes lock in.
            </p>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-2 text-right">
            <MetricLabel label="Target" value={formatCurrency(category.allocated)} />
            <MetricLabel label="Quoted" value={formatCurrency(metrics.quoted)} />
            <MetricLabel label="Actual" value={formatCurrency(metrics.actual)} />
            <MetricLabel
              label="Variance"
              value={formatCurrency(Math.abs(metrics.variance))}
              tone={
                metrics.variance > 0
                  ? "negative"
                  : metrics.variance < 0
                    ? "positive"
                    : "neutral"
              }
              prefix={metrics.variance > 0 ? "+" : metrics.variance < 0 ? "-" : ""}
            />
          </div>
        </div>

        {isNativeDropActive ? (
          <div className="border border-dashed border-gold-primary/60 bg-gold-primary/6 px-4 py-3">
            <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">
              Drop to add this item to {category.name}
            </p>
          </div>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-charcoal/6 px-4 py-4">
              <div className="grid gap-3 border border-charcoal/8 bg-cream/40 p-4 md:grid-cols-4">
                <InlineMetricInput
                  label="Target allocation"
                  defaultValue={category.allocated}
                  helper="Editable cap for this category"
                  onCommit={(value) => setCategoryAllocation(category.id, value)}
                />
                <InlineReadMetric
                  label="Quoted total"
                  value={formatCurrency(metrics.quoted)}
                  helper="Based on current estimates"
                />
                <InlineReadMetric
                  label="Actual total"
                  value={formatCurrency(metrics.actual)}
                  helper="Only confirmed spend"
                />
                <InlineReadMetric
                  label="Paid so far"
                  value={formatCurrency(metrics.paid)}
                  helper="Marked paid on line items"
                />
              </div>

              <div className="mt-4">
                <SortableContext
                  items={category.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {category.items.length === 0 ? (
                    <div className="border border-dashed border-charcoal/12 px-4 py-10 text-center">
                      <p className="font-display text-lg text-charcoal">
                        Start with the palette
                      </p>
                      <p className="mt-2 text-sm text-slate">
                        Drag an item in, or click one from the left rail to seed this
                        category.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <SortableBudgetItem
                          key={item.id}
                          item={item}
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SortableBudgetItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: BudgetItem;
  onUpdate: (updates: Partial<BudgetItem>) => void;
  onRemove: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    opacity: isDragging ? 0.45 : 1,
  };

  const quotedTotal = item.estimatedCost * item.quantity;
  const actualTotal =
    item.actualCost == null ? null : item.actualCost * item.quantity;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-charcoal/8 bg-ivory p-4 shadow-[0_12px_36px_rgba(26,26,46,0.04)]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none px-1 text-charcoal/25 transition-colors hover:text-charcoal/55 active:cursor-grabbing"
          aria-label={`Reorder ${item.name}`}
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

        <button
          onClick={() => onUpdate({ isPaid: !item.isPaid })}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
            item.isPaid
              ? "border-gold-primary bg-gold-primary text-midnight"
              : "border-charcoal/20 text-transparent hover:border-gold-primary"
          )}
          aria-label={item.isPaid ? "Mark unpaid" : "Mark paid"}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path
              d="M4 8l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              "truncate text-sm",
              item.isPaid ? "text-slate line-through" : "text-charcoal"
            )}
          >
            {item.name}
          </p>
          <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
            Quote {formatCurrency(quotedTotal)}
            {actualTotal != null ? ` • Actual ${formatCurrency(actualTotal)}` : ""}
            {item.quantity > 1 ? ` • Qty ${item.quantity}` : ""}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate transition-colors hover:text-gold-dark"
        >
          {isExpanded ? "Collapse" : "Edit"}
        </button>

        <button
          onClick={onRemove}
          className="font-accent text-[10px] uppercase tracking-[0.15em] text-charcoal/50 transition-colors hover:text-error"
        >
          Remove
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-4 border-t border-charcoal/6 pt-4 md:grid-cols-3">
              <InlineMetricInput
                label="Quoted price"
                defaultValue={item.estimatedCost}
                helper="Expected cost per unit"
                onCommit={(value) => onUpdate({ estimatedCost: value })}
              />
              <InlineOptionalMetricInput
                label="Actual spend"
                defaultValue={item.actualCost}
                helper="Leave blank until final"
                onCommit={(value) => onUpdate({ actualCost: value })}
              />
              <InlineMetricInput
                label="Quantity"
                defaultValue={item.quantity}
                helper="Units or headcount blocks"
                min={1}
                onCommit={(value) => onUpdate({ quantity: Math.max(1, value) })}
              />
              <div className="md:col-span-3">
                <label className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                  Notes
                </label>
                <textarea
                  defaultValue={item.notes}
                  onBlur={(event) => onUpdate({ notes: event.target.value })}
                  placeholder="Vendor, negotiation notes, what is included..."
                  className="mt-2 min-h-[88px] w-full border border-charcoal/12 bg-transparent px-3 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DragOverlayItem({ item }: { item: BudgetItem }) {
  return (
    <div className="flex min-w-[220px] items-center gap-3 border border-gold-primary/40 bg-ivory px-4 py-3 shadow-[0_18px_50px_rgba(201,169,110,0.2)]">
      <div className="h-2.5 w-2.5 rounded-full bg-gold-primary" />
      <span className="text-sm text-charcoal">{item.name}</span>
      <span className="ml-auto font-accent text-[10px] uppercase tracking-[0.15em] text-charcoal">
        {formatCurrency(item.estimatedCost)}
      </span>
    </div>
  );
}

function MetricLabel({
  label,
  value,
  tone = "neutral",
  prefix = "",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  prefix?: string;
}) {
  return (
    <div>
      <p className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-medium",
          tone === "negative" && "text-error",
          tone === "positive" && "text-sage",
          tone === "neutral" && "text-charcoal"
        )}
      >
        {prefix}
        {value}
      </p>
    </div>
  );
}

function InlineMetricInput({
  label,
  defaultValue,
  helper,
  min = 0,
  onCommit,
}: {
  label: string;
  defaultValue: number;
  helper: string;
  min?: number;
  onCommit: (value: number) => void;
}) {
  return (
    <div>
      <label className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </label>
      <input
        type="number"
        min={min}
        defaultValue={defaultValue}
        onBlur={(event) =>
          onCommit(Math.max(min, Number(event.target.value) || 0))
        }
        className="mt-2 w-full border-b border-charcoal/12 bg-transparent py-2 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
      />
      <p className="mt-1 text-xs text-slate">{helper}</p>
    </div>
  );
}

function InlineOptionalMetricInput({
  label,
  defaultValue,
  helper,
  onCommit,
}: {
  label: string;
  defaultValue: number | null;
  helper: string;
  onCommit: (value: number | null) => void;
}) {
  return (
    <div>
      <label className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </label>
      <input
        type="number"
        min={0}
        defaultValue={defaultValue ?? ""}
        placeholder="Add final spend"
        onBlur={(event) => {
          const value = event.target.value.trim();
          onCommit(value ? Math.max(0, Number(value) || 0) : null);
        }}
        className="mt-2 w-full border-b border-charcoal/12 bg-transparent py-2 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
      />
      <p className="mt-1 text-xs text-slate">{helper}</p>
    </div>
  );
}

function InlineReadMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div>
      <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-slate">{helper}</p>
    </div>
  );
}
