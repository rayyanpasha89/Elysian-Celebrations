import type { Metadata } from "next";
import { BlogPostGrid } from "@/components/marketing/blog/blog-post-grid";
import { blogPosts } from "@/data/blog";

export const metadata: Metadata = {
  title: "Journal | Elysian Celebrations",
  description:
    "Ideas, planning notes, and destination inspiration from the Elysian team—written for couples who care about craft.",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <header className="mx-auto max-w-4xl px-[var(--section-padding-x)] pb-10 pt-[var(--section-padding-y)] text-center md:pb-14">
        <p className="font-accent text-xs uppercase tracking-[0.35em] text-gold-primary">Journal</p>
        <h1
          className="font-display mt-4 text-charcoal"
          style={{ fontSize: "var(--text-display)" }}
        >
          Stories & Insights
        </h1>
        <p className="font-heading mx-auto mt-5 max-w-2xl text-lg font-light text-slate">
          Planning wisdom, destination notes, and the occasional love letter to good light.
        </p>
      </header>

      <div className="px-[var(--section-padding-x)] pb-[var(--section-padding-y)]">
        <BlogPostGrid posts={blogPosts} />
      </div>
    </main>
  );
}
