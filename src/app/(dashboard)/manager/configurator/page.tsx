"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import {
  ChipSingleSelect,
  Stepper,
  type PlannerOption,
} from "@/components/dashboard/planner-inputs";
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

const toOpts = (values: string[]): PlannerOption[] =>
  values.map((value) => ({ value, label: value }));
const tierOptions: PlannerOption[] = packageTiers.map((tier) => ({
  value: tier.name,
  label: tier.name,
  hint: tier.desc,
}));
const decorOptions = toOpts(decorThemes);
const cateringOptions = toOpts(cateringStyles);
const entertainmentOpts = toOpts(entertainmentOptions);
const photoOpts = toOpts(photoOptions);
const GUEST_STEPS = [50, 100, 150, 200, 300, 500];

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
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDestinationsLoading(true);
        setDestinationsError(null);
        const res = await fetch("/api/destinations");
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error ?? "Destinations could not be loaded.");
        }
        if (!cancelled) setDestinations(json.destinations ?? []);
      } catch (error) {
        if (!cancelled) {
          setDestinationsError(
            error instanceof Error
              ? error.message
              : "Destinations could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setDestinationsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const dest = destinations.find((d) => d.id === selectedDest);
  const tier = packageTiers.find((t) => t.name === selectedTier);

  const estimate = useMemo(() => {
    if (!dest || !tier || !dest.starting_price) return null;
    const basePrice = dest.starting_price;
    const tierMult = tier.multiplier;
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
            Select a destination, planning tier, guest count, and service direction.
            This is a conversation aid; confirmed pricing still comes from the
            admin-owned final-price workflow.
          </p>
          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="manager-configurator-destination" className={dashLabel}>
                Destination
              </label>
              <select
                id="manager-configurator-destination"
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                disabled={destinationsLoading || Boolean(destinationsError)}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              >
                <option value="">
                  {destinationsLoading ? "Loading destinations..." : "Select destination"}
                </option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}, {d.country}
                  </option>
                ))}
              </select>
              {destinationsError ? (
                <div role="alert" className="mt-3 border border-rose/35 bg-rose/[0.07] px-3 py-3">
                  <p className="text-xs leading-relaxed text-charcoal">
                    {destinationsError} No fallback price has been inserted.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((key) => key + 1)}
                    className="mt-2 font-accent text-[9px] uppercase tracking-[0.16em] text-gold-dark underline decoration-gold-primary/35 underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
            <div>
              <p className={dashLabel}>Package Tier</p>
              <div className="mt-3">
                <ChipSingleSelect
                  options={tierOptions}
                  value={selectedTier || null}
                  onChange={(value) => setSelectedTier(value ?? "")}
                />
              </div>
            </div>
            <div>
              <p className={dashLabel}>Guest Count</p>
              <div className="mt-3">
                <Stepper
                  value={guestCount}
                  onChange={setGuestCount}
                  min={1}
                  step={10}
                  presets={GUEST_STEPS}
                  suffix="guests"
                />
              </div>
            </div>
            <div>
              <p className={dashLabel}>Decor Theme</p>
              <div className="mt-3">
                <ChipSingleSelect
                  options={decorOptions}
                  value={decorTheme || null}
                  onChange={(value) => setDecorTheme(value ?? "")}
                />
              </div>
            </div>
            <div>
              <p className={dashLabel}>Catering Style</p>
              <div className="mt-3">
                <ChipSingleSelect
                  options={cateringOptions}
                  value={catering || null}
                  onChange={(value) => setCatering(value ?? "")}
                />
              </div>
            </div>
            <div>
              <p className={dashLabel}>Entertainment</p>
              <div className="mt-3">
                <ChipSingleSelect
                  options={entertainmentOpts}
                  value={entertainment || null}
                  onChange={(value) => setEntertainment(value ?? "")}
                />
              </div>
            </div>
            <div>
              <p className={dashLabel}>Photography</p>
              <div className="mt-3">
                <ChipSingleSelect
                  options={photoOpts}
                  value={photography || null}
                  onChange={(value) => setPhotography(value ?? "")}
                />
              </div>
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
              key={estimate ?? "pending"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-charcoal"
            >
              {estimate === null ? "Pricing pending" : formatINR(estimate)}
            </motion.p>
            <p className="font-heading mt-2 text-xs text-slate">
              {estimate === null
                ? "Choose a destination with a published starting price and a planning tier to see a directional range."
                : "Directional only. Admin publishes the final client price after offline vendor confirmation."}
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
