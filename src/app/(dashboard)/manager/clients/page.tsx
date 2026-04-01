"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  weddingName: string | null;
  weddingDate: string | null;
  destination: string | null;
  guestCount: number | null;
};

export default function ManagerClientsPage() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/clients");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) setClients(json.clients ?? []);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.weddingName?.toLowerCase().includes(s) ||
        c.destination?.toLowerCase().includes(s)
    );
  }, [q, clients]);

  const withWedding = clients.filter((c) => c.weddingName).length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-64 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Directory</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Clients</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total clients" value={clients.length} />
        <StatCard label="With wedding" value={withWedding} />
        <StatCard label="Pending setup" value={clients.length - withWedding} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <label htmlFor="client-search" className={dashLabel}>Search</label>
        <input
          id="client-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, email, wedding, destination"
          className="mt-3 w-full max-w-md border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState />
      ) : (
        <motion.div variants={fadeUp} className="scrollbar-elysian mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-charcoal/15">
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Name</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Email</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Wedding</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Date</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Destination</th>
                <th className={cn(dashLabel, "pb-3 font-normal")}>Guests</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-charcoal/8">
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal">{c.name ?? "—"}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{c.email}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal">{c.weddingName ?? "—"}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">
                    {c.weddingDate
                      ? new Date(c.weddingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{c.destination ?? "—"}</td>
                  <td className="py-4 font-heading text-sm text-slate">{c.guestCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
  );
}
