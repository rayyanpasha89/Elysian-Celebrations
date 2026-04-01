"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type UiStatus = "PENDING" | "CONFIRMED" | "COMPLETED";
type Tab = "All" | UiStatus;

function mapStatus(raw: string): UiStatus {
  if (raw === "COMPLETED") return "COMPLETED";
  if (raw === "CONFIRMED" || raw === "DEPOSIT_PAID") return "CONFIRMED";
  return "PENDING";
}

type BookingRow = {
  id: string;
  status: string;
  event_date: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  notes: string | null;
  vendor: { business_name?: string; slug?: string } | null;
  service: { name?: string } | null;
};

const tabs: Tab[] = ["All", "PENDING", "CONFIRMED", "COMPLETED"];

function statusClass(s: UiStatus) {
  return cn(
    statusBadgeBase,
    s === "CONFIRMED" && "border-sage/70 text-sage",
    s === "PENDING" && "border-gold-primary/70 text-gold-dark",
    s === "COMPLETED" && "border-charcoal/35 text-charcoal"
  );
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ClientBookingsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bookings");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) setRows((json.bookings ?? []) as BookingRow[]);
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
    return rows.map((booking) => {
      const vendor = booking.vendor;
      const service = booking.service;
      const status = mapStatus(booking.status);
      return {
        ...booking,
        vendorName: vendor?.business_name ?? "Vendor",
        serviceName: service?.name ?? "Service",
        status,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    if (tab === "All") return list;
    return list.filter((booking) => booking.status === tab);
  }, [tab, list]);

  useEffect(() => {
    if (!selectedBookingId && filtered[0]?.id) {
      setSelectedBookingId(filtered[0].id);
    }
  }, [filtered, selectedBookingId]);

  const selectedBooking =
    list.find((booking) => booking.id === selectedBookingId) ?? filtered[0] ?? null;

  useEffect(() => {
    setNotesDraft(selectedBooking?.notes ?? "");
  }, [selectedBooking?.id, selectedBooking?.notes]);

  const saveNotes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBooking) return;

    setSavingNotes(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setRows((current) =>
        current.map((row) =>
          row.id === selectedBooking.id ? { ...row, notes: notesDraft } : row
        )
      );
    } catch {
      // Keep the page honest without a loud UX penalty if this fails.
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="grid min-h-[420px] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-72 border border-charcoal/8 bg-charcoal/5" />
          <div className="h-72 border border-charcoal/8 bg-charcoal/5" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <p className={dashLabel}>Reservations</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Bookings
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate">
          Every booking now opens a real detail surface with notes, payment context,
          and a cleaner status view so the page feels useful instead of decorative.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {tabs.map((t) => {
            const active = tab === t;
            const label =
              t === "All"
                ? "All"
                : t === "PENDING"
                  ? "Pending"
                  : t === "CONFIRMED"
                    ? "Confirmed"
                    : "Completed";
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
                {label}
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {filtered.length === 0 ? (
            <ListEmptyState hint="Book a vendor from the Vendors page to see reservations here." />
          ) : (
            <ul className="list-none space-y-6 pl-0">
              {filtered.map((booking) => (
                <motion.li
                  key={booking.id}
                  variants={staggerItem}
                  className={cn(
                    dashCard,
                    "border transition-all duration-300",
                    selectedBooking?.id === booking.id
                      ? "border-gold-primary/45 shadow-[0_20px_50px_rgba(201,169,110,0.12)]"
                      : "border-charcoal/8"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                    <div>
                      <h3 className="font-display text-xl text-charcoal">
                        {booking.vendorName}
                      </h3>
                      <p className="font-heading mt-2 text-sm text-slate">
                        {booking.serviceName}
                      </p>
                    </div>
                    <span className={statusClass(booking.status)}>{booking.status}</span>
                  </div>

                  <div className="mt-4 grid gap-3 font-heading text-sm text-charcoal sm:grid-cols-2">
                    <p>
                      <span className={dashLabel}>Date </span>
                      {booking.event_date
                        ? new Date(booking.event_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Date TBD"}
                    </p>
                    <p>
                      <span className={dashLabel}>Amount </span>
                      {formatCurrency(booking.total_amount ?? 0)}
                    </p>
                    <p>
                      <span className={dashLabel}>Paid </span>
                      {formatCurrency(booking.paid_amount ?? 0)}
                    </p>
                    <p className="sm:col-span-2">
                      <span className={dashLabel}>Notes </span>
                      {booking.notes?.trim() || "No notes captured yet."}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={dashBtn}
                      onClick={() => setSelectedBookingId(booking.id)}
                    >
                      View Details
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <aside className="self-start">
          <div className="sticky top-6 border border-charcoal/8 bg-ivory p-5">
            <p className={dashLabel}>Booking details</p>
            {selectedBooking ? (
              <div className="mt-4 space-y-5">
                <div className="border border-charcoal/10 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.16),transparent_32%),linear-gradient(155deg,#111827_0%,#1f2937_55%,#0b1220_100%)] px-4 py-5 text-ivory">
                  <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/60">
                    {selectedBooking.status}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-ivory">
                    {selectedBooking.vendorName}
                  </h3>
                  <p className="mt-1 text-sm text-ivory/70">
                    {selectedBooking.serviceName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DetailMetric label="Event date" value={selectedBooking.event_date ? new Date(selectedBooking.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date TBD"} />
                  <DetailMetric label="Total" value={formatCurrency(selectedBooking.total_amount ?? 0)} />
                  <DetailMetric label="Paid" value={formatCurrency(selectedBooking.paid_amount ?? 0)} />
                  <DetailMetric label="Remaining" value={formatCurrency(Math.max(0, (selectedBooking.total_amount ?? 0) - (selectedBooking.paid_amount ?? 0)))} />
                </div>

                <div>
                  <p className={dashLabel}>Notes</p>
                  <form onSubmit={saveNotes} className="mt-3 space-y-3">
                    <textarea
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      placeholder="Capture timing, guest count, vendor instructions, or follow-up details."
                      className="min-h-[140px] w-full border border-charcoal/12 bg-transparent px-3 py-3 text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
                    />
                    <button
                      type="submit"
                      disabled={savingNotes}
                      className={cn(
                        "font-accent inline-flex items-center justify-center border px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] transition-all duration-500",
                        savingNotes
                          ? "border-charcoal/10 text-slate"
                          : "border-gold-primary text-gold-primary hover:bg-gold-primary hover:text-midnight"
                      )}
                    >
                      {savingNotes ? "Saving..." : "Save note"}
                    </button>
                  </form>
                </div>

                <div className="border border-charcoal/8 bg-cream/40 p-4">
                  <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                    Context
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate">
                    {selectedBooking.notes?.trim()
                      ? "This note is editable from here, so the booking stays useful as details change."
                      : "Use this panel to keep booking context in one place as the event gets closer."}
                  </p>
                </div>
              </div>
            ) : (
              <ListEmptyState
                title="Open a booking"
                hint="Choose a booking to see vendor, payment, and note details here."
              />
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-charcoal/8 bg-cream/40 p-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
        {label}
      </p>
      <p className="mt-2 font-display text-lg text-charcoal">{value}</p>
    </div>
  );
}
