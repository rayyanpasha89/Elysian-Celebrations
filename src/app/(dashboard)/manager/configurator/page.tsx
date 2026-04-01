"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Destination = {
  id: string;
  name: string;
  country: string;
  starting_price: number | null;
};

const packageTiers = [
  { name: "Intimate", desc: "Up to 50 guests", multiplier: 1 },
  { name: "Grand", desc: "50 to 200 guests", multiplier: 1.8 },
  { name: "Royal", desc: "200+ guests", multiplier: 3.2 },
];

const decorThemes = ["Classic Elegance", "Bohemian Garden", "Royal Heritage", "Modern Minimal", "Tropical Paradise"];
const cateringStyles = ["Plated Fine Dining", "Buffet (Multi-Cuisine)", "Live Stations", "Family-Style"];
const entertainmentOptions = ["DJ & Dance Floor", "Live Band", "Traditional Performers", "Both Live & DJ"];
const photoOptions = ["Photography Only", "Photo + Video", "Full Cinematic Package"];

function formatINR(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function EventConfiguratorPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDest, setSelectedDest] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [guestCount, setGuestCount] = useState(120);
  const [decorTheme, setDecorTheme] = useState("");
  const [catering, setCatering] = useState("");
  const [entertainment, setEntertainment] = useState("");
  const [photography, setPhotography] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/destinations");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) setDestinations(json.destinations ?? []);
      } catch {
        if (!cancelled) setDestinations([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dest = destinations.find((d) => d.id === selectedDest);
  const tier = packageTiers.find((t) => t.name === selectedTier);

  const estimate = useMemo(() => {
    const basePrice = dest?.starting_price ?? 1500000;
    const tierMult = tier?.multiplier ?? 1;
    const guestMult = Math.max(1, guestCount / 100);
    const addonCount = [decorTheme, catering, entertainment, photography].filter(Boolean).length;
    const addonMult = 1 + addonCount * 0.08;
    return Math.round(basePrice * tierMult * guestMult * addonMult);
  }, [dest, tier, guestCount, decorTheme, catering, entertainment, photography]);

  const selectionsMade = [selectedDest, selectedTier, decorTheme, catering, entertainment, photography].filter(Boolean).length;
  const completionPct = Math.round((selectionsMade / 6) * 100);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Planning tool</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Event Configurator
        </h2>
        <p className="font-heading mt-2 max-w-xl text-sm text-slate">
          Use this tool when clients visit the office. Walk them through their event customization
          with a live preview of their selections.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className={dashCard}>
          <h3 className="font-display text-lg text-charcoal">Configuration Panel</h3>
          <p className="mt-4 font-heading text-sm text-slate">
            Select destination, venue, date, package tier, guest count, decor theme,
            catering style, entertainment, and photography.
          </p>
          <div className="mt-8 space-y-6">
            <div>
              <label className={dashLabel}>Destination</label>
              <select
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">Select destination</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}, {d.country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={dashLabel}>Package Tier</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">Select tier</option>
                {packageTiers.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} — {t.desc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={dashLabel}>Guest Count</label>
              <input
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              />
            </div>
            <div>
              <label className={dashLabel}>Decor Theme</label>
              <select
                value={decorTheme}
                onChange={(e) => setDecorTheme(e.target.value)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">Select theme</option>
                {decorThemes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={dashLabel}>Catering Style</label>
              <select
                value={catering}
                onChange={(e) => setCatering(e.target.value)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">Select catering</option>
                {cateringStyles.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={dashLabel}>Entertainment</label>
              <select
                value={entertainment}
                onChange={(e) => setEntertainment(e.target.value)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">Select entertainment</option>
                {entertainmentOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={dashLabel}>Photography</label>
              <select
                value={photography}
                onChange={(e) => setPhotography(e.target.value)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">Select package</option>
                {photoOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className={dashCard}>
            <h3 className="font-display text-lg text-charcoal">Live Preview</h3>
            <p className="mt-4 font-heading text-sm text-slate">
              A visual summary of the client&apos;s selections updates in real time.
            </p>

            <div className="mt-6 space-y-1">
              <div className="flex items-center justify-between">
                <span className={dashLabel}>Configuration progress</span>
                <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-gold-dark">
                  {completionPct}%
                </span>
              </div>
              <div className="h-2 border border-charcoal/10 bg-cream">
                <motion.div
                  className="h-full bg-gold-primary/60"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <SummaryRow label="Destination" value={dest ? `${dest.name}, ${dest.country}` : null} />
              <SummaryRow label="Package" value={selectedTier || null} />
              <SummaryRow label="Guests" value={String(guestCount)} />
              <SummaryRow label="Decor" value={decorTheme || null} />
              <SummaryRow label="Catering" value={catering || null} />
              <SummaryRow label="Entertainment" value={entertainment || null} />
              <SummaryRow label="Photography" value={photography || null} />
            </div>
          </div>

          <div className={dashCard}>
            <p className={dashLabel}>Estimated Budget</p>
            <motion.p
              key={estimate}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-charcoal"
            >
              {formatINR(estimate)}
            </motion.p>
            <p className="font-heading mt-2 text-xs text-slate">
              Rough estimate based on selections. Final pricing varies by vendor availability and dates.
            </p>
          </div>

          {completionPct === 100 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(dashCard, "border-gold-primary/30 bg-cream/40")}
            >
              <p className="font-display text-lg text-charcoal">Configuration Complete</p>
              <p className="mt-2 font-heading text-sm text-slate">
                All selections are made. You can now walk the client through the estimate
                and discuss vendor options for each category.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-charcoal/8 pb-3 last:border-0 last:pb-0">
      <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">{label}</span>
      <span className={cn(
        "font-heading text-sm",
        value ? "text-charcoal" : "text-charcoal/30"
      )}>
        {value ?? "Not selected"}
      </span>
    </div>
  );
}
