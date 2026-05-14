"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn, formatCurrency } from "@/lib/utils";

type UiStatus = "INQUIRY" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type Tab = "All" | UiStatus;

type BookingRow = {
  id: string;
  status: string;
  event_date: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  notes: string | null;
  client: { partner_name?: string } | null;
  vendor: { business_name?: string } | null;
  service: {
    name?: string;
    description?: string | null;
    service_scope?: string | null;
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
  estimatedBudget?: number | null;
  day: { name: string | null; date: string | null } | null;
  logistics?: {
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

const tabs: Tab[] = ["All", "INQUIRY", "CONFIRMED", "COMPLETED", "CANCELLED"];

function statusClass(status: UiStatus) {
  return cn(
    statusBadgeBase,
    status === "INQUIRY" && "border-gold-primary/70 text-gold-dark",
    status === "CONFIRMED" && "border-sage/70 text-sage",
    status === "COMPLETED" && "border-charcoal/35 text-charcoal",
    status === "CANCELLED" && "border-error/50 text-error"
  );
}

function uiStatus(raw: string): UiStatus {
  if (raw === "COMPLETED") return "COMPLETED";
  if (raw === "CANCELLED") return "CANCELLED";
  if (raw === "CONFIRMED" || raw === "DEPOSIT_PAID") return "CONFIRMED";
  return "INQUIRY";
}

function displayStatus(status: UiStatus) {
  if (status === "INQUIRY") return "Inquiry";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "COMPLETED") return "Completed";
  return "Cancelled";
}

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "TBD";
}

function itemTypeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ManagerBookingsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(
    () =>
      rows.map((booking) => ({
        ...booking,
        clientName: booking.client?.partner_name ?? "Client",
        vendorName: booking.vendor?.business_name ?? "Vendor",
        serviceName: booking.service?.name ?? "Service",
        ui: uiStatus(booking.status),
      })),
    [rows]
  );

  const filtered = useMemo(() => {
    if (tab === "All") return list;
    return list.filter((booking) => booking.ui === tab);
  }, [tab, list]);

  useEffect(() => {
    if (!selectedBookingId && filtered[0]?.id) {
      setSelectedBookingId(filtered[0].id);
    }
  }, [filtered, selectedBookingId]);

  const selectedBooking =
    list.find((booking) => booking.id === selectedBookingId) ?? filtered[0] ?? null;

  const updateBooking = async (id: string, status: string) => {
    setSavingStatusId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await loadBookings();
      toast.success("Booking updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update booking"
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  const totals = useMemo(
    () => ({
      inquiry: list.filter((booking) => booking.ui === "INQUIRY").length,
      confirmed: list.filter((booking) => booking.ui === "CONFIRMED").length,
      revenue: list.reduce(
        (sum, booking) =>
          booking.ui === "CANCELLED" ? sum : sum + (booking.total_amount ?? 0),
        0
      ),
      due: list.reduce(
        (sum, booking) =>
          booking.ui === "CANCELLED"
            ? sum
            : sum +
              Math.max(0, (booking.total_amount ?? 0) - (booking.paid_amount ?? 0)),
        0
      ),
    }),
    [list]
  );

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
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <p className={dashLabel}>Operations</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Booking Command
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate">
          Watch every client, vendor, event, payment, and service scope from one
          operational control room.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 grid gap-3 md:grid-cols-4">
        <ManagerMetric label="Open inquiries" value={String(totals.inquiry)} />
        <ManagerMetric label="Confirmed" value={String(totals.confirmed)} />
        <ManagerMetric label="Booked value" value={formatCurrency(totals.revenue)} />
        <ManagerMetric label="Due" value={formatCurrency(totals.due)} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {tabs.map((item) => {
            const active = tab === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "font-accent border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors",
                  active
                    ? "-mb-px border-gold-primary text-charcoal"
                    : "border-transparent text-slate hover:text-charcoal"
                )}
              >
                {item === "All" ? "All" : displayStatus(item)}
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          {filtered.length === 0 ? (
            <ListEmptyState
              title="No bookings in this view"
              hint="Switch status tabs or wait for client/vendor activity to arrive."
            />
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
                        {booking.clientName}
                      </h3>
                      <p className="font-heading mt-1 text-sm text-slate">
                        {booking.vendorName} · {booking.serviceName}
                      </p>
                    </div>
                    <span className={statusClass(booking.ui)}>
                      {displayStatus(booking.ui)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 font-heading text-sm text-slate sm:grid-cols-2">
                    <p>
                      <span className={dashLabel}>Event </span>
                      {booking.event_context?.name ?? "Event TBD"}
                    </p>
                    <p>
                      <span className={dashLabel}>Day </span>
                      {booking.event_context?.day?.name ?? "Wedding plan"}
                    </p>
                    <p>
                      <span className={dashLabel}>Date </span>
                      {formatDate(booking.event_date)}
                    </p>
                    <p>
                      <span className={dashLabel}>Amount </span>
                      {formatCurrency(booking.total_amount ?? 0)}
                    </p>
                    <p>
                      <span className={dashLabel}>Venue </span>
                      {booking.event_context?.venue ?? "Venue TBD"}
                    </p>
                    <p>
                      <span className={dashLabel}>Guests </span>
                      {booking.event_context?.guestCount ?? "TBD"}
                    </p>
                  </div>
                  {booking.notes ? (
                    <p className="mt-3 font-heading text-xs text-slate/80">
                      <span className={dashLabel}>Notes: </span>
                      {booking.notes}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={dashBtn}
                      onClick={() => setSelectedBookingId(booking.id)}
                    >
                      Open Brief
                    </button>
                    {booking.ui === "INQUIRY" ? (
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal"
                        disabled={savingStatusId === booking.id}
                        onClick={() => void updateBooking(booking.id, "CONFIRMED")}
                      >
                        Quick confirm
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
            <p className={dashLabel}>Operations brief</p>
            {selectedBooking ? (
              <ManagerBookingBrief
                booking={selectedBooking}
                savingStatus={savingStatusId === selectedBooking.id}
                onStatusChange={(status) =>
                  void updateBooking(selectedBooking.id, status)
                }
              />
            ) : (
              <ListEmptyState
                title="Open a booking"
                hint="Choose a booking to see event details, service scope, logistics, and status controls."
              />
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function ManagerBookingBrief({
  booking,
  savingStatus,
  onStatusChange,
}: {
  booking: BookingRow & {
    clientName: string;
    vendorName: string;
    serviceName: string;
    ui: UiStatus;
  };
  savingStatus: boolean;
  onStatusChange: (status: string) => void;
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
          {displayStatus(booking.ui)}
        </p>
        <h3 className="mt-2 font-display text-2xl text-ivory">
          {booking.clientName}
        </h3>
        <p className="mt-1 text-sm text-ivory/70">
          {booking.vendorName} · {booking.serviceName}
        </p>
        <p className="mt-3 font-accent text-[10px] uppercase tracking-[0.18em] text-gold-light">
          {booking.event_context?.day?.name ?? "Wedding plan"} ·{" "}
          {booking.event_context?.name ?? "Event TBD"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ManagerMetric label="Total" value={formatCurrency(booking.total_amount ?? 0)} />
        <ManagerMetric label="Paid" value={formatCurrency(booking.paid_amount ?? 0)} />
        <ManagerMetric label="Due" value={formatCurrency(remaining)} />
        <ManagerMetric
          label="Event estimate"
          value={formatCurrency(booking.event_context?.estimatedBudget ?? 0)}
        />
      </div>

      {booking.event_context ? (
        <div className="border border-charcoal/8 bg-cream/40 p-4">
          <p className={dashLabel}>Event execution</p>
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
                Logistics
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                Guest arrival{" "}
                {booking.event_context.logistics.guestArrivalTime ?? "TBD"} · Vendor
                load-in{" "}
                {booking.event_context.logistics.vendorLoadInTime ?? "TBD"}
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
          <p className={dashLabel}>Vendor scope</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            {booking.service.service_scope ??
              booking.service.description ??
              "No scope published yet."}
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
          <p className={dashLabel}>Menu context</p>
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
          <p className={dashLabel}>Notes</p>
          <p className="mt-2 text-sm leading-relaxed text-slate">{booking.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-charcoal/8 pt-4">
        {booking.ui === "INQUIRY" ? (
          <>
            <button
              type="button"
              className={dashBtn}
              disabled={savingStatus}
              onClick={() => onStatusChange("CONFIRMED")}
            >
              {savingStatus ? "Saving..." : "Confirm"}
            </button>
            <button
              type="button"
              className="font-accent border border-charcoal/15 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal"
              disabled={savingStatus}
              onClick={() => onStatusChange("CANCELLED")}
            >
              Decline
            </button>
          </>
        ) : null}
        {booking.ui === "CONFIRMED" ? (
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

function ManagerMetric({ label, value }: { label: string; value: string }) {
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
