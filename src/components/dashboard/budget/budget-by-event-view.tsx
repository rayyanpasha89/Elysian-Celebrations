"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import {
  useBudgetStore,
  type BudgetCategory,
  type BudgetItem,
} from "@/stores/budget-store";

export type BudgetEventBucket = {
  id: string;
  name: string;
  dayName: string;
  date: string | null;
  eventType: string | null;
  startTime: string | null;
  estimatedSpend: number;
};

type ItemWithCategory = BudgetItem & {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
};

type Totals = {
  quoted: number;
  actual: number;
  paid: number;
  due: number;
};

function lineQuote(item: BudgetItem) {
  return item.estimatedCost * item.quantity;
}

function lineActual(item: BudgetItem) {
  return item.actualCost == null ? null : item.actualCost * item.quantity;
}

function totalsFor(items: BudgetItem[]): Totals {
  let quoted = 0;
  let actual = 0;
  let paid = 0;
  for (const item of items) {
    const q = lineQuote(item);
    const a = lineActual(item) ?? 0;
    quoted += q;
    actual += a;
    if (item.isPaid) {
      paid += lineActual(item) ?? q;
    }
  }
  const committed = Math.max(quoted, actual);
  return {
    quoted,
    actual,
    paid,
    due: Math.max(0, committed - paid),
  };
}

