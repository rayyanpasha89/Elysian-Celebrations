"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  categoryName: string;
  vendorName: string;
  vendorCost: number | null;
  finalPrice: number | null;
  margin: number | null;
  pricePublished: boolean;
};
type AdminEvent = { id: string; name: string; bookings: Booking[] };
type AdminDay = { id: string; name: string; events: AdminEvent[] };
type AdminClient = {
  id: string;
  name: string;
  wedding: { name: string } | null;
  totals: { revenue: number; cost: number; margin: number; bookingCount: number; pricedCount: number };
  days: AdminDay[];
};

const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";
const CAT_COLORS = ["#C9A96E", "#D4A0A0", "#7BA7C9", "#9CAF88", "#8B7EC8", "#D4A843", "#C4956A", "#6B7280"];

function lakh(n: number) {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  return `₹${(n / 100000).toFixed(1)}L`;
}

export default function AdminRevenuePage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/pricing");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setClients((json.clients ?? []) as AdminClient[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load revenue");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const data = useMemo(() => {
    let revenue = 0,
      cost = 0,
      bookings = 0,
      priced = 0,
      published = 0;
    const byCategory = new Map<string, { revenue: number; cost: number; margin: number; count: number }>();
    const allBookings: { category: string; vendor: string; margin: number | null }[] = [];

    for (const c of clients) {
      for (const d of c.days)
        for (const e of d.events)
          for (const b of e.bookings) {
            bookings += 1;
            if (b.finalPrice != null) {
              revenue += b.finalPrice;
              priced += 1;
            }
            if (b.vendorCost != null) cost += b.vendorCost;
            if (b.pricePublished) published += 1;
            const cat = byCategory.get(b.categoryName) ?? { revenue: 0, cost: 0, margin: 0, count: 0 };
            cat.revenue += b.finalPrice ?? 0;
            cat.cost += b.vendorCost ?? 0;
            cat.margin += b.margin ?? 0;
            cat.count += 1;
            byCategory.set(b.categoryName, cat);
            allBookings.push({ category: b.categoryName, vendor: b.vendorName, margin: b.margin });
          }
    }

    const categories = [...byCategory.entries()]
      .map(([name, v], i) => ({ name, ...v, color: CAT_COLORS[i % CAT_COLORS.length] }))
      .sort((a, b) => b.margin - a.margin);

    const clientRows = clients
      .filter((c) => c.totals.bookingCount > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        wedding: c.wedding?.name ?? "—",
        ...c.totals,
        marginPct: c.totals.cost > 0 ? Math.round((c.totals.margin / c.totals.cost) * 100) : null,
      }))
      .sort((a, b) => b.margin - a.margin);

    return {
      revenue,
      cost,
      margin: revenue - cost,
      marginPct: cost > 0 ? Math.round(((revenue - cost) / cost) * 100) : 0,
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
        <p className={dashLabel}>Loading revenue...</p>
      </div>
    );
  }

  const maxCatMargin = Math.max(1, ...data.categories.map((c) => c.margin));

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden border border-charcoal/10 bg-midnight text-ivory">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.28),transparent_55%)]"
        />
        <div className="relative p-6 md:p-8">
          <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-gold-primary">
            Revenue dashboard
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-5xl leading-none text-gold-primary">
              {lakh(data.margin)}
            </span>
            <span className="pb-1 font-heading text-sm text-ivory/70">
              total margin
              <span className="block text-xs text-ivory/50">{data.marginPct}% on cost</span>
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-ivory/10 bg-ivory/10 sm:grid-cols-4">
            <DarkFig label="Revenue" value={lakh(data.revenue)} />
            <DarkFig label="Vendor cost" value={lakh(data.cost)} />
            <DarkFig label="Picks priced" value={`${data.priced}/${data.bookings}`} />
            <DarkFig label="Published" value={String(data.published)} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Margin by category */}
        <section className="border border-charcoal/10 bg-ivory p-5">
          <p className={dashLabel}>Margin by category</p>
          {data.categories.length === 0 ? (
            <p className="mt-3 text-sm text-slate">No priced picks yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.categories.map((c) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="truncate text-charcoal">{c.name}</span>
                    </span>
                    <span className="shrink-0 font-display text-sm text-gold-dark">{formatCurrency(c.margin)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.margin / maxCatMargin) * 100}%`, backgroundColor: c.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Margin by client */}
        <section className="border border-charcoal/10 bg-ivory">
          <div className="border-b border-charcoal/8 p-4">
            <p className={dashLabel}>Margin by client</p>
          </div>
          {data.clientRows.length === 0 ? (
            <p className="p-5 text-sm text-slate">No client bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-charcoal/8 text-left">
                    {["Client", "Revenue", "Cost", "Margin", "Picks"].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-accent text-[9px] uppercase tracking-[0.14em] text-slate">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clientRows.map((r) => (
                    <tr key={r.id} className="border-b border-charcoal/6 last:border-0">
                      <td className="px-4 py-3">
                        <p className="truncate font-heading text-charcoal">{r.name}</p>
                        <p className="truncate text-[11px] text-slate">{r.wedding}</p>
                      </td>
                      <td className="px-4 py-3 text-charcoal">{r.revenue > 0 ? formatCurrency(r.revenue) : "—"}</td>
                      <td className="px-4 py-3 text-slate">{r.cost > 0 ? formatCurrency(r.cost) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-display", r.margin > 0 ? "text-sage" : "text-slate")}>
                          {r.margin !== 0 ? formatCurrency(r.margin) : "—"}
                        </span>
                        {r.marginPct != null ? (
                          <span className="ml-1 text-[11px] text-slate">({r.marginPct}%)</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-accent text-[10px] uppercase tracking-[0.12em]",
                            r.pricedCount < r.bookingCount ? "text-gold-dark" : "text-sage"
                          )}
                        >
                          {r.pricedCount}/{r.bookingCount}
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
