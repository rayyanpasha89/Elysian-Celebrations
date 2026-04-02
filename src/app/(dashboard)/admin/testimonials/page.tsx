"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type TestimonialRow = {
  id: string;
  coupleName: string;
  destination: string;
  quote: string;
  image: string | null;
  isPublished: boolean;
  sortOrder: number;
};

export default function AdminTestimonialsPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/testimonials");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = (json.testimonials ?? []) as {
      id: string;
      couple_name: string;
      destination: string;
      quote: string;
      image: string | null;
      is_published: boolean;
      sort_order: number;
    }[];
    setTestimonials(raw.map((t) => ({
      id: t.id,
      coupleName: t.couple_name,
      destination: t.destination,
      quote: t.quote,
      image: t.image,
      isPublished: t.is_published,
      sortOrder: t.sort_order,
    })));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await load(); }
      catch { if (!cancelled) toast.error("Could not load testimonials"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePublish = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success(current ? "Testimonial hidden" : "Testimonial published");
    } catch {
      toast.error("Update failed");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return testimonials;
    return testimonials.filter(
      (t) =>
        t.coupleName.toLowerCase().includes(s) ||
        t.destination.toLowerCase().includes(s)
    );
  }, [q, testimonials]);

  const published = testimonials.filter((t) => t.isPublished).length;

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
        <p className={dashLabel}>Content</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Testimonials</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total" value={testimonials.length} />
        <StatCard label="Published" value={published} />
        <StatCard label="Hidden" value={testimonials.length - published} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <label htmlFor="testimonial-search" className={dashLabel}>Search</label>
        <input
          id="testimonial-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Couple name, destination"
          className="mt-3 w-full max-w-md border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState
          title={q.trim() ? "No testimonials match your search" : "No testimonials yet"}
          hint={q.trim() ? "Try a different couple name or destination." : "Testimonials will appear here once added."}
        />
      ) : (
        <motion.div variants={fadeUp} className="mt-10 grid gap-4 lg:grid-cols-2">
          {filtered.map((t) => (
            <div key={t.id} className="border border-charcoal/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-base font-semibold text-charcoal">{t.coupleName}</p>
                  <p className="mt-0.5 font-heading text-xs text-slate">{t.destination}</p>
                </div>
                <span className={cn(
                  statusBadgeBase,
                  t.isPublished ? "border-sage/70 text-sage" : "border-charcoal/30 text-slate"
                )}>
                  {t.isPublished ? "Published" : "Hidden"}
                </span>
              </div>

              <blockquote className="mt-4 border-l-2 border-gold-primary/40 pl-4 font-heading text-sm italic text-slate leading-relaxed line-clamp-3">
                {t.quote}
              </blockquote>

              <button
                type="button"
                onClick={() => void togglePublish(t.id, t.isPublished)}
                className="font-accent mt-5 border border-charcoal/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
              >
                {t.isPublished ? "Hide" : "Publish"}
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
