"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type AdminDashboardPayload = {
  usersByRole: { client: number; vendor: number; manager: number; admin: number };
  weddingsCount: number;
  bookingsByStatus: Record<string, number>;
  newContactInquiries: number;
  pendingVendors: { id: string; name: string; category: string; date: string }[];
  pendingVendorCount: number;
  recentContactInquiries: {
    id: string;
    name: string;
    email: string;
    destination: string | null;
    status: string;
    createdAt: string;
    preview: string;
  }[];
  subtitle?: string;
};

type AdminVendorRow = {
  id: string;
  businessName: string;
  isVerified: boolean;
  isFeatured: boolean;
  serviceCount: number;
};

type AdminVenueRow = {
  id: string;
  name: string;
  capacity: number | null;
  isActive: boolean;
  destination: string;
};

type AdminBooking = {
  id: string;
  status: string;
  finalPrice: number | null;
  pricePublished: boolean;
};

type AdminEvent = {
  id: string;
  name: string;
  venue: string | null;
  guestCount: number | null;
  startTime: string | null;
  endTime: string | null;
  readiness: number;
  bookings: AdminBooking[];
};

type AdminDay = { id: string; name: string; date: string | null; events: AdminEvent[] };

type AdminOpsClient = {
  id: string;
  name: string;
  email: string | null;
  wedding: { id: string; name: string; date: string | null } | null;
  readiness: { percent: number; eventCount: number; eventsReady: number };
  totals: { bookingCount: number; pricedCount: number };
  days: AdminDay[];
};

type AdminPricingPayload = { clients?: AdminOpsClient[] };
type AdminVenuesPayload = { venues?: AdminVenueRow[] };
type AdminVendorsPayload = { vendors?: AdminVendorRow[] };

type AdminDashboardState = {
  summary: AdminDashboardPayload;
  clients: AdminOpsClient[];
  venues: AdminVenueRow[];
  vendors: AdminVendorRow[];
  warnings: string[];
};

type WorkQueue = {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  tone: "attention" | "warn" | "steady";
};

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? `Failed to load ${url}`);
  }
  return json as T;
}

