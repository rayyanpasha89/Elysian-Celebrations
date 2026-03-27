"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Role = "CLIENT" | "VENDOR" | "ADMIN";
type Tab = "All" | Role;

const users: {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  joined: string;
}[] = [
  { id: "1", name: "Priya Sharma", email: "priya@email.com", role: "CLIENT", active: true, joined: "2024-08-12" },
  { id: "2", name: "Lens & Light Studios", email: "hello@lenslight.studio", role: "VENDOR", active: true, joined: "2024-05-02" },
  { id: "3", name: "Deeksha Nair", email: "deeksha@elysian.test", role: "ADMIN", active: true, joined: "2023-01-15" },
  { id: "4", name: "Nova Decor House", email: "studio@nova.test", role: "VENDOR", active: true, joined: "2024-11-20" },
  { id: "5", name: "James Miller", email: "jm@email.com", role: "CLIENT", active: false, joined: "2024-03-08" },
  { id: "6", name: "Spice Route", email: "events@spiceroute.test", role: "VENDOR", active: true, joined: "2024-07-01" },
];

const tabs: Tab[] = ["All", "CLIENT", "VENDOR", "ADMIN"];

function roleBadge(r: Role) {
  return cn(
    statusBadgeBase,
    r === "ADMIN" && "border-midnight/40 text-midnight",
    r === "VENDOR" && "border-gold-primary/50 text-gold-dark",
    r === "CLIENT" && "border-charcoal/25 text-charcoal",
  );
}

function statusBadge(active: boolean) {
  return cn(statusBadgeBase, active ? "border-sage/60 text-sage" : "border-charcoal/25 text-slate");
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>("All");

  const filtered = useMemo(() => {
    if (tab === "All") return users;
    return users.filter((u) => u.role === tab);
  }, [tab]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Directory</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Users</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-b border-charcoal/15">
        <div className="flex flex-wrap gap-0">
          {tabs.map((t) => {
            const active = tab === t;
            const label = t === "All" ? "All" : t.charAt(0) + t.slice(1).toLowerCase();
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "font-accent border-b-2 px-3 py-3 text-[10px] uppercase tracking-[0.15em] transition-colors md:px-4 md:text-[11px] md:tracking-[0.2em]",
                  active ? "-mb-px border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
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
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Role</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Status</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Joined</th>
                <th className={cn(dashLabel, "pb-3 font-normal")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-charcoal/8">
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal">{u.name}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{u.email}</td>
                  <td className="py-4 pr-4">
                    <span className={roleBadge(u.role)}>{u.role}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={statusBadge(u.active)}>{u.active ? "Active" : "Suspended"}</span>
                  </td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">
                    {new Date(u.joined).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal/70 hover:border-error hover:text-error"
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
  );
}
