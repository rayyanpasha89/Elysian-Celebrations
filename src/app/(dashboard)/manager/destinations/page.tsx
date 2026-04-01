"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";

type Destination = {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
  tagline: string | null;
};

export default function ManagerDestinationsPage() {
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<Destination[]>([]);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-64 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Reference</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Destinations</h2>
        <p className="font-heading mt-2 text-sm text-slate">
          Active destinations available for client weddings.
        </p>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {destinations.map((d) => (
          <motion.div key={d.id} variants={staggerItem} className={dashCard}>
            <div className="aspect-[16/10] border border-charcoal/10 bg-gradient-to-br from-midnight/60 to-charcoal/20" />
            <h3 className="font-display mt-4 text-xl text-charcoal">{d.name}</h3>
            <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-dark">{d.country}</p>
            {d.tagline && (
              <p className="font-heading mt-3 text-sm font-light text-slate">{d.tagline}</p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
