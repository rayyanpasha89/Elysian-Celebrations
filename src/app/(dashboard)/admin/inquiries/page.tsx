"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type InqStatus = "NEW" | "CONTACTED" | "IN_PROGRESS" | "CONVERTED" | "CLOSED";

const inquiries: {
  id: string;
  name: string;
  email: string;
  destination: string;
  weddingDate: string;
  preview: string;
  message: string;
  status: InqStatus;
}[] = [
  {
    id: "1",
    name: "Ananya Kapoor",
    email: "ananya@email.com",
    destination: "Udaipur",
    weddingDate: "2026-11-20",
    preview: "We are looking for a full weekend package for 180 guests…",
    message:
      "We are looking for a full weekend package for 180 guests with palace venues and transparent budgeting. Please share availability for November 2026.",
    status: "NEW",
  },
  {
    id: "2",
    name: "Daniel Wright",
    email: "dw@email.com",
    destination: "Bali",
    weddingDate: "2026-04-12",
    preview: "Interested in cliff-edge villa options and photography…",
    message:
      "Interested in cliff-edge villa options and photography teams who have shot Indian ceremonies abroad. Budget flexible for the right crew.",
    status: "CONTACTED",
  },
  {
    id: "3",
    name: "Kavya Iyer",
    email: "kavya.i@email.com",
    destination: "Goa",
    weddingDate: "2025-12-06",
    preview: "Need beach welcome dinner + Hindu ceremony on same property…",
    message:
      "Need beach welcome dinner + Hindu ceremony on same property. Guest list ~120. Open to early December dates.",
    status: "IN_PROGRESS",
  },
  {
    id: "4",
    name: "James Miller",
    email: "jm@email.com",
    destination: "Santorini",
    weddingDate: "2026-07-08",
    preview: "Converted from inquiry to contract last week…",
    message: "Converted from inquiry to contract last week. Awaiting final vendor list.",
    status: "CONVERTED",
  },
  {
    id: "5",
    name: "Ritu Sharma",
    email: "ritu@email.com",
    destination: "Jaipur",
    weddingDate: "2024-03-01",
    preview: "Decided to postpone; please close file…",
    message: "Decided to postpone; please close file until we confirm new dates.",
    status: "CLOSED",
  },
];

const tabs: InqStatus[] = ["NEW", "CONTACTED", "IN_PROGRESS", "CONVERTED", "CLOSED"];

function tabBadge(s: InqStatus) {
  return cn(
    statusBadgeBase,
    s === "NEW" && "border-gold-primary/70 text-gold-dark",
    s === "CONTACTED" && "border-charcoal/25 text-charcoal",
    s === "IN_PROGRESS" && "border-charcoal/20 text-slate",
    s === "CONVERTED" && "border-sage/70 text-sage",
    s === "CLOSED" && "border-charcoal/15 text-slate",
  );
}

export default function AdminInquiriesPage() {
  const [tab, setTab] = useState<InqStatus>("NEW");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => inquiries.filter((i) => i.status === tab), [tab]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Leads</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Inquiries</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "font-accent border-b-2 px-3 py-3 text-[10px] uppercase tracking-[0.15em] transition-colors md:px-4 md:text-[11px] md:tracking-[0.2em]",
                  active
                    ? "-mb-px border-gold-primary text-charcoal"
                    : "border-transparent text-slate hover:text-charcoal",
                )}
              >
                {t.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState />
      ) : (
        <ul className="mt-8 list-none space-y-6 pl-0">
          {filtered.map((inq) => {
          const expanded = openId === inq.id;
          return (
            <motion.li key={inq.id} variants={staggerItem} className={dashCard}>
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : inq.id)}
                className="w-full text-left"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                  <div>
                    <h3 className="font-display text-lg text-charcoal">{inq.name}</h3>
                    <p className="font-heading mt-1 text-sm text-slate">{inq.email}</p>
                  </div>
                  <span className={tabBadge(inq.status)}>{inq.status.replace("_", " ")}</span>
                </div>
                <p className="font-accent mt-4 text-[10px] uppercase tracking-[0.2em] text-slate">
                  {inq.destination} ·{" "}
                  {new Date(inq.weddingDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="font-heading mt-3 text-sm font-light text-charcoal/80">{inq.preview}</p>
                <p className="font-accent mt-3 text-[10px] uppercase tracking-[0.2em] text-gold-dark">
                  {expanded ? "Hide message" : "View full message"}
                </p>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="font-heading mt-4 border-t border-charcoal/8 pt-4 text-sm leading-relaxed text-slate">
                      {inq.message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {inq.status === "NEW" && (
                <div className="mt-6">
                  <button type="button" className={dashBtn}>
                    Mark as Contacted
                  </button>
                </div>
              )}
            </motion.li>
          );
          })}
        </ul>
      )}
    </motion.div>
  );
}
