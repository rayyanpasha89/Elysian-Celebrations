"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Landmark,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import type {
  BillingCapability,
  BillingInvoiceView,
  BillingSummary,
} from "@/lib/billing";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn, formatCurrency } from "@/lib/utils";

type BillingPayload = {
  invoices: BillingInvoiceView[];
  summary: BillingSummary;
  capability: BillingCapability;
  needsOnboarding: boolean;
};

type Filter = "OPEN" | "PAID" | "HISTORY";

const filters: { value: Filter; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "PAID", label: "Received" },
  { value: "HISTORY", label: "All history" },
];

function localDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timestamp(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not recorded";
}

function invoiceStatusClass(status: BillingInvoiceView["displayStatus"]) {
  return cn(
    statusBadgeBase,
    status === "PAID" && "border-dry-sage-2/70 bg-dry-sage/20 text-dusty-olive",
    status === "ISSUED" && "border-camel/60 bg-camel/10 text-saddle-brown",
    status === "OVERDUE" && "border-rose/50 bg-rose/5 text-rose",
    status === "PARTIALLY_REFUNDED" && "border-toffee-brown/50 text-toffee-brown",
    status === "REFUNDED" && "border-charcoal/20 text-slate",
    status === "VOID" && "border-charcoal/15 text-slate line-through"
  );
}