function summarize(data: AdminDashboardState) {
  const { summary, clients, venues, vendors } = data;
  const totalUsers =
    summary.usersByRole.client +
    summary.usersByRole.vendor +
    (summary.usersByRole.manager ?? 0) +
    (summary.usersByRole.admin ?? 0);
  const totalBookings = Object.values(summary.bookingsByStatus).reduce((sum, count) => sum + count, 0);
  const activeBookings =
    (summary.bookingsByStatus.CONFIRMED ?? 0) +
    (summary.bookingsByStatus.DEPOSIT_PAID ?? 0) +
    (summary.bookingsByStatus.INQUIRY ?? 0);

  const clientsWithPlans = clients.filter((client) => client.wedding);
  const clientsWithFunctions = clientsWithPlans.filter((client) => client.readiness.eventCount > 0);
  const totalFunctions = clients.reduce((sum, client) => sum + client.readiness.eventCount, 0);
  const readyFunctions = clients.reduce((sum, client) => sum + client.readiness.eventsReady, 0);
  const totalPlanDays = clients.reduce((sum, client) => sum + client.days.length, 0);
  const readyPlans = clientsWithPlans.filter((client) => client.readiness.percent >= 100).length;
  const stalledPlans = clientsWithPlans.filter((client) => client.readiness.eventCount === 0).length;
  const inProgressPlans = clientsWithPlans.filter(
    (client) => client.readiness.eventCount > 0 && client.readiness.percent < 100
  ).length;
  const averageReadiness =
    clientsWithFunctions.length > 0
      ? Math.round(
          clientsWithFunctions.reduce((sum, client) => sum + client.readiness.percent, 0) /
            clientsWithFunctions.length
        )
      : 0;
  const functionReadiness = percent(readyFunctions, totalFunctions);

  const vendorProfiles = vendors.length;
  const verifiedVendors = vendors.filter((vendor) => vendor.isVerified).length;
  const featuredVendors = vendors.filter((vendor) => vendor.isFeatured).length;
  const pendingVendorApprovals =
    vendorProfiles > 0 ? vendorProfiles - verifiedVendors : summary.pendingVendorCount;
  const vendorServices = vendors.reduce((sum, vendor) => sum + vendor.serviceCount, 0);

  const activeVenues = venues.filter((venue) => venue.isActive).length;
  const venuesWithCapacity = venues.filter((venue) => venue.capacity != null).length;

  const vendorPicks = clients.reduce((sum, client) => sum + client.totals.bookingCount, 0);
  const pricedPicks = clients.reduce((sum, client) => sum + client.totals.pricedCount, 0);
  const unpricedPicks = Math.max(0, vendorPicks - pricedPicks);

  const weakestPlan =
    [...clientsWithFunctions]
      .filter((client) => client.readiness.percent < 100)
      .sort((a, b) => a.readiness.percent - b.readiness.percent)[0] ?? null;

  const healthInputs = [
    totalFunctions > 0 ? functionReadiness : null,
    vendorProfiles > 0 ? percent(verifiedVendors, vendorProfiles) : pendingVendorApprovals > 0 ? 50 : null,
    venues.length > 0 ? percent(activeVenues, venues.length) : null,
    vendorPicks > 0 ? percent(pricedPicks, vendorPicks) : null,
    summary.newContactInquiries === 0 ? 100 : summary.newContactInquiries <= 3 ? 70 : 40,
  ].filter((value): value is number => value != null);
  const opsHealth =
    healthInputs.length > 0
      ? Math.round(healthInputs.reduce((sum, value) => sum + value, 0) / healthInputs.length)
      : 0;

  const bookingStatuses = ["INQUIRY", "CONFIRMED", "DEPOSIT_PAID", "COMPLETED"].map((status) => ({
    status,
    label: statusLabel(status),
    value: summary.bookingsByStatus[status] ?? 0,
  }));

  const workQueues: WorkQueue[] = [
    {
      label: "Event plans needing detail",
      value: stalledPlans + inProgressPlans,
      detail:
        stalledPlans + inProgressPlans > 0
          ? "Prioritize client plans that are not at 100% readiness."
          : "Every loaded event plan is ready for handoff.",
      href: "/admin/progress",
      tone: stalledPlans + inProgressPlans > 0 ? "warn" : "steady",
    },
    {
      label: "Vendor picks to price",
      value: unpricedPicks,
      detail:
        unpricedPicks > 0
          ? `${pricedPicks}/${vendorPicks} vendor picks have final prices.`
          : "No pricing handoff gaps in the loaded event plans.",
      href: "/admin/pricing",
      tone: unpricedPicks > 0 ? "attention" : "steady",
    },
    {
      label: "Vendor approvals",
      value: pendingVendorApprovals,
      detail:
        pendingVendorApprovals > 0
          ? "Review applications before clients add them to functions."
          : "No vendor applications are waiting on admin review.",
      href: "/admin/vendors",
      tone: pendingVendorApprovals > 0 ? "attention" : "steady",
    },
    {
      label: "New inquiries",
      value: summary.newContactInquiries,
      detail:
        summary.newContactInquiries > 0
          ? "Respond while intent is fresh and route viable leads to setup."
          : "Lead inbox is clear for now.",
      href: "/admin/inquiries",
      tone: summary.newContactInquiries > 0 ? "attention" : "steady",
    },
  ];

  return {
    totalUsers,
    totalBookings,
    activeBookings,
    clientsWithPlans,
    clientsWithFunctions,
    totalFunctions,
    readyFunctions,
    totalPlanDays,
    readyPlans,
    stalledPlans,
    inProgressPlans,
    averageReadiness,
    functionReadiness,
    vendorProfiles,
    verifiedVendors,
    featuredVendors,
    pendingVendorApprovals,
    vendorServices,
    activeVenues,
    venuesWithCapacity,
    vendorPicks,
    pricedPicks,
    unpricedPicks,
    weakestPlan,
    opsHealth,
    bookingStatuses,
    workQueues,
  };
}

