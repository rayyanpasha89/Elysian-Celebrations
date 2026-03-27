"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/animations/variants";
import type { BlogPost } from "@/data/blog";

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <motion.ul
      className="mx-auto grid max-w-6xl list-none grid-cols-1 gap-10 gap-x-12 pl-0 md:grid-cols-2"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {posts.map((post) => (
        <motion.li key={post.slug} variants={staggerItem}>
          <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold-light/40 bg-cream/40 shadow-sm transition hover:shadow-md">
            <Link href={`/blog/${post.slug}`} data-cursor="pointer" className="flex h-full flex-col">
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
              </div>
              <div className="flex flex-1 flex-col p-6">
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
  );
}
