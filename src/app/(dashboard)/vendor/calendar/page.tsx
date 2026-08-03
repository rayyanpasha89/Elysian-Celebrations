import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalAuthSession } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  dashBtn,
  dashCard,
  dashLabel,
  statusBadgeBase,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null | undefined;

type CalendarBookingRow = {
  id: string;
  status: string;
  event_date: string | null;
  vendor_amount: number | null;
  notes: string | null;
  client: Relation<{
    partner_name: string | null;
    user: Relation<{ name: string | null }>;
  }>;
  service: Relation<{ name: string | null }>;
  wedding_event: Relation<{
    name: string | null;
    event_type: string | null;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    wedding_day: Relation<{ name: string | null; date: string | null }>;
  }>;
};

type CalendarEvent = {
  id: string;
  status: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  couple: string;
  service: string;
  eventName: string;
  eventType: string | null;
  dayName: string | null;
  venue: string | null;
  agreedPayout: number | null;
  notes: string | null;
};

type LoadResult =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "missing-profile" }
  | { kind: "error"; message: string }
  | { kind: "ok"; events: CalendarEvent[] };

const CALENDAR_STATUSES = ["CONFIRMED", "DEPOSIT_PAID"] as const;

function pickOne<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(raw: string | null) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthKey(raw: string | null) {
  if (!raw) return "Unscheduled";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function coupleNameFor(row: CalendarBookingRow) {
  const client = pickOne(row.client);
  const user = client ? pickOne(client.user) : null;
  return client?.partner_name?.trim() || user?.name?.trim() || "Client";
}

async function loadCalendar(): Promise<LoadResult> {
  const session = await getOptionalAuthSession();
  if (!session) return { kind: "unauthenticated" };
  if (session.role !== "vendor") return { kind: "forbidden" };

  const supabase = createAdminSupabaseClient();
  const { data: vendorProfile, error: vendorErr } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (vendorErr) {
    console.error("vendor calendar profile:", vendorErr);
    return { kind: "error", message: "Could not load your vendor profile." };
  }

  if (!vendorProfile) return { kind: "missing-profile" };

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, status, event_date, vendor_amount, notes,
       client:client_profiles(partner_name, user:users(name)),
       service:vendor_services(name),
       wedding_event:wedding_events(name, event_type, date, start_time, end_time, venue, wedding_day:wedding_days(name, date))`
    )
    .eq("vendor_profile_id", vendorProfile.id)
    .in("status", CALENDAR_STATUSES)
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("vendor calendar bookings:", error);
    return { kind: "error", message: "Could not load your calendar." };
  }

  const events = ((data ?? []) as CalendarBookingRow[]).map((row) => {
    const service = pickOne(row.service);
    const event = pickOne(row.wedding_event);
    const day = event ? pickOne(event.wedding_day) : null;
    return {
      id: row.id,
      status: row.status,
      date: row.event_date ?? event?.date ?? null,
      startTime: event?.start_time ?? null,
      endTime: event?.end_time ?? null,
      couple: coupleNameFor(row),
      service: service?.name?.trim() || "Service pending",
      eventName: event?.name?.trim() || "Event details pending",
      eventType: event?.event_type ?? null,
      dayName: day?.name ?? null,
      venue: event?.venue ?? null,
      agreedPayout: row.vendor_amount,
      notes: row.notes,
    };
  });

  return { kind: "ok", events };
}

export default async function VendorCalendarPage() {
  const result = await loadCalendar();
  if (result.kind === "unauthenticated") redirect("/login");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className={dashLabel}>Schedule</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Calendar
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            Confirmed and deposit-paid bookings grouped by event month. Use this
            as the clean operational view before opening the full booking record.
          </p>
        </div>
        <Link href="/vendor/bookings" className={dashBtn}>
          Booking ledger
        </Link>
      </header>

      {result.kind === "forbidden" ? (
        <StateCard title="Vendor portal only" body="This page is reserved for vendor accounts." />
      ) : null}

      {result.kind === "missing-profile" ? (
        <StateCard
          title="Set up your profile first"
          body="Publish your vendor profile and service catalogue before confirmed events can appear here."
          ctaHref="/vendor/profile"
          ctaLabel="Set up profile"
          gold
        />
      ) : null}

      {result.kind === "error" ? (
        <StateCard title="Could not load calendar" body={result.message} />
      ) : null}

      {result.kind === "ok" ? <CalendarList events={result.events} /> : null}
    </div>
  );
}

function StateCard({
  title,
  body,
  ctaHref,
  ctaLabel,
  gold = false,
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={cn(
        dashCard,
        "border-dashed",
        gold ? "border-gold-primary/40 bg-gold-primary/8" : "border-charcoal/15"
      )}
    >
      <p className={cn(dashLabel, gold && "text-gold-dark")}>{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className={cn(dashBtn, "mt-4")}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function CalendarList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <StateCard
        title="No confirmed dates yet"
        body="Open inquiries and legacy pricing handoffs stay in your inquiries page. Once a couple confirms or pays a deposit, the event appears here automatically."
        ctaHref="/vendor/inquiries"
        ctaLabel="Review inquiries"
        gold
      />
    );
  }

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = monthKey(event.date);
    acc[key] = [...(acc[key] ?? []), event];
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Confirmed events" value={String(events.length)} />
        <MetricCard
          label="Deposits paid"
          value={String(events.filter((event) => event.status === "DEPOSIT_PAID").length)}
        />
        <MetricCard
          label="Scheduled"
          value={String(events.filter((event) => event.date).length)}
        />
      </div>

      {Object.entries(grouped).map(([month, monthEvents]) => (
        <section key={month} className="space-y-3">
          <p className={dashLabel}>{month}</p>
          <div className="grid gap-4">
            {monthEvents.map((event) => (
              <CalendarCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={dashCard}>
      <p className={dashLabel}>{label}</p>
      <p className="mt-2 font-display text-3xl text-charcoal">{value}</p>
    </div>
  );
}

function CalendarCard({ event }: { event: CalendarEvent }) {
  return (
    <article className={dashCard}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xl text-charcoal">{event.eventName}</p>
          <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            {event.couple} · {event.service}
          </p>
        </div>
        <span
          className={cn(
            statusBadgeBase,
            event.status === "DEPOSIT_PAID"
              ? "border-sage/50 text-sage"
              : "border-gold-primary/50 text-gold-dark"
          )}
        >
          {event.status === "DEPOSIT_PAID" ? "Deposit paid" : "Confirmed"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Date" value={formatDate(event.date) ?? "Date pending"} />
        <Tile
          label="Time"
          value={
            event.startTime
              ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`
              : "Time pending"
          }
        />
        <Tile label="Day" value={event.dayName ?? event.eventType ?? "Not tagged"} />
        <Tile label="Venue" value={event.venue ?? "Venue pending"} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 pt-4">
        <p className="font-heading text-sm text-slate">
          {event.agreedPayout === null
            ? "Agreed payout pending Elysian"
            : `Agreed payout ${formatCurrency(event.agreedPayout)}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/vendor/messages?bookingId=${event.id}`} className={dashBtn}>
            Message couple
          </Link>
          <Link
            href={`/vendor/bookings?bookingId=${event.id}`}
            className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Open booking
          </Link>
        </div>
      </div>
    </article>
  );
}

function Tile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-charcoal/8 bg-cream/30 p-3">
      <p className={dashLabel}>{label}</p>
      <p className="mt-1 text-sm text-charcoal">{value}</p>
    </div>
  );
}
