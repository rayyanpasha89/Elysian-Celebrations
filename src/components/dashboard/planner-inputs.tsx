"use client";

/**
 * Planner input toolkit — low-typing, high-interactivity controls for the
 * Layer 2 event editor. The goal everywhere: the client taps chips, swatches,
 * and steppers instead of writing prose. Every control is controlled
 * (`value` + `onChange`) and still allows a custom entry where flexibility
 * matters, so nothing is ever a dead end.
 *
 * Built to be dropped straight into `client/wedding/page.tsx` in place of the
 * free-text <textarea>/<input> fields. See CODEX_HANDOFF.md for the
 * field-by-field mapping.
 */

import { useId, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlannerOption = {
  value: string;
  label: string;
  hint?: string;
};

const chipBase =
  "inline-flex items-center gap-1.5 border px-3 py-1.5 font-accent text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal";
const chipOn =
  "border-gold-primary bg-gold-primary/15 text-charcoal";
const chipOff =
  "border-charcoal/15 bg-ivory text-slate hover:border-gold-primary/45 hover:text-charcoal";

function normalizeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/* ------------------------------------------------------------------ *
 * ChipMultiSelect — pick any number from a fixed option set.
 * Use for: dietary needs, dress codes, signature counters, transport modes.
 * ------------------------------------------------------------------ */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  columns,
  className,
}: {
  options: PlannerOption[];
  value: string[];
  onChange: (next: string[]) => void;
  columns?: boolean;
  className?: string;
}) {
  const selected = normalizeArray(value);
  const toggle = (val: string) =>
    onChange(
      selected.includes(val)
        ? selected.filter((entry) => entry !== val)
        : [...selected, val]
    );

  return (
    <div
      className={cn(
        columns ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "flex flex-wrap gap-2",
        className
      )}
    >
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.hint}
            onClick={() => toggle(option.value)}
            className={cn(chipBase, active ? chipOn : chipOff, columns && "justify-center text-center")}
          >
            {active ? <Check className="h-3 w-3 shrink-0" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ChipSingleSelect — pick exactly one (radio as chips).
 * Use for: food service style, decor style, day part.
 * ------------------------------------------------------------------ */
export function ChipSingleSelect({
  options,
  value,
  onChange,
  allowClear = true,
  className,
}: {
  options: PlannerOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  allowClear?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.hint}
            onClick={() => onChange(active && allowClear ? null : option.value)}
            className={cn(chipBase, active ? chipOn : chipOff)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * PresetTagInput — suggestion-first tag editor. Clicking a suggestion adds
 * it; selected tags become removable pills; a custom value is optional and
 * tucked behind a "+ Add" affordance so typing is never the default path.
 * Use for: cuisines, menu highlights, palette words, ceremony cues.
 * ------------------------------------------------------------------ */
export function PresetTagInput({
  suggestions,
  value,
  onChange,
  placeholder = "Add your own",
  allowCustom = true,
  className,
}: {
  suggestions: PlannerOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}) {
  const selected = normalizeArray(value);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (!selected.some((entry) => entry.toLowerCase() === tag.toLowerCase())) {
      onChange([...selected, tag]);
    }
    setDraft("");
  };
  const remove = (tag: string) =>
    onChange(selected.filter((entry) => entry !== tag));

  // Suggestions not already chosen (so the list shrinks as you pick).
  const openSuggestions = suggestions.filter(
    (option) => !selected.some((entry) => entry.toLowerCase() === option.label.toLowerCase())
  );
  // Custom tags the user added that aren't in the suggestion catalog.
  const customTags = selected.filter(
    (entry) => !suggestions.some((option) => option.label.toLowerCase() === entry.toLowerCase())
  );

  return (
    <div className={cn("space-y-3", className)}>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((tag) => (
            <span
              key={tag}
              className={cn(chipBase, chipOn, "pr-1.5")}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => remove(tag)}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-charcoal/60 transition-colors hover:bg-charcoal/10 hover:text-charcoal"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {openSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {openSuggestions.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              onClick={() => add(option.label)}
              className={cn(chipBase, chipOff)}
            >
              <Plus className="h-3 w-3 shrink-0 opacity-60" />
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {allowCustom ? (
        adding ? (
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add(draft);
                } else if (event.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              placeholder={placeholder}
              className="w-full max-w-[18rem] border border-charcoal/15 bg-ivory px-3 py-1.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
            />
            <button
              type="button"
              onClick={() => add(draft)}
              className={cn(chipBase, chipOn)}
            >
              Add
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              className="inline-flex h-7 w-7 items-center justify-center border border-charcoal/15 text-slate hover:border-charcoal/30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          customTags.length === 0 || openSuggestions.length > 0 ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark transition-colors hover:text-gold-primary"
            >
              + Add your own
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark transition-colors hover:text-gold-primary"
            >
              + Add another
            </button>
          )
        )
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * SwatchPalette — visual color multi-select for decor palettes.
 * Use for: decor palette / atmosphere.
 * ------------------------------------------------------------------ */
export type Swatch = {
  value: string;
  label: string;
  colors: string[]; // hex stops for the preview
};

export function SwatchPalette({
  swatches,
  value,
  onChange,
  className,
}: {
  swatches: Swatch[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const selected = normalizeArray(value);
  const toggle = (val: string) =>
    onChange(
      selected.includes(val)
        ? selected.filter((entry) => entry !== val)
        : [...selected, val]
    );

  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3", className)}>
      {swatches.map((swatch) => {
        const active = selected.includes(swatch.value);
        return (
          <button
            key={swatch.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(swatch.value)}
            className={cn(
              "group flex items-center gap-2.5 border p-2 text-left transition-colors",
              active
                ? "border-gold-primary bg-gold-primary/10"
                : "border-charcoal/12 bg-ivory hover:border-gold-primary/40"
            )}
          >
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-charcoal/10 shadow-inner"
              style={{
                backgroundImage: `linear-gradient(135deg, ${swatch.colors.join(", ")})`,
              }}
            />
            <span className="min-w-0">
              <span className="block truncate font-heading text-xs text-charcoal">
                {swatch.label}
              </span>
              {active ? (
                <span className="font-accent text-[9px] uppercase tracking-[0.16em] text-gold-dark">
                  Selected
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stepper — number entry without the keyboard. +/- buttons plus optional
 * quick presets. Use for: guest counts.
 * ------------------------------------------------------------------ */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 10,
  presets,
  suffix,
  formatValue,
  className,
}: {
  value: number | null;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
  suffix?: string;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const current = typeof value === "number" && Number.isFinite(value) ? value : min;
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const displayValue = (next: number) => formatValue?.(next) ?? String(next);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="inline-flex items-stretch border border-charcoal/15 bg-ivory">
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(clamp(current - step))}
          className="flex w-10 items-center justify-center border-r border-charcoal/12 text-slate transition-colors hover:bg-gold-primary/10 hover:text-charcoal"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex min-w-[5.5rem] items-baseline justify-center gap-1 px-4 py-2">
          <span className="font-display text-xl text-charcoal">
            {displayValue(current)}
          </span>
          {suffix ? (
            <span className="font-accent text-[9px] uppercase tracking-[0.16em] text-slate">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(clamp(current + step))}
          className="flex w-10 items-center justify-center border-l border-charcoal/12 text-slate transition-colors hover:bg-gold-primary/10 hover:text-charcoal"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {presets && presets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(clamp(preset))}
              className={cn(chipBase, current === preset ? chipOn : chipOff)}
            >
              {displayValue(preset)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * OwnerSelect — assign a task owner from common roles, custom optional.
 * ------------------------------------------------------------------ */
export function OwnerSelect({
  value,
  onChange,
  options = TASK_OWNER_OPTIONS,
  className,
}: {
  value: string | null;
  onChange: (next: string) => void;
  options?: PlannerOption[];
  className?: string;
}) {
  const known = options.some((option) => option.value === value);
  const [custom, setCustom] = useState(!known && Boolean(value));

  if (custom) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          autoFocus
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Owner name"
          className="w-full max-w-[14rem] border border-charcoal/15 bg-ivory px-3 py-1.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
        />
        <button
          type="button"
          onClick={() => setCustom(false)}
          className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate hover:text-charcoal"
        >
          Pick role
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(chipBase, active ? chipOn : chipOff)}
          >
            {option.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          setCustom(true);
          onChange("");
        }}
        className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark hover:text-gold-primary"
      >
        + Custom
      </button>
    </div>
  );
}

/* ================================================================== *
 * Curated catalogs — the option data behind the controls above.
 * Keep India-destination-event flavored, broad enough for any event type.
 * ================================================================== */

const opt = (label: string, hint?: string): PlannerOption => ({
  value: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  label,
  hint,
});

export const FOOD_SERVICE_STYLES: PlannerOption[] = [
  opt("Plated"),
  opt("Buffet"),
  opt("Family style"),
  opt("Live counters"),
  opt("Grazing tables"),
  opt("Cocktail bites"),
];

export const CUISINE_OPTIONS: PlannerOption[] = [
  opt("North Indian"),
  opt("South Indian"),
  opt("Mughlai"),
  opt("Continental"),
  opt("Pan-Asian"),
  opt("Italian"),
  opt("Mediterranean"),
  opt("Street food"),
  opt("Regional thali"),
  opt("Desserts & mithai"),
];

export const DIETARY_TAG_OPTIONS: PlannerOption[] = [
  opt("Vegetarian"),
  opt("Vegan"),
  opt("Jain"),
  opt("Halal"),
  opt("Gluten-free"),
  opt("Nut-free"),
  opt("No onion / garlic"),
  opt("Kids menu"),
];

export const SIGNATURE_COUNTER_OPTIONS: PlannerOption[] = [
  opt("Chaat counter"),
  opt("Pan-Asian wok"),
  opt("Wood-fired pizza"),
  opt("Dessert bar"),
  opt("Mocktail bar"),
  opt("Coffee & chai cart"),
  opt("Late-night snacks"),
  opt("Paan station"),
];

export const DECOR_STYLE_OPTIONS: PlannerOption[] = [
  opt("Modern minimal"),
  opt("Royal / regal"),
  opt("Floral garden"),
  opt("Boho / rustic"),
  opt("Festive traditional"),
  opt("Beach / resort"),
  opt("Black-tie glamour"),
];

export const DECOR_PALETTES: Swatch[] = [
  { value: "blush-gold", label: "Blush & gold", colors: ["#f3d9d2", "#e8d5b0", "#c9a96e"] },
  { value: "ivory-sage", label: "Ivory & sage", colors: ["#f6f1e7", "#cdd7c2", "#9bae8f"] },
  { value: "jewel-tones", label: "Jewel tones", colors: ["#7b2d4e", "#1f5f5b", "#c9a227"] },
  { value: "midnight-gold", label: "Midnight & gold", colors: ["#16182a", "#3b3f63", "#c9a96e"] },
  { value: "coral-sunset", label: "Coral sunset", colors: ["#f4a261", "#e76f51", "#9d4e4e"] },
  { value: "pastel-spring", label: "Pastel spring", colors: ["#fbe5e1", "#dfeae0", "#cfe0ef"] },
  { value: "terracotta", label: "Terracotta earth", colors: ["#c97b5a", "#d9b08c", "#7c5b43"] },
  { value: "all-white", label: "All white", colors: ["#ffffff", "#f4f1ea", "#e6e0d4"] },
];

export const DRESS_CODE_OPTIONS: PlannerOption[] = [
  opt("Black tie"),
  opt("Cocktail"),
  opt("Indian festive"),
  opt("Pastels"),
  opt("Jewel tones"),
  opt("Beach chic"),
  opt("Smart casual"),
  opt("All white"),
];

export const TRANSPORT_OPTIONS: PlannerOption[] = [
  opt("Valet parking"),
  opt("Guest shuttle loops"),
  opt("Self-park"),
  opt("Airport pickups"),
  opt("Golf carts on-site"),
  opt("Driver holding area"),
];

export const ROOMING_OPTIONS: PlannerOption[] = [
  opt("Getting-ready suite"),
  opt("Family holding rooms"),
  opt("Elder / accessible rooms"),
  opt("Vendor green room"),
  opt("Welcome amenities"),
  opt("Late checkout block"),
];

export const WEATHER_BACKUP_OPTIONS: PlannerOption[] = [
  opt("Indoor move plan"),
  opt("Tenting / canopy"),
  opt("Heaters / fans"),
  opt("Umbrellas on standby"),
  opt("Covered walkways"),
  opt("Flexible call time"),
];

export const CEREMONY_FLOW_OPTIONS: PlannerOption[] = [
  opt("Guest arrival"),
  opt("Welcome drinks"),
  opt("Procession"),
  opt("Main ceremony"),
  opt("Family photos"),
  opt("Cocktail hour"),
  opt("Dinner service"),
  opt("Speeches / toasts"),
  opt("First dance"),
  opt("After-party"),
];

export const TASK_TEMPLATES: PlannerOption[] = [
  opt("Confirm final run of show"),
  opt("Lock vendor arrival times"),
  opt("Finalize guest count"),
  opt("Share floor plan"),
  opt("Approve menu tasting"),
  opt("Confirm decor mock-up"),
  opt("Collect dietary needs"),
  opt("Brief MC / host"),
  opt("Confirm rooming list"),
  opt("Settle final payments"),
];

export const TASK_OWNER_OPTIONS: PlannerOption[] = [
  opt("Planner"),
  opt("Couple"),
  opt("Host"),
  opt("Family"),
  opt("Vendor"),
  opt("Elysian team"),
];

export const GUEST_PRESETS = [50, 100, 150, 200, 300, 500];
