"use client";

import { motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { fadeUp } from "@/animations/variants";
import { useInViewAnimation } from "@/hooks/use-in-view-animation";
import { cn } from "@/lib/utils";

type Cell =
  | { kind: "check" }
  | { kind: "cross" }
  | { kind: "dash" }
  | { kind: "text"; value: string };

const rows: { feature: string; intimate: Cell; grand: Cell; royal: Cell }[] = [
  {
    feature: "Venue sourcing & shortlist",
    intimate: { kind: "text", value: "Curated shortlist" },
    grand: { kind: "text", value: "Premium portfolio" },
    royal: { kind: "text", value: "Exclusive / private estates" },
  },
  {
    feature: "Décor & floral design",
    intimate: { kind: "text", value: "Essential styling" },
    grand: { kind: "text", value: "Full creative direction" },
    royal: { kind: "text", value: "Bespoke art direction" },
  },
  {
    feature: "Photography",
    intimate: { kind: "text", value: "1 lead photographer" },
    grand: { kind: "text", value: "Photo + film team" },
    royal: { kind: "text", value: "Celebrity / destination crews" },
  },
  {
    feature: "Videography",
    intimate: { kind: "cross" },
    grand: { kind: "check" },
    royal: { kind: "check" },
  },
  {
    feature: "Catering & menu design",
    intimate: { kind: "text", value: "Coordination" },
    grand: { kind: "text", value: "Multi-event menus" },
    royal: { kind: "text", value: "Gourmet + tastings" },
  },
  {
    feature: "Entertainment & music",
    intimate: { kind: "dash" },
    grand: { kind: "check" },
    royal: { kind: "text", value: "Live acts & MC" },
  },
  {
    feature: "Makeup & styling",
    intimate: { kind: "cross" },
    grand: { kind: "check" },
    royal: { kind: "text", value: "VIP artists" },
  },
  {
    feature: "On-site coordination",
    intimate: { kind: "text", value: "Ceremony & reception" },
    grand: { kind: "text", value: "Full weekend team" },
    royal: { kind: "text", value: "Principal + pod" },
  },
  {
    feature: "Budget tool & transparency",
    intimate: { kind: "check" },
    grand: { kind: "check" },
    royal: { kind: "text", value: "Dedicated finance desk" },
  },
  {
    feature: "Travel & logistics",
    intimate: { kind: "dash" },
    grand: { kind: "text", value: "Guest transport matrix" },
    royal: { kind: "text", value: "Charters & VIP" },
  },
];

function CellIcon({ cell }: { cell: Cell }) {
  if (cell.kind === "check") {
    return <Check className="mx-auto h-5 w-5 text-gold-dark" strokeWidth={2.5} aria-label="Included" />;
  }
  if (cell.kind === "cross") {
    return <X className="mx-auto h-5 w-5 text-slate/50" strokeWidth={2} aria-label="Not included" />;
  }
  if (cell.kind === "dash") {
    return <Minus className="mx-auto h-5 w-5 text-slate/40" aria-label="Limited" />;
  }
  return (
    <span className="font-heading text-sm leading-snug text-charcoal md:text-[15px]">{cell.value}</span>
  );
}

export function PackageComparison() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.08 });

  return (
    <section
      ref={ref}
      className="bg-ivory px-[var(--section-padding-x)] py-[var(--section-padding-y)]"
      aria-labelledby="comparison-heading"
    >
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="mx-auto max-w-6xl"
      >
        <h2
          id="comparison-heading"
          className="font-display text-center text-charcoal"
          style={{ fontSize: "var(--text-h1)" }}
        >
          Compare tiers
        </h2>
        <p className="font-heading mx-auto mt-3 max-w-2xl text-center text-lg font-light text-slate">
          A quick view of how support deepens as your celebration grows in scale and ambition.
        </p>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-gold-light/40 bg-cream/40 shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="sticky top-0 z-20 bg-ivory/95 shadow-sm backdrop-blur-md">
                <th
                  scope="col"
                  className="font-accent border-b border-gold-light/50 px-4 py-4 text-xs uppercase tracking-[0.2em] text-gold-dark md:px-6"
                >
                  Feature
                </th>
                <th
                  scope="col"
                  className="font-display border-b border-gold-light/50 px-4 py-4 text-center text-lg text-charcoal md:px-6"
                >
                  Intimate
                </th>
                <th
                  scope="col"
                  className="font-display border-b border-gold-light/50 bg-gold-primary/12 px-4 py-4 text-center text-lg text-charcoal ring-1 ring-inset ring-gold-primary/25 md:px-6"
                >
                  Grand
                </th>
                <th
                  scope="col"
                  className="font-display border-b border-gold-light/50 px-4 py-4 text-center text-lg text-charcoal md:px-6"
                >
                  Royal
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-gold-light/30 last:border-0">
                  <th
                    scope="row"
                    className="font-heading max-w-[200px] px-4 py-4 text-sm font-medium text-charcoal md:px-6 md:text-[15px]"
                  >
                    {row.feature}
                  </th>
                  <td className="px-4 py-4 text-center align-middle md:px-6">
                    <CellIcon cell={row.intimate} />
                  </td>
                  <td
                    className={cn(
                      "bg-gold-primary/8 px-4 py-4 text-center align-middle ring-1 ring-inset ring-gold-primary/15 md:px-6",
                    )}
                  >
                    <CellIcon cell={row.grand} />
                  </td>
                  <td className="px-4 py-4 text-center align-middle md:px-6">
                    <CellIcon cell={row.royal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}
