"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Role = "CLIENT" | "VENDOR" | "ADMIN" | "MANAGER";
type Tab = "All" | Role;

const tabs: Tab[] = ["All", "CLIENT", "VENDOR", "ADMIN", "MANAGER"];

function roleBadge(r: Role) {
  return cn(
    statusBadgeBase,
    r === "ADMIN" && "border-midnight/40 text-midnight",
    r === "MANAGER" && "border-sage/60 text-sage",
    r === "VENDOR" && "border-gold-primary/50 text-gold-dark",
    r === "CLIENT" && "border-charcoal/25 text-charcoal"
  );
}

function statusBadge(active: boolean) {
  return cn(statusBadgeBase, active ? "border-sage/60 text-sage" : "border-charcoal/25 text-slate");
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  joined: string;
};

export default function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = json.users ?? [];
    return raw.map(
      (u: {
        id: string;
        name: string;
        email: string;
        role: string;
        is_active: boolean;
        created_at: string;
      }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as Role,
        active: u.is_active,
        joined: u.created_at,
      })
    ) as UserRow[];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mapped = await loadUsers();
        if (!cancelled) setUsers(mapped);
      } catch {
        if (!cancelled) {
          setUsers([]);
          toast.error("Could not load users");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const patchUser = async (id: string, updates: { isActive?: boolean; role?: string }) => {
    setUpdatingUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const patch = {
        ...(updates.isActive !== undefined ? { active: updates.isActive } : {}),
        ...(updates.role !== undefined ? { role: updates.role as Role } : {}),
      };

      setUsers((current) =>
        current.map((user) => user.id === id ? { ...user, ...patch } : user)
      );
      if (selectedUser?.id === id) {
        setSelectedUser((current) => current ? { ...current, ...patch } : current);
      }

      if (updates.role) toast.success(`Role changed to ${updates.role.toLowerCase()}`);
      else toast.success(updates.isActive ? "User reactivated" : "User suspended");
    } catch {
      toast.error("Failed to update user");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filtered = useMemo(() => {
    if (tab === "All") return users;
    return users.filter((u) => u.role === tab);
  }, [tab, users]);

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
                  active ? "-mb-px border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal"
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
        <motion.div variants={fadeUp} className="mt-10 space-y-6">
          <div className="scrollbar-elysian overflow-x-auto">
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
                  <tr
                    key={u.id}
                    className={cn(
                      "border-b border-charcoal/8 transition-colors",
                      selectedUser?.id === u.id && "bg-gold-primary/5"
                    )}
                  >
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
                          onClick={() => setSelectedUser(u)}
                          className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={updatingUserId === u.id}
                          onClick={() => void patchUser(u.id, { isActive: !u.active })}
                          className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal/70 transition-colors hover:border-error hover:text-error disabled:opacity-50"
                        >
                          {u.active ? "Suspend" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedUser ? (
            <div className="border border-charcoal/8 bg-ivory p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={dashLabel}>User details</p>
                  <h3 className="font-display mt-2 text-2xl text-charcoal">{selectedUser.name}</h3>
                  <p className="mt-1 text-sm text-slate">{selectedUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void patchUser(selectedUser.id, { isActive: !selectedUser.active })}
                  className="font-accent border border-gold-primary px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
                >
                  {selectedUser.active ? "Suspend user" : "Reactivate user"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div>
                  <p className={dashLabel}>Role</p>
                  <select
                    value={selectedUser.role}
                    disabled={updatingUserId === selectedUser.id}
                    onChange={(e) => void patchUser(selectedUser.id, { role: e.target.value })}
                    className="mt-2 w-full border border-charcoal/15 bg-ivory px-3 py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary disabled:opacity-50"
                  >
                    {(["CLIENT", "VENDOR", "MANAGER", "ADMIN"] as Role[]).map((r) => (
                      <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className={dashLabel}>Status</p>
                  <p className="mt-2 text-sm text-charcoal">{selectedUser.active ? "Active" : "Suspended"}</p>
                </div>
                <div>
                  <p className={dashLabel}>Joined</p>
                  <p className="mt-2 text-sm text-charcoal">
                    {new Date(selectedUser.joined).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <p className="mt-6 break-all text-xs text-slate">ID: {selectedUser.id}</p>
            </div>
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
}
