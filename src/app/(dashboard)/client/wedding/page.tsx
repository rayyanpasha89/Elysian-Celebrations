"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const wedding = {
  name: "Priya & Arjun",
  date: "2026-02-14",
};

const destination = {
  name: "Udaipur",
  country: "India",
  tagline: "Lake Pichola & palace terraces",
};

const packageTier = "Grand";

const events = [
  {
    id: "1",
    name: "Mehendi",
    date: "2026-02-12",
    venue: "The Leela Courtyard",
    status: "CONFIRMED" as const,
  },
  {
    id: "2",
    name: "Sangeet",
    date: "2026-02-13",
    venue: "Jagmandir Island",
    status: "CONFIRMED" as const,
  },
  {
    id: "3",
    name: "Wedding",
    date: "2026-02-14",
    venue: "City Palace Terrace",
    status: "PLANNING" as const,
  },
  {
    id: "4",
    name: "Reception",
    date: "2026-02-15",
    venue: "TBD",
    status: "PENDING" as const,
  },
];

function eventStatusClass(s: (typeof events)[0]["status"]) {
  if (s === "CONFIRMED") return "border-sage/60 text-sage";
  if (s === "PLANNING") return "border-gold-primary/60 text-gold-dark";
  return "border-charcoal/25 text-slate";
}

function eventStatusLabel(s: (typeof events)[0]["status"]) {
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "PLANNING") return "Planning";
  return "Pending";
}

export default function ClientWeddingPage() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
        <p className={dashLabel}>Wedding</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal md:text-4xl">
          {wedding.name}
        </h2>
        <p className="font-heading mt-2 text-sm text-slate">
          {new Date(wedding.date).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </motion.header>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <motion.div variants={fadeUp} className={cn(dashCard, "lg:col-span-1")}>
          <p className={dashLabel}>Destination</p>
          <div className="mt-4 aspect-[4/3] border border-charcoal/10 bg-gradient-to-br from-midnight/80 to-charcoal/40" />
          <h3 className="font-display mt-4 text-xl text-charcoal">{destination.name}</h3>
          <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-dark">
            {destination.country}
          </p>
          <p className="font-heading mt-3 text-sm font-light text-slate">{destination.tagline}</p>
        </motion.div>

        <motion.div variants={fadeUp} className={cn(dashCard, "lg:col-span-2")}>
          <p className={dashLabel}>Package tier</p>
          <p className="font-display mt-6 text-4xl font-semibold tracking-tight text-charcoal">
            {packageTier}
          </p>
          <p className="font-heading mt-4 max-w-xl text-sm font-light leading-relaxed text-slate">
            Premium multi-day coordination, creative direction, and full weekend on-site management—your
            tier is locked for budgeting and vendor matching.
          </p>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Events</p>
          <h3 className="font-display mt-2 text-2xl text-charcoal">Weekend programme</h3>
        </div>
        <button type="button" className={dashBtn}>
          Add Event
        </button>
      </motion.div>

      <motion.ul
        variants={fadeUp}
        className="mt-8 grid list-none grid-cols-1 gap-6 pl-0 md:grid-cols-2"
      >
        {events.map((ev) => (
          <li key={ev.id} className={dashCard}>
            <div className="flex items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
              <h4 className="font-display text-xl text-charcoal">{ev.name}</h4>
              <span
                className={cn(
                  "shrink-0 border px-3 py-1 font-accent text-[10px] uppercase tracking-[0.15em]",
                  eventStatusClass(ev.status),
                )}
              >
                {eventStatusLabel(ev.status)}
              </span>
            </div>
            <p className="font-heading mt-4 text-sm text-charcoal">
              {new Date(ev.date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="font-heading mt-2 text-sm font-light text-slate">{ev.venue}</p>
          </li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
