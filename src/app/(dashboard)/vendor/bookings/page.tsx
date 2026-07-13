"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn, formatCurrency } from "@/lib/utils";

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
  paid_amount: number | null;
  notes: string | null;
  client: {
    partner_name?: string;
    weddings?: { destination?: { name?: string } | null }[] | null;
  } | null;
  service: {
    name?: string;
    description?: string | null;
    service_scope?: string | null;
    base_price?: number | null;
    max_price?: number | null;
    unit?: string | null;
    inclusions?: string[] | null;
    deliverables?: string[] | null;
    add_ons?: string[] | null;
    items?: {
      id: string;
      item_type: string;
      name: string;
      description: string | null;
      dietary_tags: string[] | null;
      sort_order: number | null;
    }[] | null;
  } | null;
  event_context: BookingEventContext | null;
};

type BookingEventContext = {
  name: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  guestCount: number | null;
  day: { name: string | null; date: string | null } | null;
  logistics: {
    guestArrivalTime: string | null;
    vendorLoadInTime: string | null;
    familyCallTime: string | null;
    transportNotes: string | null;
    roomingNotes?: string | null;
    weatherPlan: string | null;
    ceremonyNotes?: string | null;
  } | null;
  menus?: {
    id: string;
    name: string;
    mealPeriod: string | null;
    serviceStyle: string | null;
    notes?: string | null;
    items: {
      id: string;
      name: string;
      course: string | null;
      dietaryTags?: string[];
      notes?: string | null;
    }[];
  }[];
};

function statusClass(s: UiStatus) {
  if (s === "INQUIRY") return "border-gold-primary/70 text-gold-dark";
  if (s === "CONFIRMED") return "border-sage/70 text-sage";
  return "border-charcoal/40 text-charcoal";
}

const tabs: Tab[] = ["All", "Inquiry", "Confirmed", "Completed"];

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date TBD";
}

function displayStatus(status: UiStatus) {
  if (status === "INQUIRY") return "Inquiry";
  if (status === "CONFIRMED") return "Confirmed";
  return "Completed";
}

function itemTypeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function VendorBookingsPage() {
  const searchParams = useSearchParams();
  const requestedBookingId = searchParams.get("bookingId");
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ApiBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const router = useRouter();

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
      const destName = c?.weddings?.[0]?.destination?.name ?? null;
      return {
        id: b.id,
        raw: b,
        couple: c?.partner_name ?? "Couple",
        destination: destName ?? "—",
        eventDate: b.event_date,
        eventName: b.event_context?.name ?? "Event TBD",
        eventDay: b.event_context?.day?.name ?? "Wedding plan",
        venue: b.event_context?.venue ?? null,
        guestCount: b.event_context?.guestCount ?? null,
        vendorLoadInTime: b.event_context?.logistics?.vendorLoadInTime ?? null,
        service: s?.name ?? "Service",
        amount: b.total_amount ?? 0,
        paid: b.paid_amount ?? 0,
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

  // Inquiries, calendar, and messages deep-link here. Always honour that
  // booking first instead of silently opening the first row in the ledger.
  useEffect(() => {
    if (!requestedBookingId || !list.some((booking) => booking.id === requestedBookingId)) {
      return;
    }

    setTab("All");
    setSelectedBookingId(requestedBookingId);
  }, [list, requestedBookingId]);

  useEffect(() => {
    if (!selectedBookingId && filtered[0]?.id) {
      setSelectedBookingId(filtered[0].id);
    }
  }, [filtered, selectedBookingId]);

  const selectedBooking =
    list.find((booking) => booking.id === selectedBookingId) ?? filtered[0] ?? null;

  const updateBookingStatus = async (id: string, status: string) => {
    setStatusSavingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await loadBookings();
      toast.success("Booking status updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update booking"
      );
    } finally {
      setStatusSavingId(null);
    }
  };

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

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          {filtered.length === 0 ? (
            <ListEmptyState hint="New inquiries will appear here when couples reach out." />
          ) : (
            <ul className="list-none space-y-6 pl-0">
              {filtered.map((b) => (
                <motion.li
                  key={b.id}
                  variants={staggerItem}
                  className={cn(
                    dashCard,
                    "border transition-all duration-300",
                    selectedBooking?.id === b.id
                      ? "border-gold-primary/45 shadow-[0_20px_50px_rgba(201,169,110,0.12)]"
                      : "border-charcoal/8"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-4">
                    <div>
                      <h3 className="font-display text-xl text-charcoal">{b.couple}</h3>
                      <p className="font-accent mt-2 text-[10px] uppercase tracking-[0.2em] text-slate">
                        {b.destination}
                      </p>
                    </div>
                    <span className={cn(statusBadgeBase, statusClass(b.status))}>
                      {displayStatus(b.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 font-heading text-sm text-slate sm:grid-cols-2">
                    <p>
                      <span className={dashLabel}>Event </span>
                      {b.eventName}
                    </p>
                    <p>
                      <span className={dashLabel}>Day </span>
                      {b.eventDay}
                    </p>
                    <p>
                      <span className={dashLabel}>Date </span>
                      {formatDate(b.eventDate)}
                    </p>
                    <p>
                      <span className={dashLabel}>Service </span>
                      {b.service}
                    </p>
                    <p>
                      <span className={dashLabel}>Venue </span>
                      {b.venue ?? "Venue TBD"}
                    </p>
                    <p>
                      <span className={dashLabel}>Guest count </span>
                      {b.guestCount ?? "TBD"}
                    </p>
                    <p>
                      <span className={dashLabel}>Amount </span>
                      {formatCurrency(b.amount)}
                    </p>
                    <p>
                      <span className={dashLabel}>Paid </span>
                      {formatCurrency(b.paid)}
                    </p>
                    {b.vendorLoadInTime ? (
                      <p className="sm:col-span-2">
                        <span className={dashLabel}>Vendor load-in </span>
                        {b.vendorLoadInTime}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={dashBtn}
                      onClick={() => setSelectedBookingId(b.id)}
                    >
                      Open Brief
                    </button>
                    {b.status === "INQUIRY" ? (
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal"
                        onClick={() => router.push(`/vendor/messages?bookingId=${b.id}`)}
                      >
                        Respond
                      </button>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <aside className="self-start">
          <div className="sticky top-6 border border-charcoal/8 bg-ivory p-5">
            <p className={dashLabel}>Vendor brief</p>
            {selectedBooking ? (
              <VendorBookingBrief
                booking={selectedBooking.raw}
                uiStatus={selectedBooking.status}
                savingStatus={statusSavingId === selectedBooking.id}
                onStatusChange={(status) =>
                  void updateBookingStatus(selectedBooking.id, status)
                }
                onRespond={() =>
                  router.push(`/vendor/messages?bookingId=${selectedBooking.id}`)
                }
              />
            ) : (
              <ListEmptyState
                title="Open a booking"
                hint="Choose an inquiry to see event timing, service scope, menus, and action buttons."
              />
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function VendorBookingBrief({
  booking,
  uiStatus,
  savingStatus,
  onStatusChange,
  onRespond,
}: {
  booking: ApiBooking;
  uiStatus: UiStatus;
  savingStatus: boolean;
  onStatusChange: (status: string) => void;
  onRespond: () => void;
}) {
  const serviceItems = (booking.service?.items ?? [])
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const remaining = Math.max(
    0,
    (booking.total_amount ?? 0) - (booking.paid_amount ?? 0)
  );

  return (
    <div className="mt-4 space-y-5">
      <div className="border border-charcoal/10 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.16),transparent_32%),linear-gradient(155deg,#111827_0%,#1f2937_55%,#0b1220_100%)] px-4 py-5 text-ivory">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/60">
          {displayStatus(uiStatus)}
        </p>
        <h3 className="mt-2 font-display text-2xl text-ivory">
          {booking.client?.partner_name ?? "Couple"}
        </h3>
        <p className="mt-1 text-sm text-ivory/70">
          {booking.event_context?.day?.name ?? "Wedding plan"} ·{" "}
          {booking.event_context?.name ?? "Event TBD"}
        </p>
        <p className="mt-3 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-light">
          {booking.service?.name ?? "Service"} · {formatDate(booking.event_date)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BriefMetric label="Total" value={formatCurrency(booking.total_amount ?? 0)} />
        <BriefMetric label="Remaining" value={formatCurrency(remaining)} />
      </div>

      {booking.event_context ? (
        <div className="border border-charcoal/8 bg-cream/40 p-4">
          <p className={dashLabel}>Event context</p>
          <div className="mt-3 grid gap-2 text-sm text-slate">
            <p>
              <span className="text-charcoal">Venue:</span>{" "}
              {booking.event_context.venue ?? "Venue TBD"}
            </p>
            <p>
              <span className="text-charcoal">Timing:</span>{" "}
              {booking.event_context.startTime ?? "Start TBD"}
              {booking.event_context.endTime
                ? ` - ${booking.event_context.endTime}`
                : ""}
            </p>
            <p>
              <span className="text-charcoal">Guests:</span>{" "}
              {booking.event_context.guestCount ?? "Guest count TBD"}
            </p>
          </div>
          {booking.event_context.logistics ? (
            <div className="mt-4 border-t border-charcoal/8 pt-3">
              <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                Load-in and logistics
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                Vendor load-in{" "}
                {booking.event_context.logistics.vendorLoadInTime ?? "TBD"}
                {booking.event_context.logistics.transportNotes
                  ? ` · Transport: ${booking.event_context.logistics.transportNotes}`
                  : ""}
                {booking.event_context.logistics.weatherPlan
                  ? ` · Backup: ${booking.event_context.logistics.weatherPlan}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {booking.service ? (
        <div className="border border-charcoal/8 bg-cream/35 p-4">
          <p className={dashLabel}>Service scope</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            {booking.service.service_scope ??
              booking.service.description ??
              "No service scope has been published yet."}
          </p>
          <BriefChipRow label="Includes" items={booking.service.inclusions ?? []} />
          <BriefChipRow
            label="Deliverables"
            items={booking.service.deliverables ?? []}
          />
          {serviceItems.length > 0 ? (
            <div className="mt-4 border-t border-charcoal/8 pt-3">
              <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                Catalogue rows
              </p>
              <ul className="mt-2 list-none space-y-2 pl-0">
                {serviceItems.slice(0, 6).map((item) => (
                  <li key={item.id} className="border border-charcoal/8 bg-ivory p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-heading text-xs text-charcoal">{item.name}</p>
                      <p className="font-accent text-[9px] uppercase tracking-[0.14em] text-gold-dark">
                        {itemTypeLabel(item.item_type)}
                      </p>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-slate">
                        {item.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {booking.event_context?.menus?.length ? (
        <div className="border border-charcoal/8 bg-cream/35 p-4">
          <p className={dashLabel}>Menu and run sheet hints</p>
          <ul className="mt-3 list-none space-y-3 pl-0">
            {booking.event_context.menus.slice(0, 2).map((menu) => (
              <li key={menu.id} className="text-sm leading-relaxed text-slate">
                <span className="text-charcoal">{menu.name}</span>
                {menu.items.length > 0
                  ? ` · ${menu.items
                      .slice(0, 4)
                      .map((item) => item.name)
                      .join(", ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {booking.notes ? (
        <div className="border border-charcoal/8 bg-cream/35 p-4">
          <p className={dashLabel}>Client notes</p>
          <p className="mt-2 text-sm leading-relaxed text-slate">{booking.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-charcoal/8 pt-4">
        {uiStatus === "INQUIRY" ? (
          <>
            <button
              type="button"
              className={dashBtn}
              disabled={savingStatus}
              onClick={() => onStatusChange("QUOTE_SENT")}
            >
              {savingStatus ? "Saving..." : "Mark quote sent"}
            </button>
            <button
              type="button"
              className="font-accent border border-charcoal/15 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal"
              onClick={onRespond}
            >
              Respond
            </button>
          </>
        ) : null}
        {uiStatus === "CONFIRMED" ? (
          <button
            type="button"
            className={dashBtn}
            disabled={savingStatus}
            onClick={() => onStatusChange("COMPLETED")}
          >
            {savingStatus ? "Saving..." : "Mark completed"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-charcoal/8 bg-cream/40 p-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
        {label}
      </p>
      <p className="mt-2 font-display text-lg text-charcoal">{value}</p>
    </div>
  );
}

function BriefChipRow({ label, items }: { label: string; items: string[] }) {
  const visibleItems = items.filter(Boolean).slice(0, 6);
  if (visibleItems.length === 0) return null;

  return (
    <div className="mt-3 border-t border-charcoal/8 pt-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <span
            key={`${label}-${item}`}
            className="border border-charcoal/10 bg-ivory px-2 py-1 font-heading text-[11px] text-charcoal"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