function statusLabel(status: BillingInvoiceView["displayStatus"]) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function ClientBillingPage() {
  const [payload, setPayload] = useState<BillingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/client/billing", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error ?? "Billing could not be loaded");
        if (!cancelled) setPayload(json as BillingPayload);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Billing could not be loaded"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const invoices = payload?.invoices ?? [];
    if (filter === "OPEN") return invoices.filter((invoice) => invoice.status === "ISSUED");
    if (filter === "PAID") {
      return invoices.filter((invoice) =>
        ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(invoice.status)
      );
    }
    return invoices;
  }, [filter, payload?.invoices]);

  useEffect(() => {
    if (!filtered.some((invoice) => invoice.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((invoice) => invoice.id === selectedId) ?? null;

  async function startCheckout(invoice: BillingInvoiceView) {
    if (!payload?.capability.onlineCheckout || checkoutInvoiceId) return;
    setCheckoutInvoiceId(invoice.id);
    setCheckoutError(null);
    try {
      const response = await fetch(`/api/client/billing/${invoice.id}/checkout`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || typeof json?.checkoutUrl !== "string") {
        throw new Error(json?.error ?? "Secure checkout could not be started");
      }
      window.location.assign(json.checkoutUrl);
    } catch (checkoutFailure) {
      setCheckoutError(
        checkoutFailure instanceof Error
          ? checkoutFailure.message
          : "Secure checkout could not be started"
      );
      setCheckoutInvoiceId(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-5" aria-label="Loading billing">
        <div className="h-9 w-56 bg-charcoal/10" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 border border-charcoal/8 bg-charcoal/[0.04]" />
          ))}
        </div>
        <div className="h-96 border border-charcoal/8 bg-charcoal/[0.04]" />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <section className={cn(dashCard, "border-dashed border-camel/50 bg-camel/[0.06]")}>
        <p className={dashLabel}>Billing unavailable</p>
        <h2 className="mt-3 font-display text-3xl text-charcoal">Your records are still protected</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
          {error ?? "Billing could not be loaded."} No missing response has been treated as a zero balance.
        </p>
        <button className={cn(dashBtn, "mt-5 text-saddle-brown")} onClick={() => setReloadKey((key) => key + 1)}>
          Try again
        </button>
      </section>
    );
  }

  if (payload.needsOnboarding) {
    return (
      <section className={cn(dashCard, "border-dashed border-camel/50 bg-camel/[0.06]")}>
        <p className={dashLabel}>Billing begins with a plan</p>
        <h2 className="mt-3 font-display text-3xl text-charcoal">Define your event first</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
          Once your event structure and vendor selections exist, Elysian can publish fixed prices and schedule clear installments here.
        </p>
        <Link href="/client/onboarding" className={cn(dashBtn, "mt-5 bg-saddle-brown text-ivory hover:bg-dark-walnut")}>
          Create event structure
        </Link>
      </section>
    );
  }

  const summary = payload.summary;
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden border border-charcoal/10 bg-[radial-gradient(circle_at_top_right,rgba(166,138,100,0.32),transparent_48%),linear-gradient(145deg,var(--charcoal-brown),var(--ebony))] p-6 text-ivory md:p-8">
        <div className="relative max-w-3xl">
          <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-khaki-beige">Client billing</p>
          <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Every installment, in one calm timeline.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/72 md:text-base">
            Your complete published price is paid to Elysian through these installments. Track receipts and refunds here while Elysian handles vendor settlements separately.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Billing summary">
        <SummaryCard icon={CalendarClock} label="Scheduled" value={summary.scheduled} hint={`${summary.issuedCount + summary.paidCount} installments`} />
        <SummaryCard icon={CheckCircle2} label="Net received" value={summary.netReceived} hint={summary.refunded > 0 ? `${formatCurrency(summary.refunded)} refunded` : "After refunds"} />
        <SummaryCard icon={BadgeIndianRupee} label="Outstanding" value={summary.outstanding} hint={summary.outstanding === 0 ? "Nothing currently due" : "Published installments"} />
        <SummaryCard icon={CircleAlert} label="Overdue" value={summary.overdue} hint={summary.overdue === 0 ? "All dates are current" : "Needs operations follow-up"} alert={summary.overdue > 0} />
      </section>

      {!payload.capability.onlineCheckout ? (
        <section className="flex items-start gap-3 border border-dry-sage-2/30 bg-dry-sage/15 p-4">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-dusty-olive" aria-hidden />
          <div>
            <p className="font-heading text-sm text-charcoal">Elysian is your single payment counterparty</p>
            <p className="mt-1 text-xs leading-relaxed text-slate">{payload.capability.reason}</p>
          </div>
        </section>
      ) : null}

      <section className="grid min-h-[32rem] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className={cn(dashCard, "p-0")}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/8 p-4 md:p-5">
            <div>
              <p className={dashLabel}>Installment timeline</p>
              <h3 className="mt-1 font-display text-2xl text-charcoal">Invoices and receipts</h3>
            </div>
            <div className="flex border border-charcoal/10 bg-cream/40 p-1" role="tablist" aria-label="Billing filters">
              {filters.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === entry.value}
                  onClick={() => setFilter(entry.value)}
                  className={cn(
                    "px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] transition-colors",
                    filter === entry.value ? "bg-charcoal-brown text-ivory" : "text-slate hover:text-charcoal"
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <ReceiptText className="h-8 w-8 text-camel" aria-hidden />
              <h4 className="mt-4 font-display text-2xl text-charcoal">No {filter === "OPEN" ? "open installments" : filter === "PAID" ? "received installments" : "billing history"}</h4>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate">
                {filter === "OPEN" ? "When operations schedules the next fixed-price installment, it will appear here with a due date." : "Billing activity will appear here without changing your event plan."}
              </p>
            </div>
          ) : (
            <ul className="list-none divide-y divide-charcoal/8 p-0">
              {filtered.map((invoice) => (
                <li key={invoice.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(invoice.id)}
                    aria-pressed={selectedId === invoice.id}
                    className={cn(
                      "grid w-full gap-3 px-4 py-4 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5",
                      selectedId === invoice.id ? "bg-camel/[0.12]" : "hover:bg-cream/55"
                    )}
                  >
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-base text-charcoal">{invoice.label}</span>
                        <span className={invoiceStatusClass(invoice.displayStatus)}>{statusLabel(invoice.displayStatus)}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate">
                        {invoice.party.vendorName} · {invoice.party.serviceName} · due {localDate(invoice.dueDate)}
                      </span>
                    </span>
                    <span className="font-display text-xl text-charcoal">{formatCurrency(invoice.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className={cn(dashCard, "h-fit xl:sticky xl:top-24")} aria-live="polite">
          {selected ? (
            <InvoiceDetail
              invoice={selected}
              capability={payload.capability}
              checkoutError={checkoutError}
              checkoutPending={checkoutInvoiceId === selected.id}
              onCheckout={startCheckout}
            />
          ) : (
            <div className="py-12 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-camel" aria-hidden />
              <p className="mt-4 font-display text-2xl text-charcoal">Choose an installment</p>
              <p className="mt-2 text-sm leading-relaxed text-slate">Select a row to see its event, venue, date, and receipt state.</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, hint, alert = false }: { icon: typeof CalendarClock; label: string; value: number; hint: string; alert?: boolean }) {
  return (
    <article className={cn(dashCard, "relative overflow-hidden p-4", alert && "border-rose/30 bg-rose/[0.03]")}>
      <Icon className={cn("h-5 w-5 text-camel", alert && "text-rose")} aria-hidden />
      <p className={cn(dashLabel, "mt-4")}>{label}</p>
      <p className="mt-1 font-display text-2xl text-charcoal">{formatCurrency(value)}</p>
      <p className="mt-1 text-[11px] text-slate">{hint}</p>
    </article>
  );
}

function InvoiceDetail({
  invoice,
  capability,
  checkoutError,
  checkoutPending,
  onCheckout,
}: {
  invoice: BillingInvoiceView;
  capability: BillingCapability;
  checkoutError: string | null;
  checkoutPending: boolean;
  onCheckout: (invoice: BillingInvoiceView) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={dashLabel}>Installment {invoice.installmentNumber}</p>
          <h3 className="mt-2 font-display text-2xl text-charcoal">{invoice.label}</h3>
        </div>
        <span className={invoiceStatusClass(invoice.displayStatus)}>{statusLabel(invoice.displayStatus)}</span>
      </div>
      <p className="mt-4 font-display text-4xl text-charcoal">{formatCurrency(invoice.amount)}</p>
      <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.15em] text-slate">{invoice.invoiceNumber}</p>

      <dl className="mt-6 divide-y divide-charcoal/8 border-y border-charcoal/8">
        <DetailRow label="Due" value={localDate(invoice.dueDate)} />
        <DetailRow label="Received" value={timestamp(invoice.paidAt)} />
        <DetailRow label="Vendor" value={invoice.party.vendorName} />
        <DetailRow label="Service" value={invoice.party.serviceName} />
        {invoice.event ? <DetailRow label="Function" value={invoice.event.name} /> : null}
        {invoice.event?.dayName ? <DetailRow label="Day" value={invoice.event.dayName} /> : null}
        {invoice.event?.venue ? <DetailRow label="Venue" value={invoice.event.venue} /> : null}
      </dl>

      {invoice.refundedAmount > 0 ? (
        <div className="mt-5 border border-toffee-brown/25 bg-toffee-brown/[0.06] p-3">
          <p className={dashLabel}>Refund adjustment</p>
          <p className="mt-2 text-sm text-charcoal">{formatCurrency(invoice.refundedAmount)} refunded · {formatCurrency(invoice.netReceived)} net received</p>
        </div>
      ) : null}
      {invoice.description ? <p className="mt-5 text-sm leading-relaxed text-slate">{invoice.description}</p> : null}
      {capability.onlineCheckout && invoice.status === "ISSUED" ? (
        <div className="mt-5 border-t border-charcoal/8 pt-5">
          <button
            type="button"
            className={cn(
              dashBtn,
              "w-full justify-center bg-saddle-brown text-ivory hover:bg-dark-walnut disabled:cursor-wait disabled:opacity-60"
            )}
            disabled={checkoutPending}
            onClick={() => onCheckout(invoice)}
          >
            {checkoutPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="h-4 w-4" aria-hidden />
            )}
            {checkoutPending ? "Opening secure checkout..." : "Pay securely"}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-slate">
            You pay Elysian on the approved provider&apos;s hosted page. Card, bank, and UPI credentials never enter this application.
          </p>
          {checkoutError ? (
            <p className="mt-3 border border-rose/30 bg-rose/[0.04] p-2 text-xs leading-relaxed text-rose" role="alert">
              {checkoutError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 py-3 text-sm">
      <dt className={dashLabel}>{label}</dt>
      <dd className="text-right text-charcoal">{value}</dd>
    </div>
  );
}
