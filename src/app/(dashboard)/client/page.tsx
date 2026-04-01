"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { StatCard } from "@/components/dashboard/stat-card";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";

type ClientDashboardPayload = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    destinationName: string | null;
    status: string;
  } | null;
  stats: {
    daysUntil: number;
    budgetPercent: number;
    vendorsBooked: number;
    guestsConfirmed: number;
  };
  tasks: { id: string; title: string; due: string; done: boolean }[];
  recentNotifications: { id: string; text: string; time: string }[];
  needsOnboarding?: boolean;
  needsProfile?: boolean;
  subtitle?: string;
};

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-48 bg-charcoal/10" />
        <div className="h-4 w-96 max-w-full bg-charcoal/5" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 border border-charcoal/8 bg-charcoal/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 h-72 border border-charcoal/8 bg-charcoal/5" />
        <div className="lg:col-span-2 h-72 border border-charcoal/8 bg-charcoal/5" />
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/client");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !data) return;
    if (data.needsOnboarding || data.needsProfile) {
      router.replace("/client/onboarding");
    }
  }, [loading, data, router]);

  if (!userLoaded || loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="mx-auto max-w-6xl border border-rose/20 bg-ivory p-6 text-charcoal">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  if (data.needsOnboarding || data.needsProfile) {
    return <DashboardSkeleton />;
  }

  const firstName = user?.firstName ?? "there";
  const stats = [
    { label: "Days Until Wedding", value: data.stats.daysUntil },
    { label: "Budget Used", value: data.stats.budgetPercent, suffix: "%" },
    { label: "Vendors Booked", value: data.stats.vendorsBooked },
    { label: "Guests Confirmed", value: data.stats.guestsConfirmed },
  ];

  const subtitle =
    data.subtitle ??
    (data.wedding
      ? "Your planning snapshot."
      : "Set up your wedding to unlock planning tools.");

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          Welcome back, {firstName}
        </h2>
        <p className="mt-1 font-heading text-base font-light text-slate">
          {subtitle}
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={staggerItem}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 border border-charcoal/8 bg-ivory p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              Upcoming Tasks
            </h3>
            <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-primary">
              {data.tasks.filter((t) => !t.done).length} remaining
            </span>
          </div>
          <ul className="space-y-3">
            {data.tasks.length === 0 ? (
              <li className="text-sm text-slate">No upcoming tasks.</li>
            ) : (
              data.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between border-b border-charcoal/5 pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-4 w-4 cursor-pointer items-center justify-center border border-charcoal/20 transition-colors hover:border-gold-primary">
                      {task.done && (
                        <div className="h-2 w-2 bg-gold-primary" />
                      )}
                    </div>
                    <span className="text-sm text-charcoal">{task.title}</span>
                  </div>
                  <span className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {task.due}
                  </span>
                </li>
              ))
            )}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 border border-charcoal/8 bg-ivory p-6"
        >
          <h3 className="mb-6 font-display text-lg font-semibold text-charcoal">
            Recent Activity
          </h3>
          <ul className="space-y-4">
            {data.recentNotifications.length === 0 ? (
              <li className="text-sm text-slate">No recent notifications.</li>
            ) : (
              data.recentNotifications.map((item) => (
                <li
                  key={item.id}
                  className="border-l-2 border-gold-primary/20 pl-4"
                >
                  <p className="text-sm leading-snug text-charcoal">
                    {item.text}
                  </p>
                  <p className="mt-1 font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
                    {item.time}
                  </p>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
