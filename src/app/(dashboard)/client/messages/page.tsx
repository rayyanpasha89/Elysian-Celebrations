"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Conv = {
  id: string;
  vendor: string;
  initials: string;
  preview: string;
  time: string;
  messages: { from: "vendor" | "client"; text: string; time: string }[];
};

const conversations: Conv[] = [
  {
    id: "1",
    vendor: "Lens & Light Studios",
    initials: "LL",
    preview: "We can add a second shooter for the baraat.",
    time: "2h ago",
    messages: [
      { from: "vendor", text: "Timeline for February looks strong—we suggest a scout morning on the 12th.", time: "Mon 10:12" },
      { from: "client", text: "Yes, please lock the scout. Any fee for early entry?", time: "Mon 10:18" },
      { from: "vendor", text: "We can add a second shooter for the baraat. Updated quote follows tomorrow.", time: "2h ago" },
    ],
  },
  {
    id: "2",
    vendor: "Nova Decor House",
    initials: "ND",
    preview: "Mandap sketch v2 attached.",
    time: "Yesterday",
    messages: [
      { from: "vendor", text: "Mandap sketch v2 attached.", time: "Yesterday" },
      { from: "client", text: "Love the arch height—can we warm the linen tone?", time: "Yesterday" },
    ],
  },
  {
    id: "3",
    vendor: "Spice Route Catering",
    initials: "SR",
    preview: "Tasting menu confirmed for 18 Jan.",
    time: "3d ago",
    messages: [
      { from: "client", text: "Need Jain options for table 4.", time: "4d ago" },
      { from: "vendor", text: "Tasting menu confirmed for 18 Jan.", time: "3d ago" },
    ],
  },
  {
    id: "4",
    vendor: "Midnight Sound",
    initials: "MS",
    preview: "Sangeet set list draft.",
    time: "5d ago",
    messages: [{ from: "vendor", text: "Sangeet set list draft.", time: "5d ago" }],
  },
];

export default function ClientMessagesPage() {
  const [active, setActive] = useState(conversations[0]!.id);
  const current = conversations.find((c) => c.id === active) ?? conversations[0]!;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Inbox</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Messages</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid min-h-[480px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className={cn(dashCard, "flex flex-col p-0")}>
          <div className="border-b border-charcoal/8 px-4 py-3">
            <p className={dashLabel}>Conversations</p>
          </div>
          <ul className="list-none divide-y divide-charcoal/8 pl-0">
            {conversations.map((c) => {
              const on = c.id === active;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActive(c.id)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-4 text-left transition-colors",
                      on ? "bg-gold-primary/5" : "hover:bg-cream/80",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[10px] tracking-wider text-ivory">
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm text-charcoal">{c.vendor}</p>
                      <p className="font-heading mt-1 line-clamp-1 text-xs text-slate">{c.preview}</p>
                      <p className="font-accent mt-1 text-[9px] uppercase tracking-[0.15em] text-slate">{c.time}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={cn(dashCard, "flex flex-col p-0")}>
          <div className="flex items-center gap-3 border-b border-charcoal/8 px-6 py-4">
            <div className="flex h-11 w-11 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[11px] text-ivory">
              {current.initials}
            </div>
            <div>
              <p className="font-display text-lg text-charcoal">{current.vendor}</p>
              <p className={dashLabel}>Vendor</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
            {current.messages.map((m, i) => (
              <motion.div
                key={`${current.id}-${i}`}
                variants={staggerItem}
                className={cn("flex", m.from === "client" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] border px-4 py-3",
                    m.from === "client"
                      ? "border-gold-primary/40 bg-gold-primary/5"
                      : "border-charcoal/12 bg-cream/50",
                  )}
                >
                  <p className="font-heading text-sm leading-relaxed text-charcoal">{m.text}</p>
                  <p className="font-accent mt-2 text-[9px] uppercase tracking-[0.15em] text-slate">{m.time}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-charcoal/8 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message"
                className="min-w-0 flex-1 border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              />
              <button
                type="button"
                className="font-accent shrink-0 border border-gold-primary bg-transparent px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
