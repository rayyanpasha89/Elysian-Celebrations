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

type InquiryRow = {
  id: string;
  status: string;
  event_date: string | null;
  notes: string | null;
  created_at: string;
  total_amount: number | null;
  paid_amount: number | null;
  client: {
    partner_name: string | null;
    user: { name: string | null } | null;
  } | null;
  service: { name: string | null } | null;
  wedding_event: {
    name: string | null;
    event_type: string | null;
    date: string | null;
    venue: string | null;
    wedding_day: { name: string | null } | null;
  } | null;
};

type LoadResult =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "missing-profile" }
  | { kind: "error"; message: string }
  | { kind: "ok"; inquiries: InquiryRow[] };

const OPEN_INQUIRY_STATUSES = ["INQUIRY", "QUOTE_SENT"] as const;

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function loadInquiries(): Promise<LoadResult> {
  const session = await getOptionalAuthSession();
  if (!session) return { kind: "unauthenticated" };
  if (session.role !== "vendor") return { kind: "forbidden" };

  const supabase = createAdminSupabaseClient();
  const { data: vp, error: vErr } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (vErr) {
    console.error("inquiries vendor load:", vErr);
    return { kind: "error", message: "Could not load your vendor profile." };
  }
  if (!vp) return { kind: "missing-profile" };

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, status, event_date, notes, created_at, total_amount, paid_amount,
       client:client_profiles(partner_name, user:users(name)),
       service:vendor_services(name),
       wedding_event:wedding_events(name, event_type, date, venue, wedding_day:wedding_days(name))`
    )
    .eq("vendor_profile_id", vp.id)
    .in("status", OPEN_INQUIRY_STATUSES as unknown as string[])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("inquiries query:", error);
    return { kind: "error", message: "Could not load inquiries." };
  }

  const normalised: InquiryRow[] = (data ?? []).map((row) => {
    const client = pickOne(row.client);
    const service = pickOne(row.service);
    const weddingEvent = pickOne(row.wedding_event);
    const weddingDay = weddingEvent ? pickOne(weddingEvent.wedding_day) : null;
    const user = client ? pickOne(client.user) : null;
    return {
      id: row.id,
      status: row.status,
      event_date: row.event_date,
      notes: row.notes,
      created_at: row.created_at,
      total_amount: row.total_amount,
      paid_amount: row.paid_amount,
      client: client
        ? {
            partner_name: client.partner_name ?? null,
            user: user ? { name: user.name ?? null } : null,
          }
        : null,
      service: service ? { name: service.name ?? null } : null,
      wedding_event: weddingEvent
        ? {
            name: weddingEvent.name ?? null,
            event_type: weddingEvent.event_type ?? null,
            date: weddingEvent.date ?? null,
            venue: weddingEvent.venue ?? null,
            wedding_day: weddingDay ? { name: weddingDay.name ?? null } : null,
          }
        : null,
    };
  });

  return { kind: "ok", inquiries: normalised };
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

function relativeAge(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function statusLabel(status: string) {
  if (status === "QUOTE_SENT") return "Quote sent";
  return status
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function coupleLabel(client: InquiryRow["client"]): string {
  if (!client) return "Anonymous couple";
  if (client.partner_name && client.partner_name.trim()) return client.partner_name.trim();
  if (client.user?.name && client.user.name.trim()) return client.user.name.trim();
  return "Anonymous couple";
}

export default async function VendorInquiriesPage() {
  const result = await loadInquiries();
  if (result.kind === "unauthenticated") redirect("/login");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className={dashLabel}>Pipeline</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Inquiries
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            Open bookings awaiting your reply or quote. Confirmed bookings move
            to <Link href="/vendor/bookings" className="text-gold-dark underline-offset-2 hover:underline">your bookings ledger</Link>.
          </p>
        </div>
        <Link href="/vendor/bookings" className={dashBtn}>
          View all bookings
        </Link>
      </header>

      {result.kind === "forbidden" ? (
        <div className={cn(dashCard, "border-dashed border-charcoal/15")}>
          <p className={dashLabel}>Vendor portal only</p>
          <p className="mt-2 text-sm text-slate">
            This page is reserved for vendor accounts.
          </p>
        </div>
      ) : null}

      {result.kind === "missing-profile" ? (
        <div className={cn(dashCard, "border-dashed border-gold-primary/40 bg-gold-primary/8")}>
          <p className={cn(dashLabel, "text-gold-dark")}>What to do next</p>
          <p className="mt-2 font-heading text-sm leading-relaxed text-charcoal">
            Publish your vendor profile and at least one service so couples
            can start sending inquiries.
          </p>
          <Link href="/vendor/profile" className={cn(dashBtn, "mt-4")}>
            Set up your profile
          </Link>
        </div>
      ) : null}

      {result.kind === "error" ? (
        <div className={cn(dashCard, "border-dashed border-error/40")}>
          <p className={dashLabel}>Could not load inquiries</p>
          <p className="mt-2 text-sm text-slate">{result.message}</p>
        </div>
      ) : null}

      {result.kind === "ok" ? <InquiriesList inquiries={result.inquiries} /> : null}
    </div>
  );
}

function InquiriesList({ inquiries }: { inquiries: InquiryRow[] }) {
  if (inquiries.length === 0) {
    return (
      <div className={cn(dashCard, "border-dashed border-gold-primary/30 bg-gold-primary/8")}>
        <p className={cn(dashLabel, "text-gold-dark")}>No open inquiries</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal">
          When couples reach out from your public profile, their request lands
          here. While you wait, tighten your catalogue and profile imagery so
          the next inquiry starts on the strongest footing.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/vendor/services" className={dashBtn}>
            Refine services
          </Link>
          <Link
            href="/vendor/profile"
            className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Polish profile
          </Link>
        </div>
      </div>
    );
  }

  const newInquiries = inquiries.filter((row) => row.status === "INQUIRY");
  const quoted = inquiries.filter((row) => row.status === "QUOTE_SENT");

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="New inquiries" value={String(newInquiries.length)} hint="Awaiting your reply" tone={newInquiries.length > 0 ? "warning" : "neutral"} />
        <MetricCard label="Quotes out" value={String(quoted.length)} hint="Waiting on couple response" />
        <MetricCard label="Open pipeline" value={String(inquiries.length)} hint="Total awaiting decision" />
      </div>

      <ul className="list-none space-y-4 pl-0">
        {inquiries.map((row) => (
          <li key={row.id}>
            <InquiryRowCard row={row} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function InquiryRowCard({ row }: { row: InquiryRow }) {
  const couple = coupleLabel(row.client);
  const eventDate = formatDate(row.event_date) ?? formatDate(row.wedding_event?.date ?? null);
  const eventName = row.wedding_event?.name?.trim() || "Event details pending";
  const dayName = row.wedding_event?.wedding_day?.name?.trim();
  const venue = row.wedding_event?.venue?.trim();
  const serviceName = row.service?.name?.trim() || "Service details pending";

  return (
    <article className={dashCard}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg text-charcoal">{couple}</p>
          <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            {serviceName}
            {dayName ? ` · ${dayName}` : ""}
            {eventDate ? ` · ${eventDate}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              statusBadgeBase,
              row.status === "INQUIRY"
                ? "border-gold-primary/55 text-gold-dark"
                : "border-sage/40 text-sage"
            )}
          >
            {statusLabel(row.status)}
          </span>
          <span className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate/80">
            {relativeAge(row.created_at)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Wedding event" value={eventName} secondary={row.wedding_event?.event_type ?? null} />
        <Tile label="Venue" value={venue ?? "Not shared yet"} />
        <Tile label="Quote" value={row.total_amount ? formatCurrency(row.total_amount) : "Not quoted"} secondary={row.paid_amount && row.total_amount ? `${formatCurrency(row.paid_amount)} paid` : null} />
      </div>

      {row.notes ? (
        <p className="mt-4 border-t border-charcoal/8 pt-4 text-sm leading-relaxed text-charcoal">
          {row.notes}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/vendor/messages?bookingId=${row.id}`}
          className={dashBtn}
        >
          Reply in messages
        </Link>
        <Link
          href={`/vendor/bookings?bookingId=${row.id}`}
          className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          Open booking
        </Link>
      </div>
    </article>
  );
}

function Tile({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string | null;
}) {
  return (
    <div className="border border-charcoal/8 bg-cream/35 p-3">
      <p className={dashLabel}>{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-charcoal">{value}</p>
      {secondary ? (
        <p className="mt-0.5 text-xs text-slate">{secondary}</p>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className={cn(dashCard, "bg-cream/35")}>
      <p className={dashLabel}>{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl",
          tone === "warning" ? "text-gold-dark" : "text-charcoal"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate">{hint}</p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
