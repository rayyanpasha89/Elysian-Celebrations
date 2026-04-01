"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type InqStatus = "NEW" | "CONTACTED" | "IN_PROGRESS" | "CONVERTED" | "CLOSED";

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  destination: string | null;
  weddingDate: string;
  preview: string;
  message: string;
  status: InqStatus;
};

const tabs: InqStatus[] = ["NEW", "CONTACTED", "IN_PROGRESS", "CONVERTED", "CLOSED"];

function tabBadge(s: InqStatus) {
  return cn(
    statusBadgeBase,
    s === "NEW" && "border-gold-primary/70 text-gold-dark",
    s === "CONTACTED" && "border-charcoal/25 text-charcoal",
    s === "IN_PROGRESS" && "border-charcoal/20 text-slate",
    s === "CONVERTED" && "border-sage/70 text-sage",
    s === "CLOSED" && "border-charcoal/15 text-slate"
  );
}

export default function ManagerInquiriesPage() {
  const [tab, setTab] = useState<InqStatus>("NEW");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/inquiries");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = json.inquiries ?? [];
    setInquiries(
      raw.map(
        (r: {
          id: string;
          name: string;
          email: string;
          destination: string | null;
          wedding_date: string | null;
          message: string;
          status: string;
        }) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          destination: r.destination,
          weddingDate: r.wedding_date ?? "",
          preview: r.message?.slice(0, 120) ?? "",
          message: r.message,
          status: r.status as InqStatus,
        })
      )
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) toast.error("Could not load inquiries");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => inquiries.filter((i) => i.status === tab), [inquiries, tab]);

  const updateStatus = async (id: string, status: InqStatus) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success("Status updated");
    } catch {
      toast.error("Update failed");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-40 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

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
                    : "border-transparent text-slate hover:text-charcoal"
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
            const wd = inq.weddingDate ? new Date(inq.weddingDate) : null;
            const dateLabel =
              wd && !Number.isNaN(wd.getTime())
                ? wd.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : inq.weddingDate || "—";

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
                    {inq.destination ?? "—"} · {dateLabel}
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
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className={dashBtn} onClick={() => updateStatus(inq.id, "CONTACTED")}>
                      Mark as Contacted
                    </button>
                    <button type="button" className={dashBtn} onClick={() => updateStatus(inq.id, "IN_PROGRESS")}>
                      Start Planning
                    </button>
                  </div>
                )}
                {inq.status === "CONTACTED" && (
                  <div className="mt-6">
                    <button type="button" className={dashBtn} onClick={() => updateStatus(inq.id, "IN_PROGRESS")}>
                      Move to In Progress
                    </button>
                  </div>
                )}
                {inq.status === "IN_PROGRESS" && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className={dashBtn} onClick={() => updateStatus(inq.id, "CONVERTED")}>
                      Mark Converted
                    </button>
                    <button type="button" className={dashBtn} onClick={() => updateStatus(inq.id, "CLOSED")}>
                      Close
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
