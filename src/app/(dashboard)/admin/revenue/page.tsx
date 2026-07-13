"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  categoryName: string;
  vendorName: string;
  listedPrice: number | null;
  finalPrice: number | null;
  fee: number | null;
  pricePublished: boolean;
};
type AdminEvent = { id: string; name: string; bookings: Booking[] };
type AdminDay = { id: string; name: string; events: AdminEvent[] };
type AdminClient = {
  id: string;
  name: string;
  wedding: { name: string } | null;
  totals: {
    finalTotal: number;
    vendorTotal: number;
    feeTotal: number;
    bookingCount: number;
    pricedCount: number;
  };
  days: AdminDay[];
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";
const CATEGORY_COLORS = [
  "#C9A96E",
  "#D4A0A0",
  "#A4AC86",
  "#9CAF88",
  "#656D4A",
  "#D4A843",
  "#C4956A",
];

function lakh(value: number) {
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  return `₹${(value / 100000).toFixed(1)}L`;
}

export default function AdminRevenuePage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/pricing");
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Failed to load");
        if (!cancelled) setClients((json.clients ?? []) as AdminClient[]);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load fee data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    let finalTotal = 0;
    let vendorTotal = 0;
    let feeTotal = 0;
    let bookings = 0;
    let priced = 0;
    let published = 0;
    const byCategory = new Map<
      string,
      { finalTotal: number; vendorTotal: number; feeTotal: number; count: number }
    >();

    for (const client of clients) {
      for (const day of client.days) {
        for (const event of day.events) {
          for (const booking of event.bookings) {
            bookings += 1;
            if (booking.pricePublished) published += 1;

            const category = byCategory.get(booking.categoryName) ?? {
              finalTotal: 0,
              vendorTotal: 0,
              feeTotal: 0,
              count: 0,
            };
            category.count += 1;

            if (booking.finalPrice != null) {
              finalTotal += booking.finalPrice;
              vendorTotal += booking.listedPrice ?? 0;
              feeTotal += booking.fee ?? 0;
              priced += 1;
              category.finalTotal += booking.finalPrice;
              category.vendorTotal += booking.listedPrice ?? 0;
              category.feeTotal += booking.fee ?? 0;
            }
            byCategory.set(booking.categoryName, category);
          }
        }
      }
    }

    const categories = [...byCategory.entries()]
      .map(([name, values], index) => ({
        name,
        ...values,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((left, right) => right.feeTotal - left.feeTotal);

    const clientRows = clients
      .filter((client) => client.totals.bookingCount > 0)
      .map((client) => ({
        id: client.id,
        name: client.name,
        wedding: client.wedding?.name ?? "—",
        ...client.totals,
      }))
      .sort((left, right) => right.feeTotal - left.feeTotal);

    return {
      finalTotal,
      vendorTotal,
      feeTotal,
      bookings,
      priced,
      published,
      categories,
      clientRows,
    };
  }, [clients]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className={dashLabel}>Loading fee intelligence...</p>
      </div>
    );
  }

  const maxCategoryFee = Math.max(1, ...data.categories.map((category) => category.feeTotal));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative p-6 md:p-8">
          <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
            Fee intelligence
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-5xl leading-none text-gold-primary">
              {lakh(data.feeTotal)}
            </span>
            <span className="pb-1 font-heading text-sm text-ivory/70">
              Elysian fee
              <span className="block text-xs text-ivory/50">
                Across {data.priced} fixed-price vendor picks
              </span>
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-ivory/10 bg-ivory/10 sm:grid-cols-4">
            <DarkFig label="Final value" value={lakh(data.finalTotal)} />
            <DarkFig label="Vendor base" value={lakh(data.vendorTotal)} />
            <DarkFig label="Picks priced" value={`${data.priced}/${data.bookings}`} />
            <DarkFig label="Published" value={String(data.published)} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="border border-charcoal/10 bg-ivory p-5">
          <p className={dashLabel}>Fee by category</p>
          {data.categories.length === 0 ? (
            <p className="mt-3 text-sm text-slate">No priced vendor picks yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.categories.map((category) => (
                <li key={category.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate text-charcoal">{category.name}</span>
                    </span>
                    <span className="shrink-0 font-display text-sm text-gold-dark">
                      {category.feeTotal > 0 ? formatCurrency(category.feeTotal) : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(category.feeTotal / maxCategoryFee) * 100}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-charcoal/10 bg-ivory">
          <div className="border-b border-charcoal/8 p-4">
            <p className={dashLabel}>Fee by client</p>
          </div>
          {data.clientRows.length === 0 ? (
            <p className="p-5 text-sm text-slate">No client bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-charcoal/8 text-left">
                    {["Client", "Final price", "Vendor base", "Fee", "Picks"].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-2.5 font-accent text-[9px] uppercase tracking-[0.14em] text-slate"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clientRows.map((row) => (
                    <tr key={row.id} className="border-b border-charcoal/6 last:border-0">
                      <td className="px-4 py-3">
                        <p className="truncate font-heading text-charcoal">{row.name}</p>
                        <p className="truncate text-[11px] text-slate">{row.wedding}</p>
                      </td>
                      <td className="px-4 py-3 text-charcoal">
                        {row.finalTotal > 0 ? formatCurrency(row.finalTotal) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate">
                        {row.vendorTotal > 0 ? formatCurrency(row.vendorTotal) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-display", row.feeTotal > 0 ? "text-gold-dark" : "text-slate")}>
                          {row.feeTotal > 0 ? formatCurrency(row.feeTotal) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-accent text-[10px] uppercase tracking-[0.12em]",
                            row.pricedCount < row.bookingCount ? "text-gold-dark" : "text-sage"
                          )}
                        >
                          {row.pricedCount}/{row.bookingCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DarkFig({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-midnight p-4">
      <p className="font-accent text-[9px] uppercase tracking-[0.16em] text-ivory/50">{label}</p>
      <p className="mt-1 font-display text-xl text-ivory">{value}</p>
    </div>
  );
}
