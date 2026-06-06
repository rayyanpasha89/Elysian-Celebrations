"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/animations/variants";
import type { BlogPost } from "@/data/blog";
import { cn } from "@/lib/utils";

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  const [tag, setTag] = useState<string | "all">("all");

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const t of post.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }, [posts]);

  const filtered = useMemo(
    () => (tag === "all" ? posts : posts.filter((post) => post.tags.includes(tag))),
    [posts, tag]
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex flex-col gap-4 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <FilterChip
            label="All"
            count={posts.length}
            active={tag === "all"}
            onClick={() => setTag("all")}
          />
          {tags.map((entry) => (
            <FilterChip
              key={entry.value}
              label={entry.value}
              count={entry.count}
              active={tag === entry.value}
              onClick={() => setTag(entry.value)}
            />
          ))}
        </div>
        <p className="text-center font-accent text-[10px] uppercase tracking-[0.2em] text-slate sm:text-right">
          {filtered.length} {filtered.length === 1 ? "story" : "stories"}
        </p>
      </div>

      <motion.ul
        key={tag}
        className="grid list-none grid-cols-1 gap-10 gap-x-12 pl-0 md:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {filtered.map((post) => (
          <motion.li key={post.slug} variants={staggerItem}>
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold-light/40 bg-cream/40 shadow-sm transition hover:shadow-md">
              <Link
                href={`/blog/${post.slug}`}
                data-cursor="pointer"
                className="flex h-full flex-col"
              >
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, hsl(220, 24%, 18%) 0%, hsl(35, 28%, 22%) 100%)`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/70 to-transparent opacity-80 transition group-hover:opacity-90" />
                  <span className="font-accent absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-charcoal backdrop-blur-sm">
                    {new Date(post.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-accent absolute right-4 top-4 rounded-full bg-midnight/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ivory backdrop-blur-sm">
                    {post.readingMinutes} min read
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.tags.map((postTag) => (
                      <span
                        key={postTag}
                        className="font-accent border border-gold-primary/30 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-gold-dark"
                      >
                        {postTag}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-display text-xl font-semibold text-charcoal transition group-hover:text-gold-dark md:text-2xl">
                    {post.title}
                  </h2>
                  <p className="font-heading mt-3 flex-1 text-sm font-light leading-relaxed text-slate">
                    {post.excerpt}
                  </p>
                  <span className="font-accent mt-6 inline-flex text-xs uppercase tracking-[0.2em] text-gold-primary">
                    Read more →
                  </span>
                </div>
              </Link>
            </article>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 border px-3.5 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
        active
          ? "border-gold-primary bg-gold-primary/12 text-charcoal"
          : "border-charcoal/12 bg-ivory text-slate hover:border-gold-primary/45 hover:text-charcoal"
      )}
    >
      {label}
      <span className={cn("text-[9px]", active ? "text-gold-dark" : "text-slate/60")}>
        {count}
      </span>
    </button>
  );
}