export function BudgetByEventView({
  events,
  weddingName,
}: {
  events: BudgetEventBucket[];
  weddingName: string | null;
}) {
  const categories = useBudgetStore((state) => state.categories);
  const updateItem = useBudgetStore((state) => state.updateItem);
  const removeItem = useBudgetStore((state) => state.removeItem);

  const allItems = useMemo<ItemWithCategory[]>(
    () =>
      categories.flatMap((category: BudgetCategory) =>
        category.items.map((item) => ({
          ...item,
          categoryId: category.id,
          categoryName: category.name,
          categoryColor: category.color,
        }))
      ),
    [categories]
  );

  const itemsByEvent = useMemo(() => {
    const map = new Map<string, ItemWithCategory[]>();
    for (const item of allItems) {
      const key = item.eventId ?? "__unassigned__";
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [allItems]);

  const eventBuckets = useMemo<
    Array<{
      bucket: BudgetEventBucket | null;
      items: ItemWithCategory[];
    }>
  >(() => {
    const ordered: Array<{
      bucket: BudgetEventBucket | null;
      items: ItemWithCategory[];
    }> = events.map((event) => ({
      bucket: event,
      items: itemsByEvent.get(event.id) ?? [],
    }));
    const unassigned = itemsByEvent.get("__unassigned__") ?? [];
    if (unassigned.length > 0 || events.length === 0) {
      ordered.push({ bucket: null, items: unassigned });
    }
    return ordered;
  }, [events, itemsByEvent]);

  if (events.length === 0 && allItems.length === 0) {
    return (
      <div className="border border-charcoal/8 bg-ivory p-6">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          By celebration day
        </p>
        <h3 className="mt-2 font-display text-xl text-charcoal">
          No events to roll up yet
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
          Open the event planner to add days and events. Once they exist, every
          budget line you tag to an event will land here with its planned versus
          quoted total.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-charcoal/8 bg-cream/40 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
              By event view
            </p>
            <h3 className="mt-2 font-display text-xl text-charcoal">
              {weddingName ? `${weddingName} · ` : ""}One row per celebration
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              See every budget line by Haldi, Sangeet, ceremony, reception, or any
              custom event — and watch each event&apos;s planned spend against the
              quotes you have committed.
            </p>
          </div>
        </div>
      </div>

      {eventBuckets.map(({ bucket, items }) => (
        <EventBucketCard
          key={bucket?.id ?? "__unassigned__"}
          bucket={bucket}
          items={items}
          eventOptions={events}
          onAssignEvent={(item, nextEventId) =>
            updateItem(item.categoryId, item.id, { eventId: nextEventId })
          }
          onTogglePaid={(item) =>
            updateItem(item.categoryId, item.id, { isPaid: !item.isPaid })
          }
          onRemove={(item) => removeItem(item.categoryId, item.id)}
        />
      ))}
    </div>
  );
}

function EventBucketCard({
  bucket,
  items,
  eventOptions,
  onAssignEvent,
  onTogglePaid,
  onRemove,
}: {
  bucket: BudgetEventBucket | null;
  items: ItemWithCategory[];
  eventOptions: BudgetEventBucket[];
  onAssignEvent: (item: ItemWithCategory, nextEventId: string | null) => void;
  onTogglePaid: (item: ItemWithCategory) => void;
  onRemove: (item: ItemWithCategory) => void;
}) {
  const totals = useMemo(() => totalsFor(items), [items]);
  const planned = bucket?.estimatedSpend ?? 0;
  const committed = Math.max(totals.quoted, totals.actual);
  const variance = committed - planned;
  const headline = bucket
    ? bucket.name
    : "Unassigned line items";
  const subheadline = bucket
    ? [bucket.dayName, bucket.eventType ?? "", formatDate(bucket.date)]
        .filter(Boolean)
        .join(" · ")
    : "Tie these to an event so they roll into the plan above";

  return (
    <div className="border border-charcoal/8 bg-ivory">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/6 px-5 py-4">
        <div className="min-w-0">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
            {bucket ? "Celebration" : "Untagged"}
          </p>
          <h4 className="mt-1 font-display text-lg text-charcoal">{headline}</h4>
          {subheadline ? (
            <p className="mt-1 text-xs leading-relaxed text-slate">{subheadline}</p>
          ) : null}
        </div>

        <div className="grid min-w-[260px] grid-cols-2 gap-x-6 gap-y-2 text-right sm:grid-cols-4">
          {bucket ? (
            <Metric label="Planned" value={formatCurrency(planned)} />
          ) : null}
          <Metric label="Quoted" value={formatCurrency(totals.quoted)} />
          <Metric label="Paid" value={formatCurrency(totals.paid)} tone="positive" />
          <Metric
            label="Due"
            value={formatCurrency(totals.due)}
            tone={totals.due > 0 ? "warning" : "neutral"}
          />
          {bucket && (planned > 0 || items.length > 0) ? (
            <Metric
              label="Variance"
              value={`${variance >= 0 ? "+" : "-"}${formatCurrency(
                Math.abs(variance)
              )}`}
              tone={variance > 0 ? "negative" : variance < 0 ? "positive" : "neutral"}
            />
          ) : null}
        </div>
      </div>

      {bucket && planned > 0 ? <PlannedBar planned={planned} committed={committed} /> : null}

      {items.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate">
          {bucket
            ? "No budget lines tagged to this event yet. Switch to the category view to add or tag items."
            : "Everything is tagged — every budget line is rolled up into an event above."}
        </div>
      ) : (
        <ul className="list-none divide-y divide-charcoal/6 pl-0">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3">
              <BudgetItemRow
                item={item}
                eventOptions={eventOptions}
                onAssignEvent={(nextEventId) => onAssignEvent(item, nextEventId)}
                onTogglePaid={() => onTogglePaid(item)}
                onRemove={() => onRemove(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlannedBar({
  planned,
  committed,
}: {
  planned: number;
  committed: number;
}) {
  if (planned <= 0) return null;
  const ratio = Math.min(150, Math.round((committed / planned) * 100));
  const display = Math.min(100, ratio);
  const overflow = Math.max(0, ratio - 100);
  return (
    <div className="border-b border-charcoal/6 px-5 py-3">
      <div className="flex items-center justify-between text-xs text-slate">
        <span>{ratio}% of planned spend committed</span>
        <span>{formatCurrency(committed)} of {formatCurrency(planned)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
        <motion.div
          className={cn(
            "h-full rounded-full",
            ratio > 100 ? "bg-error" : ratio > 85 ? "bg-gold-primary" : "bg-sage"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${display}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {overflow > 0 ? (
        <p className="mt-2 font-accent text-[10px] uppercase tracking-[0.16em] text-error">
          +{overflow}% over plan
        </p>
      ) : null}
    </div>
  );
}

function BudgetItemRow({
  item,
  eventOptions,
  onAssignEvent,
  onTogglePaid,
  onRemove,
}: {
  item: ItemWithCategory;
  eventOptions: BudgetEventBucket[];
  onAssignEvent: (eventId: string | null) => void;
  onTogglePaid: () => void;
  onRemove: () => void;
}) {
  const quoted = lineQuote(item);
  const actual = lineActual(item);
  const status = lineStatus(item);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={onTogglePaid}
        aria-label={item.isPaid ? "Mark as unpaid" : "Mark as paid"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
          item.isPaid
            ? "border-gold-primary bg-gold-primary text-midnight"
            : "border-charcoal/20 text-transparent hover:border-gold-primary"
        )}
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

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.categoryColor }}
          />
          <p
            className={cn(
              "truncate text-sm",
              item.isPaid ? "text-slate line-through" : "text-charcoal"
            )}
          >
            {item.name}
          </p>
          <StatusPill status={status} />
        </div>
        <p className="mt-1 truncate font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
          {item.categoryName}
          {item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end text-right">
        <span className="font-heading text-sm text-charcoal">
          {formatCurrency(actual ?? quoted)}
        </span>
        {actual != null && actual !== quoted ? (
          <span className="font-accent text-[9px] uppercase tracking-[0.14em] text-slate">
            Quote {formatCurrency(quoted)}
          </span>
        ) : null}
      </div>

      <label className="flex shrink-0 items-center gap-2">
        <span className="sr-only">Reassign event</span>
        <select
          value={item.eventId ?? ""}
          onChange={(event) => onAssignEvent(event.target.value || null)}
          className="border border-charcoal/12 bg-ivory px-2 py-1.5 text-xs text-charcoal outline-none transition-colors focus:border-gold-primary"
        >
          <option value="">Unassigned</option>
          {eventOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.dayName} · {option.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onRemove}
        className="font-accent text-[10px] uppercase tracking-[0.15em] text-charcoal/50 transition-colors hover:text-error"
      >
        Remove
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: "paid" | "final" | "quoted" | "draft" }) {
  const map = {
    paid: { label: "Paid", tone: "border-sage/40 bg-sage/10 text-sage" },
    final: { label: "Final", tone: "border-gold-primary/40 bg-gold-primary/8 text-gold-dark" },
    quoted: { label: "Quoted", tone: "border-charcoal/15 bg-ivory text-charcoal/70" },
    draft: { label: "Draft", tone: "border-dashed border-charcoal/20 bg-ivory text-charcoal/50" },
  } as const;
  const entry = map[status];
  return (
    <span
      className={cn(
        "font-accent shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em]",
        entry.tone
      )}
    >
      {entry.label}
    </span>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
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
          tone === "warning" && "text-gold-dark",
          tone === "positive" && "text-sage",
          tone === "neutral" && "text-charcoal"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function lineStatus(item: BudgetItem): "paid" | "final" | "quoted" | "draft" {
  if (item.isPaid) return "paid";
  if (item.actualCost != null) return "final";
  if (item.estimatedCost > 0) return "quoted";
  return "draft";
}

function formatDate(raw: string | null) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
