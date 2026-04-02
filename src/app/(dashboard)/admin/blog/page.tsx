"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author: string;
  tags: string[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminBlogPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/blog");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const raw = (json.posts ?? []) as {
      id: string;
      title: string;
      slug: string;
      excerpt: string | null;
      author: string;
      tags: string[];
      is_published: boolean;
      published_at: string | null;
      created_at: string;
    }[];
    setPosts(raw.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      author: p.author,
      tags: p.tags ?? [],
      isPublished: p.is_published,
      publishedAt: p.published_at,
      createdAt: p.created_at,
    })));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await load(); }
      catch { if (!cancelled) toast.error("Could not load blog posts"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePublish = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success(current ? "Post unpublished" : "Post published");
    } catch {
      toast.error("Update failed");
    }
  };

  const deletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      toast.success("Post deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.author.toLowerCase().includes(s) ||
        p.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [q, posts]);

  const published = posts.filter((p) => p.isPublished).length;

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
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Blog Posts</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total posts" value={posts.length} />
        <StatCard label="Published" value={published} />
        <StatCard label="Drafts" value={posts.length - published} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <label htmlFor="blog-search" className={dashLabel}>Search</label>
        <input
          id="blog-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, author, tag"
          className="mt-3 w-full max-w-md border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary"
        />
      </motion.div>

      {filtered.length === 0 ? (
        <ListEmptyState
          title={q.trim() ? "No posts match your search" : "No blog posts yet"}
          hint={q.trim() ? "Try a different title or author." : "Blog posts will appear here once created."}
        />
      ) : (
        <motion.div variants={fadeUp} className="scrollbar-elysian mt-10 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-charcoal/15">
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Title</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Author</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Tags</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Status</th>
                <th className={cn(dashLabel, "pb-3 pr-4 font-normal")}>Published</th>
                <th className={cn(dashLabel, "pb-3 font-normal")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-charcoal/8">
                  <td className="py-4 pr-4 font-heading text-sm text-charcoal max-w-[240px] truncate">{p.title}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{p.author}</td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">
                    {p.tags.length > 0 ? p.tags.slice(0, 2).join(", ") : "—"}
                  </td>
                  <td className="py-4 pr-4">
                    <span className={cn(
                      statusBadgeBase,
                      p.isPublished ? "border-sage/70 text-sage" : "border-gold-primary/70 text-gold-dark"
                    )}>
                      {p.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-4 pr-4 font-heading text-sm text-slate">{formatDate(p.publishedAt)}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void togglePublish(p.id, p.isPublished)}
                        className="font-accent border border-charcoal/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-charcoal hover:border-gold-primary"
                      >
                        {p.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePost(p.id)}
                        className="font-accent border border-error/30 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-error hover:border-error"
                      >
                        Delete
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
