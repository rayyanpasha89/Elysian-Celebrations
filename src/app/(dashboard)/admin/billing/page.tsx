"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FilePlus2,
  Landmark,
  ReceiptIndianRupee,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type {
  BillingCapability,
  BillingInvoiceView,
  BillingSummary,
} from "@/lib/billing";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-ledger";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn, formatCurrency } from "@/lib/utils";

type BillableBooking = {
  id: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  vendorName: string;
  vendorSlug: string | null;
  serviceName: string;
  eventName: string;
  eventDate: string | null;
  dayName: string | null;
  finalPrice: number;
  allocated: number;
  remaining: number;
  activeInvoiceCount: number;
  updatedAt: string;
};

type BillingWorkspace = {
  invoices: BillingInvoiceView[];
  bookings: BillableBooking[];
  summary: BillingSummary;
  capability: BillingCapability;
};

type Filter = "OPEN" | "RECEIVED" | "REFUNDS" | "ALL";

function todayInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not set";
  return new Date(includeTime ? value : `${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

function statusClass(status: BillingInvoiceView["displayStatus"]) {
  return cn(
    statusBadgeBase,
    status === "PAID" && "border-dry-sage-2/70 bg-dry-sage/20 text-dusty-olive",
    status === "ISSUED" && "border-camel/60 bg-camel/10 text-saddle-brown",
    status === "OVERDUE" && "border-rose/55 bg-rose/5 text-rose",
    status === "PARTIALLY_REFUNDED" && "border-toffee-brown/50 text-toffee-brown",
    status === "REFUNDED" && "border-charcoal/20 text-slate",
    status === "VOID" && "border-charcoal/15 text-slate line-through"
  );
}

function statusLabel(status: BillingInvoiceView["displayStatus"]) {
  return status.replaceAll("_", " ").toLowerCase();
}

const inputClass =
  "mt-1.5 w-full border border-charcoal/12 bg-ivory px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-saddle-brown disabled:bg-charcoal/[0.04] disabled:text-slate";

export default function AdminBillingPage() {
  const [workspace, setWorkspace] = useState<BillingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [search, setSearch] = useState("");
  const [showIssue, setShowIssue] = useState(false);

  const loadWorkspace = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/billing", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Billing workspace could not be loaded");
      setWorkspace(json as BillingWorkspace);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Billing workspace could not be loaded";
      setError(message);
      if (quiet) toast.error(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (workspace?.invoices ?? []).filter((invoice) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "OPEN" && invoice.status === "ISSUED") ||
        (filter === "RECEIVED" && ["PAID", "PARTIALLY_REFUNDED"].includes(invoice.status)) ||
        (filter === "REFUNDS" && invoice.refundedAmount > 0);
      if (!matchesFilter) return false;
      if (!needle) return true;
      return [
        invoice.invoiceNumber,
        invoice.label,
        invoice.party.clientName,
        invoice.party.clientEmail,
        invoice.party.vendorName,
        invoice.party.serviceName,
        invoice.event?.name,
      ].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [filter, search, workspace?.invoices]);

  useEffect(() => {
    if (!filtered.some((invoice) => invoice.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((invoice) => invoice.id === selectedId) ?? null;

  if (loading) return <BillingSkeleton />;
  if (error || !workspace) {
    return (
      <section className={cn(dashCard, "border-dashed border-camel/50 bg-camel/[0.06]")}>
        <p className={dashLabel}>Billing unavailable</p>
        <h2 className="mt-3 font-display text-3xl text-charcoal">No financial zeroes were assumed</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">{error ?? "Billing could not be loaded."}</p>
        <button type="button" className={cn(dashBtn, "mt-5 text-saddle-brown")} onClick={() => void loadWorkspace()}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden border border-charcoal/10 bg-[radial-gradient(circle_at_top_right,rgba(166,138,100,0.34),transparent_48%),linear-gradient(145deg,var(--charcoal-brown),var(--ebony))] p-6 text-ivory md:p-8">
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-khaki-beige">Revenue operations</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Issue, reconcile, and preserve every client receipt.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/72">
              Fixed client prices become installment invoices here. Settlement and refund changes remain append-only and auditable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIssue((current) => !current)}
            className="inline-flex items-center gap-2 border border-khaki-beige bg-khaki-beige px-5 py-3 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal-brown transition-colors hover:bg-dry-sage"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden />
            {showIssue ? "Close issuer" : "Issue installment"}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Billing reconciliation summary">
        <Metric icon={ReceiptIndianRupee} label="Scheduled" value={workspace.summary.scheduled} hint={`${workspace.summary.issuedCount + workspace.summary.paidCount} active invoices`} />
        <Metric icon={CheckCircle2} label="Gross received" value={workspace.summary.received} hint="Before refunds" />
        <Metric icon={RotateCcw} label="Refunded" value={workspace.summary.refunded} hint={`${formatCurrency(workspace.summary.netReceived)} net`} />
        <Metric icon={BadgeIndianRupee} label="Outstanding" value={workspace.summary.outstanding} hint="Issued, not received" />
        <Metric icon={CircleAlert} label="Overdue" value={workspace.summary.overdue} hint={workspace.summary.overdue > 0 ? "Needs follow-up" : "Dates current"} alert={workspace.summary.overdue > 0} />
      </section>

      {showIssue ? (
        <IssueInvoicePanel
          bookings={workspace.bookings}
          onIssued={async () => {
            await loadWorkspace({ quiet: true });
            setShowIssue(false);
          }}
        />
      ) : null}

      {!workspace.capability.onlineCheckout ? (
        <section className="flex items-start gap-3 border border-dry-sage-2/30 bg-dry-sage/15 p-4">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-dusty-olive" aria-hidden />
          <div>
            <p className="font-heading text-sm text-charcoal">Manual reconciliation is active</p>
            <p className="mt-1 text-xs leading-relaxed text-slate">{workspace.capability.reason} Do not mark an invoice received until the bank or approved channel confirms settlement.</p>
          </div>
        </section>
      ) : null}

      <section className="grid min-h-[38rem] gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className={cn(dashCard, "p-0")}>
          <div className="space-y-4 border-b border-charcoal/8 p-4 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={dashLabel}>Invoice register</p>
                <h3 className="mt-1 font-display text-2xl text-charcoal">Client collections</h3>
              </div>
              <div className="flex border border-charcoal/10 bg-cream/40 p-1" role="tablist" aria-label="Invoice filters">
                {(["OPEN", "RECEIVED", "REFUNDS", "ALL"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "px-2.5 py-2 font-accent text-[8px] uppercase tracking-[0.13em] transition-colors sm:px-3",
                      filter === value ? "bg-charcoal-brown text-ivory" : "text-slate hover:text-charcoal"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden />
              <span className="sr-only">Search invoices</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, client, vendor, service..." className="w-full border border-charcoal/10 bg-ivory py-2.5 pl-10 pr-3 text-sm text-charcoal outline-none focus:border-saddle-brown" />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <ReceiptIndianRupee className="h-8 w-8 text-camel" aria-hidden />
              <h4 className="mt-4 font-display text-2xl text-charcoal">No matching invoices</h4>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate">Issue an installment from a published booking, or adjust the current filter.</p>
            </div>
          ) : (
            <ul className="list-none divide-y divide-charcoal/8 p-0">
              {filtered.map((invoice) => (
                <li key={invoice.id}>
                  <button type="button" onClick={() => setSelectedId(invoice.id)} aria-pressed={selectedId === invoice.id} className={cn("grid w-full gap-3 px-4 py-4 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5", selectedId === invoice.id ? "bg-camel/[0.12]" : "hover:bg-cream/55")}>
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-base text-charcoal">{invoice.party.clientName}</span>
                        <span className={statusClass(invoice.displayStatus)}>{statusLabel(invoice.displayStatus)}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate">{invoice.invoiceNumber} · {invoice.party.vendorName} · due {formatDate(invoice.dueDate)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-display text-xl text-charcoal">{formatCurrency(invoice.amount)}</span>
                      {invoice.refundedAmount > 0 ? <span className="mt-1 block text-[10px] text-toffee-brown">{formatCurrency(invoice.refundedAmount)} refunded</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className={cn(dashCard, "h-fit xl:sticky xl:top-24")} aria-live="polite">
          {selected ? (
            <AdminInvoiceDetail
              invoice={selected}
              onChanged={() => loadWorkspace({ quiet: true })}
            />
          ) : (
            <div className="py-14 text-center">
              <ShieldCheck className="mx-auto h-9 w-9 text-camel" aria-hidden />
              <h3 className="mt-4 font-display text-2xl text-charcoal">Choose an invoice</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate">Settlement, void, and refund actions open only for the selected record.</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading billing workspace">
      <div className="h-48 border border-charcoal/8 bg-charcoal/[0.06]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 border border-charcoal/8 bg-charcoal/[0.04]" />)}</div>
      <div className="h-96 border border-charcoal/8 bg-charcoal/[0.04]" />
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint, alert = false }: { icon: typeof CalendarClock; label: string; value: number; hint: string; alert?: boolean }) {
  return (
    <article className={cn(dashCard, "p-4", alert && "border-rose/30 bg-rose/[0.03]")}>
      <Icon className={cn("h-5 w-5 text-camel", alert && "text-rose")} aria-hidden />
      <p className={cn(dashLabel, "mt-4")}>{label}</p>
      <p className="mt-1 font-display text-2xl text-charcoal">{formatCurrency(value)}</p>
      <p className="mt-1 text-[11px] text-slate">{hint}</p>
    </article>
  );
}

function IssueInvoicePanel({ bookings, onIssued }: { bookings: BillableBooking[]; onIssued: () => Promise<void> }) {
  const [bookingId, setBookingId] = useState(bookings[0]?.id ?? "");
  const [amount, setAmount] = useState(bookings[0] ? String(bookings[0].remaining) : "");
  const [dueDate, setDueDate] = useState(todayInput(7));
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [retryKey, setRetryKey] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const booking = bookings.find((entry) => entry.id === bookingId) ?? null;

  function chooseBooking(id: string) {
    setBookingId(id);
    const next = bookings.find((entry) => entry.id === id);
    setAmount(next ? String(next.remaining) : "");
    setLabel("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": retryKey },
        body: JSON.stringify({ bookingId, amount: Number(amount), dueDate, label, description, idempotencyKey: retryKey }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Installment could not be issued");
      toast.success(`${json.invoice?.invoiceNumber ?? "Invoice"} issued`);
      setRetryKey(crypto.randomUUID());
      await onIssued();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Installment could not be issued");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn(dashCard, "border-camel/35 bg-camel/[0.06]")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={dashLabel}>New fixed-price installment</p>
          <h3 className="mt-2 font-display text-3xl text-charcoal">Issue from an approved booking</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">The amount is capped by the published client price. Retrying this form cannot create a duplicate invoice.</p>
        </div>
        <span className="border border-dry-sage-2/35 bg-dry-sage/20 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.15em] text-dusty-olive">Idempotent issue</span>
      </div>

      {bookings.length === 0 ? (
        <div className="mt-5 border border-dashed border-charcoal/15 bg-ivory p-5">
          <p className="font-heading text-base text-charcoal">No unallocated published pricing</p>
          <p className="mt-2 text-sm leading-relaxed text-slate">Publish a final booking price first, or all current prices are already fully allocated to invoices.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="lg:col-span-2">
            <span className={dashLabel}>Booking</span>
            <select required value={bookingId} onChange={(event) => chooseBooking(event.target.value)} className={inputClass}>
              {bookings.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.clientName} · {entry.eventName} · {entry.vendorName} / {entry.serviceName} · {formatCurrency(entry.remaining)} available</option>
              ))}
            </select>
          </label>
          <label>
            <span className={dashLabel}>Installment amount</span>
            <input type="number" required min={1} max={booking?.remaining ?? undefined} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
            <span className="mt-1.5 block text-[11px] text-slate">{booking ? `${formatCurrency(booking.remaining)} remains against ${formatCurrency(booking.finalPrice)}` : "Choose a booking"}</span>
          </label>
          <label>
            <span className={dashLabel}>Due date</span>
            <input type="date" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className={dashLabel}>Client label</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Deposit, second installment..." className={inputClass} />
          </label>
          <label>
            <span className={dashLabel}>Client description</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Milestone covered by this installment" className={inputClass} />
          </label>
          <div className="flex items-center justify-end lg:col-span-2">
            <button type="submit" disabled={saving || !bookingId || !amount} className={cn(dashBtn, "bg-saddle-brown text-ivory hover:bg-dark-walnut")}>{saving ? "Issuing..." : "Issue installment"}</button>
          </div>
        </form>
      )}
    </section>
  );
}

function AdminInvoiceDetail({ invoice, onChanged }: { invoice: BillingInvoiceView; onChanged: () => Promise<void> }) {
  const [action, setAction] = useState<"settle" | "void" | "refund" | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("BANK");
  const [actionDate, setActionDate] = useState(todayInput());
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(String(Math.max(0, invoice.amount - invoice.refundedAmount)));
  const [refundKey, setRefundKey] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAction(null);
    setReference("");
    setReason("");
    setRefundAmount(String(Math.max(0, invoice.amount - invoice.refundedAmount)));
    setRefundKey(crypto.randomUUID());
  }, [invoice.id, invoice.amount, invoice.refundedAmount]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || saving) return;
    setSaving(true);
    try {
      const body = action === "settle"
        ? { action, method, paidAt: actionDate, reference }
        : action === "void"
          ? { action, reason }
          : { action, amount: Number(refundAmount), method, reference, reason, idempotencyKey: refundKey };
      const response = await fetch(`/api/admin/billing/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(action === "refund" ? { "Idempotency-Key": refundKey } : {}) },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Billing action could not be completed");
      toast.success(action === "settle" ? "Invoice marked received" : action === "void" ? "Invoice voided with history preserved" : "Refund recorded");
      if (action === "refund") setRefundKey(crypto.randomUUID());
      setAction(null);
      await onChanged();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Billing action could not be completed");
    } finally {
      setSaving(false);
    }
  }

  const canRefund = invoice.status === "PAID" || invoice.status === "PARTIALLY_REFUNDED";
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={dashLabel}>Installment {invoice.installmentNumber}</p>
          <h3 className="mt-2 font-display text-2xl text-charcoal">{invoice.invoiceNumber}</h3>
        </div>
        <span className={statusClass(invoice.displayStatus)}>{statusLabel(invoice.displayStatus)}</span>
      </div>
      <p className="mt-4 font-display text-4xl text-charcoal">{formatCurrency(invoice.amount)}</p>
      <p className="mt-1 text-sm text-slate">{invoice.label}</p>

      <dl className="mt-5 divide-y divide-charcoal/8 border-y border-charcoal/8">
        <DetailRow label="Client" value={invoice.party.clientName} />
        <DetailRow label="Vendor" value={invoice.party.vendorName} />
        <DetailRow label="Service" value={invoice.party.serviceName} />
        <DetailRow label="Function" value={invoice.event?.name ?? "Not linked"} />
        <DetailRow label="Due" value={formatDate(invoice.dueDate)} />
        <DetailRow label="Received" value={formatDate(invoice.paidAt, true)} />
      </dl>

      {invoice.refundedAmount > 0 ? (
        <div className="mt-4 border border-toffee-brown/25 bg-toffee-brown/[0.06] p-3 text-sm text-charcoal">
          {formatCurrency(invoice.refundedAmount)} refunded · {formatCurrency(invoice.netReceived)} net received
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {invoice.status === "ISSUED" ? (
          <>
            <button type="button" onClick={() => setAction("settle")} className="border border-dry-sage-2 bg-dry-sage/20 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] text-dusty-olive">Mark received</button>
            <button type="button" onClick={() => setAction("void")} className="border border-charcoal/15 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] text-slate hover:border-rose hover:text-rose">Void invoice</button>
          </>
        ) : null}
        {canRefund ? <button type="button" onClick={() => setAction("refund")} className="border border-toffee-brown/40 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] text-toffee-brown">Record refund</button> : null}
      </div>

      {action ? (
        <form onSubmit={submit} className="mt-4 border border-camel/30 bg-camel/[0.06] p-4">
          <p className={dashLabel}>{action === "settle" ? "Confirm received funds" : action === "void" ? "Preserve and void" : "Append refund event"}</p>
          {action !== "void" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {action === "refund" ? (
                <label><span className={dashLabel}>Refund amount</span><input type="number" required min={1} max={invoice.amount - invoice.refundedAmount} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} className={inputClass} /></label>
              ) : (
                <label><span className={dashLabel}>Received on</span><input type="date" required value={actionDate} onChange={(event) => setActionDate(event.target.value)} className={inputClass} /></label>
              )}
              <label><span className={dashLabel}>{action === "refund" ? "Refund method" : "Payment method"}</span><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={inputClass}>{PAYMENT_METHODS.map((entry) => <option key={entry} value={entry}>{entry === "BANK" ? "Bank transfer" : entry}</option>)}</select></label>
              <label className="sm:col-span-2 xl:col-span-1"><span className={dashLabel}>Reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UTR, receipt, cheque..." className={inputClass} /></label>
            </div>
          ) : null}
          {action !== "settle" ? <label className="mt-3 block"><span className={dashLabel}>Reason</span><textarea required value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={inputClass} placeholder={action === "void" ? "Why is this unpaid obligation being withdrawn?" : "Why was money returned?"} /></label> : null}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setAction(null)} className="px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] text-slate">Cancel</button>
            <button type="submit" disabled={saving || (action !== "settle" && !reason.trim())} className="border border-saddle-brown bg-saddle-brown px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] text-ivory disabled:opacity-40">{saving ? "Recording..." : action === "settle" ? "Confirm receipt" : action === "void" ? "Void invoice" : "Record refund"}</button>
          </div>
        </form>
      ) : null}

      {(invoice.attempts?.length ?? 0) > 0 || (invoice.refunds?.length ?? 0) > 0 ? (
        <details className="mt-5 border-t border-charcoal/8 pt-4">
          <summary className="cursor-pointer font-accent text-[9px] uppercase tracking-[0.14em] text-slate">Technical audit trail</summary>
          <div className="mt-3 space-y-2 text-xs text-slate">
            {invoice.attempts?.map((attempt) => <p key={attempt.id}>{attempt.provider} · {attempt.status} · {formatDate(attempt.createdAt, true)}</p>)}
            {invoice.refunds?.map((refund) => <p key={refund.id}>Refund {formatCurrency(refund.amount)} · {refund.status} · {formatDate(refund.createdAt, true)}</p>)}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[90px_1fr] gap-3 py-3 text-sm"><dt className={dashLabel}>{label}</dt><dd className="text-right text-charcoal">{value}</dd></div>;
}
