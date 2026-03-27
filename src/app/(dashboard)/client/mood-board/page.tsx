"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const boardTabs = ["All", "Decor", "Outfits", "Venue", "Flowers", "Food"] as const;
type BoardCat = (typeof boardTabs)[number];

const items: { id: string; cat: Exclude<BoardCat, "All">; caption?: string }[] = [
  { id: "1", cat: "Decor", caption: "Brass lamps + linen runner" },
  { id: "2", cat: "Venue", caption: "Courtyard arcades" },
  { id: "3", cat: "Outfits" },
  { id: "4", cat: "Flowers", caption: "White orchid canopy" },
  { id: "5", cat: "Food", caption: "Live chaat counter" },
  { id: "6", cat: "Decor" },
  { id: "7", cat: "Venue" },
  { id: "8", cat: "Outfits", caption: "Ivory silk drape" },
];

const heights = [180, 240, 200, 260, 190, 220, 210, 230];

export default function ClientMoodBoardPage() {
  const [tab, setTab] = useState<BoardCat>("All");
  const [list, setList] = useState(items);

  const filtered = useMemo(() => {
    if (tab === "All") return list;
    return list.filter((i) => i.cat === tab);
  }, [tab, list]);

  const remove = (id: string) => setList((l) => l.filter((x) => x.id !== id));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Inspiration</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Mood board</h2>
        </div>
        <button type="button" className={dashBtn}>
          Add Inspiration
        </button>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {boardTabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "font-accent border-b-2 px-3 py-3 text-[10px] uppercase tracking-[0.15em] transition-colors md:px-4 md:text-[11px] md:tracking-[0.2em]",
                  active ? "-mb-px border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 columns-2 gap-4 md:columns-3">
        {filtered.map((item, idx) => (
          <motion.div key={item.id} variants={staggerItem} className="group mb-4 break-inside-avoid">
            <div className={cn(dashCard, "p-0")}>
              <div
                className="relative w-full overflow-hidden border-b border-charcoal/8"
                style={{ height: heights[(idx + item.id.charCodeAt(0)) % heights.length] }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cream via-midnight/20 to-charcoal/30" />
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="font-accent absolute right-2 top-2 border border-charcoal/30 bg-ivory/95 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-charcoal opacity-0 transition-opacity group-hover:opacity-100 hover:border-gold-primary"
                >
                  Delete
                </button>
              </div>
              {item.caption ? (
                <p className="font-heading p-4 text-xs font-light text-slate">{item.caption}</p>
              ) : (
                <p className={cn(dashLabel, "p-4")}>No caption</p>
              )}
            </div>
          </motion.div>
        ))}

        <div className="mb-4 break-inside-avoid">
          <button
            type="button"
            className="flex min-h-[160px] w-full items-center justify-center border border-dashed border-charcoal/25 bg-transparent font-accent text-[11px] uppercase tracking-[0.2em] text-slate transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Add Inspiration
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
