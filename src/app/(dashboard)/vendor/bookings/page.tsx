"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Tab = "All" | "Inquiry" | "Confirmed" | "Completed";

type UiStatus = "INQUIRY" | "CONFIRMED" | "COMPLETED";

function mapStatus(raw: string): UiStatus {
  if (raw === "COMPLETED") return "COMPLETED";
  if (raw === "CONFIRMED" || raw === "DEPOSIT_PAID") return "CONFIRMED";
  return "INQUIRY";
}

type ApiBooking = {
  id: string;
  status: string;
  event_date: string | null;
  total_amount: number | null;
  client: { partner_name?: string } | null;
  service: { name?: string } | null;
};

function statusClass(s: UiStatus) {
  if (s === "INQUIRY") return "border-gold-primary/70 text-gold-dark";
  if (s === "CONFIRMED") return "border-sage/70 text-sage";
  return "border-charcoal/40 text-charcoal";
}

const tabs: Tab[] = ["All", "Inquiry", "Confirmed", "Completed"];

export default function VendorBookingsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ApiBooking[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bookings");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) setRows(json.bookings ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => {
    return rows.map((b) => {
      const c = b.client;
      const s = b.service;
      const ui = mapStatus(b.status);
      return {
        id: b.id,
        couple: c?.partner_name ?? "Couple",
        destination: "—",
        eventDate: b.event_date ?? new Date().toISOString(),
        service: s?.name ?? "Service",
        amount: b.total_amount ?? 0,
        status: ui,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    if (tab === "All") return list;
    if (tab === "Inquiry") return list.filter((b) => b.status === "INQUIRY");
    if (tab === "Confirmed") return list.filter((b) => b.status === "CONFIRMED");
    return list.filter((b) => b.status === "COMPLETED");
  }, [tab, list]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-32 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Pipeline</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Bookings</h2>
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
                  "font-accent border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors",
                  active
                    ? "-mb-px border-gold-primary text-charcoal"
                    : "border-transparent text-slate hover:text-charcoal"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState hint="New inquiries will appear here when couples reach out." />
      ) : (
        <ul className="mt-8 list-none space-y-6 pl-0">
          {filtered.map((b) => (
            <motion.li key={b.id} variants={staggerItem} className={dashCard}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                <div>
                  <h3 className="font-display text-xl text-charcoal">{b.couple}</h3>
                  <p className="font-accent mt-2 text-[10px] uppercase tracking-[0.2em] text-slate">
                    {b.destination}
                  </p>
                </div>
                <span className={cn(statusBadgeBase, statusClass(b.status))}>{b.status}</span>
              </div>
              <div className="mt-4 grid gap-2 font-heading text-sm text-slate sm:grid-cols-2">
                <p>
                  <span className={dashLabel}>Date </span>
                  {new Date(b.eventDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p>
                  <span className={dashLabel}>Service </span>
                  {b.service}
                </p>
                <p className="sm:col-span-2">
                  <span className={dashLabel}>Amount </span>
                  ₹{b.amount.toLocaleString("en-IN")}
                </p>
              </div>
              {b.status === "INQUIRY" && (
                <div className="mt-6">
                  <button
                    type="button"
                    className={dashBtn}
                    onClick={() => router.push(`/vendor/messages?bookingId=${b.id}`)}
                  >
                    Respond
                  </button>
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
