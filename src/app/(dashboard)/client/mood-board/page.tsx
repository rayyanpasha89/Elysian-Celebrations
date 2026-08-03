"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const boardTabs = ["All", "Decor", "Outfits", "Venue", "Flowers", "Food"] as const;
type BoardCat = (typeof boardTabs)[number];
type MoodBoardCategory = Exclude<BoardCat, "All">;

type ItemRow = {
  id: string;
  cat: MoodBoardCategory;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string | null;
};

const heights = [180, 240, 200, 260, 190, 220, 210, 230];

function normalizeCategory(value: string | null | undefined): MoodBoardCategory {
  if (value === "Outfits") return "Outfits";
  if (value === "Venue") return "Venue";
  if (value === "Flowers") return "Flowers";
  if (value === "Food") return "Food";
  return "Decor";
}

export default function ClientMoodBoardPage() {
  const [tab, setTab] = useState<BoardCat>("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [list, setList] = useState<ItemRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({
    imageUrl: "",
    caption: "",
    sourceUrl: "",
    category: "Decor" as MoodBoardCategory,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch("/api/mood-boards");
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error ?? "Your mood board could not be loaded.");
        }
        const items = json.items ?? [];
        const mapped: ItemRow[] = items.map(
          (item: {
            id: string;
            caption: string | null;
            image_url: string;
            source_url: string | null;
            category: string | null;
          }) => ({
            id: item.id,
            cat: normalizeCategory(item.category),
            imageUrl: item.image_url,
            caption: item.caption ?? undefined,
            sourceUrl: item.source_url,
          })
        );
        if (!cancelled) setList(mapped);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Your mood board could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    if (tab === "All") return list;
    return list.filter((item) => item.cat === tab);
  }, [tab, list]);

  const remove = async (id: string) => {
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/mood-boards/items/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "This inspiration could not be removed.");
      }
      setList((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "This inspiration could not be removed."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.imageUrl.trim()) return;

    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch("/api/mood-boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: form.imageUrl.trim(),
          caption: form.caption.trim(),
          sourceUrl: form.sourceUrl.trim(),
          category: form.category,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "This inspiration could not be saved.");
      }

      setList((current) => [
        {
          id: json.id,
          cat: normalizeCategory(json.category),
          imageUrl: json.image_url,
          caption: json.caption ?? undefined,
          sourceUrl: json.source_url,
        },
        ...current,
      ]);
      setForm({
        imageUrl: "",
        caption: "",
        sourceUrl: "",
        category: "Decor",
      });
      setShowComposer(false);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "This inspiration could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-64 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <p className={dashLabel}>Inspiration</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Mood board
        </h2>
        <div
          role="alert"
          className={cn(
            dashCard,
            "mt-10 border-dashed border-gold-primary/45 bg-gold-primary/[0.04]"
          )}
        >
          <p className={dashLabel}>Board unavailable</p>
          <h3 className="mt-3 font-display text-2xl text-charcoal">
            Your saved inspiration is still protected
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
            {loadError} Nothing has been shown as an empty board, and you can retry
            when the connection is ready.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className={cn(dashBtn, "mt-6")}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Inspiration</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Mood board</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowComposer((value) => !value)}
          className={dashBtn}
        >
          {showComposer ? "Close composer" : "Add Inspiration"}
        </button>
      </motion.div>

      {actionError ? (
        <motion.div
          variants={fadeUp}
          role="alert"
          className="mt-6 flex flex-col gap-3 border border-rose/45 bg-rose/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm leading-relaxed text-charcoal">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="font-accent shrink-0 text-[9px] uppercase tracking-[0.18em] text-charcoal underline decoration-charcoal/30 underline-offset-4"
          >
            Dismiss
          </button>
        </motion.div>
      ) : null}

      {showComposer ? (
        <motion.form
          variants={fadeUp}
          onSubmit={addItem}
          className={cn(dashCard, "mt-8 grid gap-4 lg:grid-cols-2")}
        >
          <div>
            <label htmlFor="mood-image-url" className={dashLabel}>
              Image URL
            </label>
            <input
              id="mood-image-url"
              type="url"
              value={form.imageUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, imageUrl: event.target.value }))
              }
              placeholder="https://..."
              className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
            />
          </div>
          <div>
            <label htmlFor="mood-category" className={dashLabel}>
              Category
            </label>
            <select
              id="mood-category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: normalizeCategory(event.target.value),
                }))
              }
              className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
            >
              {boardTabs
                .filter((value): value is MoodBoardCategory => value !== "All")
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="mood-caption" className={dashLabel}>
              Caption
            </label>
            <input
              id="mood-caption"
              type="text"
              value={form.caption}
              onChange={(event) =>
                setForm((current) => ({ ...current, caption: event.target.value }))
              }
              placeholder="What are you saving this for?"
              className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
            />
          </div>
          <div>
            <label htmlFor="mood-source" className={dashLabel}>
              Source URL
            </label>
            <input
              id="mood-source"
              type="url"
              value={form.sourceUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, sourceUrl: event.target.value }))
              }
              placeholder="Optional source link"
              className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
            />
          </div>
          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                dashBtn,
                saving && "cursor-wait opacity-70"
              )}
            >
              {saving ? "Saving..." : "Save to board"}
            </button>
          </div>
        </motion.form>
      ) : null}

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {boardTabs.map((value) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "font-accent border-b-2 px-3 py-3 text-[10px] uppercase tracking-[0.15em] transition-colors md:px-4 md:text-[11px] md:tracking-[0.2em]",
                  active ? "-mb-px border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal"
                )}
              >
                {value}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <ListEmptyState hint="Save inspiration images to your mood board as you plan your look and feel." />
        </div>
      ) : (
        <motion.div variants={fadeUp} className="mt-10 columns-2 gap-4 md:columns-3">
          {filtered.map((item, idx) => (
            <motion.div key={item.id} variants={staggerItem} className="group mb-4 break-inside-avoid">
              <div className={cn(dashCard, "overflow-hidden p-0")}>
                <div
                  className="relative w-full overflow-hidden border-b border-charcoal/8 bg-cover bg-center"
                  style={{
                    height: heights[(idx + item.id.charCodeAt(0)) % heights.length],
                    backgroundImage: `linear-gradient(180deg, rgba(51,61,41,0.08), rgba(51,61,41,0.24)), url(${item.imageUrl})`,
                  }}
                >
                  <span className="font-accent absolute left-3 top-3 border border-ivory/30 bg-ivory/90 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-charcoal">
                    {item.cat}
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    disabled={deletingId === item.id}
                    className="font-accent absolute right-2 top-2 border border-charcoal/30 bg-ivory/95 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-charcoal opacity-100 transition-opacity hover:border-gold-primary focus-visible:opacity-100 disabled:cursor-wait disabled:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                  >
                    {deletingId === item.id ? "Removing" : "Delete"}
                  </button>
                </div>
                {item.caption ? (
                  <p className="font-heading p-4 text-xs font-light text-slate">{item.caption}</p>
                ) : (
                  <p className={cn(dashLabel, "p-4")}>No caption</p>
                )}
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-accent block px-4 pb-4 text-[10px] uppercase tracking-[0.15em] text-gold-dark hover:underline"
                  >
                    Open source
                  </a>
                ) : null}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
