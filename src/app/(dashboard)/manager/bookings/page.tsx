"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Tab = "All" | "INQUIRY" | "CONFIRMED" | "COMPLETED";

type BookingRow = {
  id: string;
  status: string;
  event_date: string | null;
  total_amount: number | null;
  notes: string | null;
  client: { partner_name?: string } | null;
  vendor: { business_name?: string } | null;
  service: { name?: string } | null;
};

const tabs: Tab[] = ["All", "INQUIRY", "CONFIRMED", "COMPLETED"];

function statusClass(s: string) {
  if (s === "INQUIRY") return "border-gold-primary/70 text-gold-dark";
  if (s === "CONFIRMED" || s === "DEPOSIT_PAID") return "border-sage/70 text-sage";
  if (s === "COMPLETED") return "border-charcoal/35 text-charcoal";
  return "border-charcoal/25 text-slate";
}

function uiStatus(raw: string): string {
  if (raw === "COMPLETED") return "COMPLETED";
  if (raw === "CONFIRMED" || raw === "DEPOSIT_PAID") return "CONFIRMED";
  return "INQUIRY";
}

export default function ManagerBookingsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([]);

  const loadBookings = async () => {
    const res = await fetch("/api/bookings");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setRows(json.bookings ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadBookings();
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateBooking = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadBookings();
      toast.success("Booking updated");
    } catch {
      toast.error("Failed to update booking");
    }
  };

  const filtered = useMemo(() => {
    if (tab === "All") return rows;
    return rows.filter((b) => uiStatus(b.status) === tab);
  }, [tab, rows]);

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
        <p className={dashLabel}>Operations</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">All Bookings</h2>
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
        <ListEmptyState hint="No bookings found." />
      ) : (
        <ul className="mt-8 list-none space-y-6 pl-0">
          {filtered.map((b) => {
            const client = b.client?.partner_name ?? "Client";
            const vendor = b.vendor?.business_name ?? "Vendor";
            const service = b.service?.name ?? "Service";
            const ui = uiStatus(b.status);

            return (
              <motion.li key={b.id} variants={staggerItem} className={dashCard}>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                  <div>
                    <h3 className="font-display text-xl text-charcoal">{client}</h3>
                    <p className="font-heading mt-1 text-sm text-slate">{vendor} — {service}</p>
                  </div>
                  <span className={cn(statusBadgeBase, statusClass(b.status))}>{ui}</span>
                </div>
                <div className="mt-4 grid gap-2 font-heading text-sm text-slate sm:grid-cols-2">
                  <p>
                    <span className={dashLabel}>Date </span>
                    {b.event_date
                      ? new Date(b.event_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "TBD"}
                  </p>
                  <p>
                    <span className={dashLabel}>Amount </span>
                    ₹{(b.total_amount ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
                {b.notes && (
                  <p className="mt-3 font-heading text-xs text-slate/80">
                    <span className={dashLabel}>Notes: </span>{b.notes}
                  </p>
                )}
                {ui === "INQUIRY" && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className={dashBtn} onClick={() => updateBooking(b.id, "CONFIRMED")}>
                      Confirm
                    </button>
                    <button type="button" className={dashBtn} onClick={() => updateBooking(b.id, "CANCELLED")}>
                      Decline
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
