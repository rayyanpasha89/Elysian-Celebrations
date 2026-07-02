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

type WeddingRow = {
  id: string;
  name: string;
  date: string | null;
  status: string;
  client: Relation<{
    partner_name: string | null;
    user: Relation<{ name: string | null; email: string | null }>;
  }>;
  destination: Relation<{ name: string | null }>;
  days: { id: string }[] | null;
  events: { id: string; estimated_budget: number | null }[] | null;
};

type WeddingSummary = {
  id: string;
  name: string;
  couple: string;
  email: string | null;
  destination: string | null;
  date: string | null;
  status: string;
  dayCount: number;
  eventCount: number;
  plannedBudget: number;
};

type LoadResult =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string }
  | { kind: "ok"; weddings: WeddingSummary[] };

function pickOne<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(raw: string | null) {
  if (!raw) return "Date pending";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  if (amount <= 0) return "No event budgets";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: string) {
  return cn(
    statusBadgeBase,
    status === "PLANNING" && "border-gold-primary/55 text-gold-dark",
    status === "CONFIRMED" && "border-sage/50 text-sage",
    status === "IN_PROGRESS" && "border-info/50 text-info",
    status === "COMPLETED" && "border-charcoal/20 text-slate",
    status === "CANCELLED" && "border-error/40 text-error"
  );
}

async function loadWeddings(): Promise<LoadResult> {
  const session = await getOptionalAuthSession();
  if (!session) return { kind: "unauthenticated" };
  if (session.role !== "manager" && session.role !== "admin") {
    return { kind: "forbidden" };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("weddings")
    .select(
      `id, name, date, status,
       client:client_profiles(partner_name, user:users(name, email)),
       destination:destinations(name),
       days:wedding_days(id),
       events:wedding_events(id, estimated_budget)`
    )
    .order("date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("manager weddings:", error);
    return { kind: "error", message: "Could not load weddings." };
  }

  const weddings = ((data ?? []) as WeddingRow[]).map((row) => {
    const client = pickOne(row.client);
    const user = client ? pickOne(client.user) : null;
    const destination = pickOne(row.destination);
    const events = row.events ?? [];
    return {
      id: row.id,
      name: row.name,
      couple: client?.partner_name?.trim() || user?.name?.trim() || "Couple",
      email: user?.email ?? null,
      destination: destination?.name ?? null,
      date: row.date,
      status: row.status,
      dayCount: row.days?.length ?? 0,
      eventCount: events.length,
      plannedBudget: events.reduce(
        (sum, event) => sum + (event.estimated_budget ?? 0),
        0
      ),
    };
  });

  return { kind: "ok", weddings };
}

export default async function ManagerWeddingsPage() {
  const result = await loadWeddings();
  if (result.kind === "unauthenticated") redirect("/login");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className={dashLabel}>Operations</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Events
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            A read-only operating list of every client event, with day/function depth,
            destination, status, and budget shape visible before you enter the
            bookings command center.
          </p>
        </div>
        <Link href="/manager/bookings" className={dashBtn}>
          Booking command
        </Link>
      </header>

      {result.kind === "forbidden" ? (
        <StateCard title="Manager portal only" body="This page is reserved for manager and admin accounts." />
      ) : null}

      {result.kind === "error" ? (
        <StateCard title="Could not load events" body={result.message} />
      ) : null}

      {result.kind === "ok" ? <WeddingsList weddings={result.weddings} /> : null}
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn(dashCard, "border-dashed border-charcoal/15")}>
      <p className={dashLabel}>{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{body}</p>
    </div>
  );
}

function WeddingsList({ weddings }: { weddings: WeddingSummary[] }) {
  if (weddings.length === 0) {
    return (
      <div className={cn(dashCard, "border-dashed border-gold-primary/40 bg-gold-primary/8")}>
        <p className={cn(dashLabel, "text-gold-dark")}>No events yet</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal">
          New client onboarding records will appear here once a couple creates
          their event. Until then, review incoming inquiries and convert the
          right ones into client accounts.
        </p>
        <Link href="/manager/inquiries" className={cn(dashBtn, "mt-4")}>
          Review inquiries
        </Link>
      </div>
    );
  }

  const activeCount = weddings.filter((wedding) =>
    ["PLANNING", "CONFIRMED", "IN_PROGRESS"].includes(wedding.status)
  ).length;
  const eventCount = weddings.reduce((sum, wedding) => sum + wedding.eventCount, 0);
  const plannedBudget = weddings.reduce(
    (sum, wedding) => sum + wedding.plannedBudget,
    0
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Active events" value={String(activeCount)} />
        <MetricCard label="Planned events" value={String(eventCount)} />
        <MetricCard label="Event budget" value={formatCurrency(plannedBudget)} />
      </div>

      <div className="grid gap-4">
        {weddings.map((wedding) => (
          <WeddingCard key={wedding.id} wedding={wedding} />
        ))}
      </div>
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

function WeddingCard({ wedding }: { wedding: WeddingSummary }) {
  return (
    <article className={dashCard}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xl text-charcoal">{wedding.name}</p>
          <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            {wedding.couple}
            {wedding.destination ? ` · ${wedding.destination}` : ""}
          </p>
          {wedding.email ? (
            <p className="mt-2 text-xs text-slate">{wedding.email}</p>
          ) : null}
        </div>
        <span className={statusClass(wedding.status)}>
          {statusLabel(wedding.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Event date" value={formatDate(wedding.date)} />
        <Tile label="Days" value={String(wedding.dayCount)} />
        <Tile label="Events" value={String(wedding.eventCount)} />
        <Tile label="Event budget" value={formatCurrency(wedding.plannedBudget)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-charcoal/8 pt-4">
        <Link href="/manager/bookings" className={dashBtn}>
          View bookings
        </Link>
        <Link
          href="/manager/messages"
          className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          Message command
        </Link>
      </div>
    </article>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-charcoal/8 bg-cream/30 p-3">
      <p className={dashLabel}>{label}</p>
      <p className="mt-1 text-sm text-charcoal">{value}</p>
    </div>
  );
}
