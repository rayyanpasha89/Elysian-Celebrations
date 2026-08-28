"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  PAYMENT_METHODS,
  type BookingPaymentSummary,
  type PaymentKind,
  type PaymentLedgerRow,
  type PaymentMethod,
} from "@/lib/payment-ledger";
import { cn, formatCurrency } from "@/lib/utils";

type LedgerPayload = {
  bookingId: string;
  summary: BookingPaymentSummary;
  payments: PaymentLedgerRow[];
};

const labelClass =
  "font-accent text-[9px] uppercase tracking-[0.16em] text-slate";
const inputClass =
  "mt-1.5 w-full border border-charcoal/12 bg-ivory px-3 py-2.5 font-heading text-sm text-charcoal outline-none focus:border-gold-primary";

function localDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function directionLabel(kind: string | null | undefined) {
  return kind === "VENDOR_OUT" ? "Vendor payout" : "Client receipt";
}

function formatEntryDate(payment: PaymentLedgerRow) {
  const value = payment.is_paid ? payment.paid_at : payment.due_date;
  if (!value) return payment.is_paid ? "Settled" : "No due date";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BookingPaymentLedger({
  bookingId,
  className,
  onLedgerChanged,
}: {
  bookingId: string;
  className?: string;
  onLedgerChanged?: () => void;
}) {
  const [ledger, setLedger] = useState<LedgerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [direction, setDirection] = useState<PaymentKind>("CLIENT_IN");
  const [amount, setAmount] = useState("");
  const [settled, setSettled] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("BANK");
  const [movementDate, setMovementDate] = useState(localDate);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const loadLedger = async () => {
    const response = await fetch(`/api/bookings/${bookingId}/payments`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not load payments");
    setLedger(json as LedgerPayload);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await fetch(`/api/bookings/${bookingId}/payments`, {
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Could not load payments");
        if (!cancelled) setLedger(json as LedgerPayload);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const summary = ledger?.summary;
  const target =
    direction === "CLIENT_IN" ? summary?.clientTarget : summary?.vendorTarget;
  const paid =
    direction === "CLIENT_IN" ? summary?.clientPaid : summary?.vendorPaid;
  const scheduled =
    direction === "CLIENT_IN"
      ? summary?.clientScheduled
      : summary?.vendorScheduled;
  const available =
    target == null ? null : Math.max(0, target - (paid ?? 0) - (scheduled ?? 0));

  const recordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: direction,
          amount: Number(amount),
          isPaid: settled,
          method: settled ? method : null,
          paidAt: settled ? movementDate : null,
          dueDate: settled ? null : movementDate,
          reference,
          notes,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not record payment");
      setLedger(json as LedgerPayload);
      setAmount("");
      setReference("");
      setNotes("");
      toast.success(
        settled
          ? `${directionLabel(direction)} recorded`
          : `${directionLabel(direction)} scheduled`
      );
      onLedgerChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    } finally {
      setSaving(false);
    }
  };

  const settlePayment = async (paymentId: string) => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/bookings/${bookingId}/payments/${paymentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "settle",
            method,
            paidAt: movementDate,
            reference,
          }),
        }
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not settle payment");
      await loadLedger();
      toast.success("Scheduled payment marked settled");
      onLedgerChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not settle payment");
    } finally {
      setSaving(false);
    }
  };

  const voidPayment = async (paymentId: string) => {
    if (!voidReason.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/bookings/${bookingId}/payments/${paymentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "void", reason: voidReason }),
        }
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not void payment");
      await loadLedger();
      setVoidingId(null);
      setVoidReason("");
      toast.success("Payment entry voided; history preserved");
      onLedgerChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not void payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("animate-pulse border border-charcoal/8 p-4", className)}>
        <div className="h-3 w-28 bg-charcoal/10" />
        <div className="mt-4 h-24 bg-charcoal/5" />
      </div>
    );
  }

  if (loadError || !ledger) {
    return (
      <div className={cn("border border-rose/25 bg-rose/5 p-4", className)}>
        <p className={labelClass}>Payment ledger unavailable</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadLedger()
              .then(() => setLoadError(false))
              .catch(() => setLoadError(true))
              .finally(() => setLoading(false));
          }}
          className="mt-3 border border-charcoal/15 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.15em] text-charcoal"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className={cn("border border-charcoal/10 bg-cream/35 p-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={labelClass}>Directional payment ledger</p>
          <h4 className="mt-1 font-display text-xl text-charcoal">
            Client receipts and vendor payouts
          </h4>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-slate">
          Record actual money movement. Scheduled entries do not count as paid.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <LedgerMetric label="Client received" value={summary?.clientPaid ?? 0} />
        <LedgerMetric label="Client due" value={summary?.clientDue} />
        <LedgerMetric label="Vendor paid" value={summary?.vendorPaid ?? 0} />
        <LedgerMetric label="Vendor due" value={summary?.vendorDue} />
      </div>

      <form onSubmit={recordPayment} className="mt-4 border-t border-charcoal/8 pt-4">
        <div className="flex gap-1 border border-charcoal/10 bg-ivory p-1">
          {(["CLIENT_IN", "VENDOR_OUT"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={direction === kind}
              onClick={() => setDirection(kind)}
              className={cn(
                "flex-1 px-2 py-2 font-accent text-[9px] uppercase tracking-[0.14em] transition-colors",
                direction === kind
                  ? "bg-charcoal-brown text-ivory"
                  : "text-slate hover:text-charcoal"
              )}
            >
              {directionLabel(kind)}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Amount</span>
            <input
              type="number"
              min={1}
              max={available ?? undefined}
              step={1}
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={
                available == null
                  ? "Set pricing first"
                  : `${formatCurrency(available)} available`
              }
              disabled={available == null || available === 0}
              className={inputClass}
            />
          </label>
          <div>
            <span className={labelClass}>Entry state</span>
            <div className="mt-1.5 grid grid-cols-2 border border-charcoal/12 bg-ivory p-1">
              <button
                type="button"
                onClick={() => setSettled(true)}
                className={cn(
                  "px-2 py-2 font-accent text-[9px] uppercase tracking-[0.13em]",
                  settled ? "bg-dry-sage text-charcoal" : "text-slate"
                )}
              >
                Settled
              </button>
              <button
                type="button"
                onClick={() => setSettled(false)}
                className={cn(
                  "px-2 py-2 font-accent text-[9px] uppercase tracking-[0.13em]",
                  !settled ? "bg-khaki-beige text-charcoal" : "text-slate"
                )}
              >
                Scheduled
              </button>
            </div>
          </div>
          {settled ? (
            <label>
              <span className={labelClass}>Method</span>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className={inputClass}
              >
                {PAYMENT_METHODS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry === "BANK" ? "Bank transfer" : entry}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span className={labelClass}>{settled ? "Settled on" : "Due on"}</span>
            <input
              type="date"
              required
              value={movementDate}
              onChange={(event) => setMovementDate(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <details className="mt-3 border border-charcoal/8 bg-ivory px-3 py-2">
          <summary className="cursor-pointer font-accent text-[9px] uppercase tracking-[0.14em] text-slate">
            Reference and internal note
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Reference</span>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="UTR, receipt, cheque..."
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Internal note</span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Milestone or context"
                className={inputClass}
              />
            </label>
          </div>
        </details>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate">
            {available == null
              ? "Fix this booking's price before recording money."
              : `${formatCurrency(available)} remains unrecorded for this direction.`}
          </p>
          <button
            type="submit"
            disabled={saving || available == null || available === 0 || !amount}
            className="border border-gold-primary bg-gold-primary px-4 py-2.5 font-accent text-[9px] uppercase tracking-[0.16em] text-midnight disabled:opacity-40"
          >
            {saving
              ? "Recording..."
              : settled
                ? `Record ${directionLabel(direction)}`
                : `Schedule ${directionLabel(direction)}`}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-charcoal/8 pt-4">
        <p className={labelClass}>History</p>
        {ledger.payments.length === 0 ? (
          <p className="mt-2 text-sm text-slate">No payment movement recorded yet.</p>
        ) : (
          <ul className="mt-3 list-none space-y-2 pl-0">
            {ledger.payments.map((payment) => {
              const voided = Boolean(payment.voided_at);
              return (
                <li
                  key={payment.id}
                  className={cn(
                    "border p-3",
                    voided
                      ? "border-charcoal/8 bg-charcoal/[0.03] opacity-60"
                      : "border-charcoal/10 bg-ivory"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-sm text-charcoal">
                        {payment.label || directionLabel(payment.kind)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate">
                        {directionLabel(payment.kind)} · {formatEntryDate(payment)}
                        {payment.method ? ` · ${payment.method}` : ""}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg text-charcoal">
                        {formatCurrency(payment.amount ?? 0)}
                      </p>
                      <p className={cn(labelClass, voided && "text-rose")}>
                        {voided ? "Voided" : payment.is_paid ? "Settled" : "Scheduled"}
                      </p>
                    </div>
                  </div>
                  {payment.notes ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate">
                      {payment.notes}
                    </p>
                  ) : null}
                  {payment.void_reason ? (
                    <p className="mt-2 text-xs leading-relaxed text-rose">
                      Void reason: {payment.void_reason}
                    </p>
                  ) : null}
                  {!voided ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-charcoal/8 pt-2">
                      {!payment.is_paid && payment.id ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void settlePayment(payment.id!)}
                          className="border border-sage/30 px-2.5 py-1.5 font-accent text-[8px] uppercase tracking-[0.13em] text-sage"
                        >
                          Mark settled
                        </button>
                      ) : null}
                      {payment.id ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setVoidingId(payment.id!);
                            setVoidReason("");
                          }}
                          className="border border-charcoal/12 px-2.5 py-1.5 font-accent text-[8px] uppercase tracking-[0.13em] text-slate hover:border-rose hover:text-rose"
                        >
                          Void entry
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {voidingId === payment.id ? (
                    <div className="mt-3 border border-rose/20 bg-rose/5 p-2.5">
                      <label>
                        <span className={labelClass}>Why is this entry wrong?</span>
                        <input
                          autoFocus
                          value={voidReason}
                          onChange={(event) => setVoidReason(event.target.value)}
                          className={inputClass}
                          placeholder="Duplicate, wrong amount, wrong booking..."
                        />
                      </label>
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setVoidingId(null)}
                          className="px-2 py-1.5 font-accent text-[8px] uppercase tracking-[0.13em] text-slate"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={saving || !voidReason.trim()}
                          onClick={() => void voidPayment(payment.id!)}
                          className="border border-rose px-2.5 py-1.5 font-accent text-[8px] uppercase tracking-[0.13em] text-rose disabled:opacity-40"
                        >
                          Preserve and void
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function LedgerMetric({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="border border-charcoal/8 bg-ivory p-2.5">
      <p className={labelClass}>{label}</p>
      <p className="mt-1.5 font-display text-base text-charcoal">
        {value == null ? "Price not set" : formatCurrency(value)}
      </p>
    </div>
  );
}