function healthCopy(score: number) {
  if (score >= 80) return { label: "Ready", className: "border-sage/45 bg-sage/10 text-sage" };
  if (score >= 50) return { label: "Watch", className: "border-gold-primary/45 bg-gold-primary/10 text-gold-dark" };
  return { label: "Setup", className: "border-rose/45 bg-rose/10 text-rose" };
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="border border-charcoal/8 bg-midnight p-8 text-ivory">
        <div className="h-3 w-36 bg-ivory/15" />
        <div className="mt-6 h-10 w-72 bg-ivory/15" />
        <div className="mt-4 h-4 w-full max-w-xl bg-ivory/10" />
        <div className="mt-8 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 w-32 border border-ivory/10 bg-ivory/5" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["Event plans", "Vendors", "Venues", "Inquiries", "Ops health"].map((label) => (
          <div key={label} className="border border-charcoal/8 bg-ivory p-5">
            <p className={dashLabel}>{label}</p>
            <div className="mt-5 h-9 w-16 bg-charcoal/10" />
            <div className="mt-4 h-3 w-32 bg-charcoal/10" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-80 border border-charcoal/8 bg-charcoal/5 lg:col-span-3" />
        <div className="h-80 border border-charcoal/8 bg-charcoal/5 lg:col-span-2" />
      </div>
      <p className="text-center font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
        Loading live operations, readiness, venues, and lead queues...
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-3xl border border-rose/25 bg-ivory p-8 text-charcoal">
      <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-rose">
        Admin summary unavailable
      </p>
      <h1 className="mt-3 font-display text-3xl text-charcoal">The operations cockpit could not load.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        {message}. The dashboard needs the core admin summary before it can show event, vendor,
        venue, and inquiry health.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 font-accent border border-rose/35 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-rose transition-colors hover:bg-rose hover:text-ivory"
      >
        Retry dashboard
      </button>
    </div>
  );
}

function EmptyPanel({
  title,
  detail,
  cta,
  href,
}: {
  title: string;
  detail: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="border border-dashed border-charcoal/15 bg-cream/35 px-5 py-8 text-center">
      <p className="font-display text-lg text-charcoal">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">{detail}</p>
      <Link
        href={href}
        className="mt-5 inline-flex font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
      >
        {cta}
      </Link>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  href,
  eyebrow,
  highlight,
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  eyebrow: string;
  highlight?: boolean;
}) {
  return (
    <motion.div variants={staggerItem}>
      <Link
        href={href}
        className={cn(
          "group block h-full border bg-ivory p-5 transition-all hover:-translate-y-0.5 hover:border-gold-primary/45 hover:shadow-[0_18px_42px_rgba(51,61,41,0.08)]",
          highlight ? "border-gold-primary/45" : "border-charcoal/8"
        )}
      >
        <p className={dashLabel}>{eyebrow}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="font-display text-4xl font-semibold leading-none text-charcoal">{value}</p>
          <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate transition-colors group-hover:text-gold-dark">
            Open
          </span>
        </div>
        <h3 className="mt-4 font-heading text-sm font-medium text-charcoal">{label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate">{detail}</p>
      </Link>
    </motion.div>
  );
}

function QueueCard({ queue }: { queue: WorkQueue }) {
  return (
    <Link
      href={queue.href}
      className={cn(
        "block border p-4 transition-colors hover:border-gold-primary/45",
        queue.tone === "attention" && "border-gold-primary/45 bg-gold-primary/10",
        queue.tone === "warn" && "border-rose/25 bg-rose/5",
        queue.tone === "steady" && "border-charcoal/8 bg-ivory"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={dashLabel}>{queue.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate">{queue.detail}</p>
        </div>
        <p
          className={cn(
            "font-display text-3xl leading-none",
            queue.tone === "attention" && "text-gold-dark",
            queue.tone === "warn" && "text-rose",
            queue.tone === "steady" && "text-charcoal"
          )}
        >
          {queue.value}
        </p>
      </div>
    </Link>
  );
}

function ProgressBar({ value, tone = "gold" }: { value: number; tone?: "gold" | "sage" | "rose" }) {
  return (
    <div className="h-2 border border-charcoal/10 bg-cream">
      <div
        className={cn(
          "h-full transition-all duration-700",
          tone === "gold" && "bg-gold-primary",
          tone === "sage" && "bg-sage",
          tone === "rose" && "bg-rose"
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryResult, pricingResult, venuesResult, vendorsResult] = await Promise.allSettled([
          getJson<AdminDashboardPayload>("/api/dashboard/admin"),
          getJson<AdminPricingPayload>("/api/admin/pricing"),
          getJson<AdminVenuesPayload>("/api/admin/venues"),
          getJson<AdminVendorsPayload>("/api/admin/vendors"),
        ]);

        if (cancelled) return;

        if (summaryResult.status === "rejected") {
          throw summaryResult.reason;
        }

        const warnings: string[] = [];
        if (pricingResult.status === "rejected") {
          warnings.push(`Event readiness unavailable: ${errorMessage(pricingResult.reason)}`);
        }
        if (venuesResult.status === "rejected") {
          warnings.push(`Venue catalogue unavailable: ${errorMessage(venuesResult.reason)}`);
        }
        if (vendorsResult.status === "rejected") {
          warnings.push(`Vendor network unavailable: ${errorMessage(vendorsResult.reason)}`);
        }

        setData({
          summary: summaryResult.value,
          clients: pricingResult.status === "fulfilled" ? pricingResult.value.clients ?? [] : [],
          venues: venuesResult.status === "fulfilled" ? venuesResult.value.venues ?? [] : [],
          vendors: vendorsResult.status === "fulfilled" ? vendorsResult.value.vendors ?? [] : [],
          warnings,
        });
      } catch (caught) {
        if (!cancelled) {
          setData(null);
          setError(errorMessage(caught));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const ops = useMemo(() => (data ? summarize(data) : null), [data]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />;
  if (!data || !ops) return <DashboardSkeleton />;

  const health = healthCopy(ops.opsHealth);
  const primaryCta =
    data.summary.newContactInquiries > 0
      ? { label: `Review ${data.summary.newContactInquiries} new inquiries`, href: "/admin/inquiries" }
      : ops.unpricedPicks > 0
        ? { label: "Open pricing handoff", href: "/admin/pricing" }
        : ops.clientsWithPlans.length > 0
          ? { label: "Review event readiness", href: "/admin/progress" }
          : { label: "Open client directory", href: "/admin/clients" };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-6xl space-y-6"
    >
      <motion.section variants={fadeUp} className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-8 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="max-w-2xl">
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
              Event operations
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-ivory md:text-5xl">
              Admin operations cockpit
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ivory/70 md:text-base">
              Track event plans, function readiness, vendor approvals, venue coverage, and lead response
              from the same flow clients use to build their celebration.
            </p>
          </div>
          <div className="min-w-[13rem] border border-ivory/10 bg-ivory/[0.04] p-5 text-right">
            <span className={cn(statusBadgeBase, health.className)}>{health.label}</span>
            <p className="mt-4 font-display text-6xl leading-none text-gold-primary">{ops.opsHealth}%</p>
            <p className="mt-2 font-accent text-[10px] uppercase tracking-[0.18em] text-ivory/55">
              ops health
            </p>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 border-t border-ivory/10 p-3 md:px-8">
          <Link
            href={primaryCta.href}
            className="font-accent border border-gold-primary bg-gold-primary px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-midnight transition-colors hover:border-gold-dark hover:bg-gold-dark"
          >
            {primaryCta.label}
          </Link>
          {[
            { label: "Event plans", href: "/admin/progress" },
            { label: "Pricing board", href: "/admin/pricing" },
            { label: "Vendors", href: "/admin/vendors" },
            { label: "Venues", href: "/admin/venues" },
            { label: "Analytics", href: "/admin/analytics" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="font-accent border border-ivory/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-ivory/80 transition-colors hover:border-gold-primary hover:text-gold-primary"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </motion.section>

      {data.warnings.length > 0 ? (
        <motion.div variants={fadeUp} className="border border-gold-primary/25 bg-gold-primary/10 p-4">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
            Partial operations data
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            The core dashboard loaded, but some supporting cards are using fallback guidance:
            {" "}
            {data.warnings.join(" ")}
          </p>
        </motion.div>
      ) : null}

      <motion.section variants={staggerContainer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          eyebrow="Event plans"
          label={`${ops.clientsWithPlans.length} clients with plans`}
          value={ops.clientsWithPlans.length}
          detail={`${ops.totalFunctions} functions across ${ops.totalPlanDays} days`}
          href="/admin/progress"
          highlight={ops.stalledPlans + ops.inProgressPlans > 0}
        />
        <MetricCard
          eyebrow="Vendor network"
          label={ops.vendorProfiles > 0 ? `${ops.verifiedVendors} verified` : "Registered vendors"}
          value={ops.vendorProfiles || data.summary.usersByRole.vendor}
          detail={`${ops.pendingVendorApprovals} pending / ${ops.vendorServices} services listed`}
          href="/admin/vendors"
          highlight={ops.pendingVendorApprovals > 0}
        />
        <MetricCard
          eyebrow="Venue coverage"
          label={`${ops.activeVenues} active venues`}
          value={data.venues.length}
          detail={`${ops.venuesWithCapacity} with capacity data`}
          href="/admin/venues"
          highlight={data.venues.length > 0 && ops.activeVenues < data.venues.length}
        />
        <MetricCard
          eyebrow="Inquiry response"
          label="New lead queue"
          value={data.summary.newContactInquiries}
          detail={`${data.summary.recentContactInquiries.length} recent inquiries visible`}
          href="/admin/inquiries"
          highlight={data.summary.newContactInquiries > 0}
        />
        <MetricCard
          eyebrow="Readiness"
          label={`${ops.readyFunctions}/${ops.totalFunctions} functions ready`}
          value={`${ops.functionReadiness}%`}
          detail={`${ops.averageReadiness}% average client readiness`}
          href="/admin/progress"
          highlight={ops.totalFunctions > 0 && ops.functionReadiness < 60}
        />
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.section variants={fadeUp} className="border border-charcoal/8 bg-ivory p-6 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={dashLabel}>Readiness runway</p>
              <h2 className="mt-2 font-display text-2xl text-charcoal">Event plans to operational handoff</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
                Readiness rolls up from venues, guests, timing, and vendor picks on every client function.
              </p>
            </div>
            <Link
              href="/admin/progress"
              className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
            >
              Open progress
            </Link>
          </div>

          {ops.clientsWithPlans.length === 0 ? (
            <div className="mt-8">
              <EmptyPanel
                title="No event plans are loaded yet"
                detail="Client plans will appear here after onboarding creates celebration days and functions."
                cta="Open clients"
                href="/admin/clients"
              />
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className={dashLabel}>Function readiness</span>
                  <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                    {ops.readyFunctions}/{ops.totalFunctions} ready
                  </span>
                </div>
                <ProgressBar value={ops.functionReadiness} tone={ops.functionReadiness >= 80 ? "sage" : "gold"} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Not started", value: ops.stalledPlans, tone: "text-rose" },
                  { label: "In progress", value: ops.inProgressPlans, tone: "text-gold-dark" },
                  { label: "Ready", value: ops.readyPlans, tone: "text-sage" },
                ].map((item) => (
                  <div key={item.label} className="border border-charcoal/8 bg-cream/35 p-4">
                    <p className={dashLabel}>{item.label}</p>
                    <p className={cn("mt-3 font-display text-3xl", item.tone)}>{item.value}</p>
                  </div>
                ))}
              </div>

              {ops.weakestPlan ? (
                <div className="border border-gold-primary/25 bg-gold-primary/10 p-4">
                  <p className={dashLabel}>Next plan to nudge</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg text-charcoal">{ops.weakestPlan.name}</p>
                      <p className="text-sm text-slate">
                        {ops.weakestPlan.wedding?.name ?? "Celebration"} / {ops.weakestPlan.readiness.percent}% ready
                      </p>
                    </div>
                    <Link
                      href="/admin/progress"
                      className="font-accent text-[10px] uppercase tracking-[0.16em] text-gold-dark hover:text-charcoal"
                    >
                      Review client
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </motion.section>

        <motion.section variants={fadeUp} className="space-y-3 lg:col-span-2">
          <div className="border border-charcoal/8 bg-ivory p-6">
            <p className={dashLabel}>Ops queues</p>
            <h2 className="mt-2 font-display text-2xl text-charcoal">What needs attention</h2>
            <div className="mt-5 space-y-3">
              {ops.workQueues.map((queue) => (
                <QueueCard key={queue.label} queue={queue} />
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.section variants={fadeUp} className="border border-charcoal/8 bg-ivory p-6 lg:col-span-3">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={dashLabel}>Vendor readiness</p>
              <h2 className="mt-2 font-display text-2xl text-charcoal">Verification and service coverage</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                Keep the network clean before clients attach vendors to their functions.
              </p>
            </div>
            <Link
              href="/admin/vendors"
              className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
            >
              Manage vendors
            </Link>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="border border-charcoal/8 bg-cream/35 p-4">
              <p className={dashLabel}>Verified</p>
              <p className="mt-3 font-display text-3xl text-sage">{ops.verifiedVendors}</p>
            </div>
            <div className="border border-charcoal/8 bg-cream/35 p-4">
              <p className={dashLabel}>Featured</p>
              <p className="mt-3 font-display text-3xl text-gold-dark">{ops.featuredVendors}</p>
            </div>
            <div className="border border-charcoal/8 bg-cream/35 p-4">
              <p className={dashLabel}>Services</p>
              <p className="mt-3 font-display text-3xl text-charcoal">{ops.vendorServices}</p>
            </div>
          </div>

          {data.summary.pendingVendors.length === 0 ? (
            <EmptyPanel
              title="No vendor applications are waiting"
              detail="When new vendors sign up or are created without verification, they will land here for review."
              cta="Open vendor network"
              href="/admin/vendors"
            />
          ) : (
            <div className="divide-y divide-charcoal/5">
              {data.summary.pendingVendors.map((vendor) => (
                <div key={vendor.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-charcoal/8 bg-cream font-display text-base text-gold-dark">
                      {vendor.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-medium text-charcoal">{vendor.name}</p>
                      <p className="font-accent text-[10px] uppercase tracking-[0.12em] text-slate">
                        {vendor.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={dashLabel}>{vendor.date}</span>
                    <Link
                      href="/admin/vendors"
                      className={cn(
                        statusBadgeBase,
                        "border-gold-primary/50 text-gold-dark transition-colors hover:bg-gold-primary/10"
                      )}
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section variants={fadeUp} className="space-y-6 lg:col-span-2">
          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className={dashLabel}>Venue coverage</p>
                <h2 className="mt-2 font-display text-xl text-charcoal">Venue catalogue health</h2>
              </div>
              <Link href="/admin/venues" className={cn(dashLabel, "transition-colors hover:text-gold-dark")}>
                Open
              </Link>
            </div>
            {data.venues.length === 0 ? (
              <p className="text-sm leading-relaxed text-slate">
                Venue data is not loaded yet. Open the venue catalogue to confirm active properties and
                destination coverage.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between">
                    <span className={dashLabel}>Active venues</span>
                    <span className="font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                      {ops.activeVenues}/{data.venues.length}
                    </span>
                  </div>
                  <ProgressBar value={percent(ops.activeVenues, data.venues.length)} tone="sage" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Capacity set</p>
                    <p className="mt-2 font-display text-2xl text-charcoal">{ops.venuesWithCapacity}</p>
                  </div>
                  <div className="border border-charcoal/8 bg-cream/35 p-3">
                    <p className={dashLabel}>Inactive</p>
                    <p className="mt-2 font-display text-2xl text-slate">
                      {data.venues.length - ops.activeVenues}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border border-charcoal/8 bg-ivory p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className={dashLabel}>Lead response</p>
                <h2 className="mt-2 font-display text-xl text-charcoal">Recent inquiries</h2>
              </div>
              <Link href="/admin/inquiries" className={cn(dashLabel, "transition-colors hover:text-gold-dark")}>
                All
              </Link>
            </div>
            {data.summary.recentContactInquiries.length === 0 ? (
              <EmptyPanel
                title="No inquiries yet"
                detail="Contact form leads will appear here with destination and message previews."
                cta="Open inquiry inbox"
                href="/admin/inquiries"
              />
            ) : (
              <div className="space-y-3">
                {data.summary.recentContactInquiries.slice(0, 4).map((inquiry) => (
                  <div key={inquiry.id} className="border-l-2 border-gold-primary/35 pl-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-heading text-sm font-medium text-charcoal">{inquiry.name}</p>
                        <p className="line-clamp-1 text-xs text-slate">{inquiry.preview || inquiry.email}</p>
                      </div>
                      <span
                        className={cn(
                          statusBadgeBase,
                          inquiry.status === "NEW"
                            ? "border-gold-primary/60 text-gold-dark"
                            : "border-charcoal/20 text-slate"
                        )}
                      >
                        {statusLabel(inquiry.status)}
                      </span>
                    </div>
                    <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.14em] text-slate">
                      {[inquiry.destination, formatShortDate(inquiry.createdAt)].filter(Boolean).join(" / ") || "New lead"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <motion.section variants={fadeUp} className="border border-charcoal/8 bg-ivory p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={dashLabel}>Booking pipeline</p>
            <h2 className="mt-2 font-display text-2xl text-charcoal">Event demand and booking status</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              {ops.activeBookings} active bookings out of {ops.totalBookings} total booking records.
            </p>
          </div>
          <Link
            href="/admin/analytics"
            className="font-accent border border-charcoal/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Open analytics
          </Link>
        </div>
        {ops.totalBookings === 0 ? (
          <EmptyPanel
            title="No booking pipeline yet"
            detail="Vendor picks and bookings will populate once clients start attaching partners to functions."
            cta="Open event progress"
            href="/admin/progress"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ops.bookingStatuses.map((status) => (
              <div key={status.status} className="border border-charcoal/8 bg-cream/35 p-4">
                <p className={dashLabel}>{status.label}</p>
                <p className="mt-3 font-display text-3xl text-charcoal">{status.value}</p>
                <div className="mt-4">
                  <ProgressBar value={percent(status.value, ops.totalBookings)} />
                </div>
                <p className="mt-2 text-xs text-slate">{percent(status.value, ops.totalBookings)}% of pipeline</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 grid gap-4 border-t border-charcoal/8 pt-6 sm:grid-cols-3">
          <div>
            <p className={dashLabel}>Platform accounts</p>
            <p className="mt-2 font-display text-2xl text-charcoal">{ops.totalUsers}</p>
          </div>
          <div>
            <p className={dashLabel}>Client records</p>
            <p className="mt-2 font-display text-2xl text-charcoal">{data.summary.usersByRole.client}</p>
          </div>
          <div>
            <p className={dashLabel}>Event records</p>
            <p className="mt-2 font-display text-2xl text-charcoal">{data.summary.weddingsCount}</p>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
