import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getPostBySlug } from "@/data/blog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post" };
  return {
    title: `${post.title} | Elysian Celebrations`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <article>
        <header className="relative bg-midnight">
          <div className="relative aspect-[21/10] min-h-[220px] w-full md:min-h-[320px]">
            <Image
              src={post.coverImage}
              alt=""
              fill
              className="object-cover opacity-90"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
            <div className="absolute bottom-0 left-0 w-full px-[var(--section-padding-x)] pb-10 pt-16 md:pb-14">
              <p className="font-accent text-xs uppercase tracking-[0.35em] text-gold-light">
                {new Date(post.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                <span className="text-ivory/50"> · </span>
                {post.readingMinutes} min read
              </p>
              <h1
                className="font-display mt-4 max-w-4xl text-ivory"
                style={{ fontSize: "var(--text-h1)" }}
              >
                {post.title}
              </h1>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
          <div className="font-heading flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-gold-light/60 bg-cream/60 px-3 py-1 text-xs text-charcoal"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="font-heading mt-10 space-y-6 text-lg font-light leading-relaxed text-slate">
            {post.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <p className="font-accent mt-12 text-center text-xs uppercase tracking-[0.25em] text-gold-dark">
            — The Elysian team
          </p>
        </div>
      </article>

      <section className="border-t border-gold-light/40 bg-cream/50 px-[var(--section-padding-x)] py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-center text-charcoal" style={{ fontSize: "var(--text-h2)" }}>
            Related posts
          </h2>
          <ul className="mt-10 grid list-none grid-cols-1 gap-8 pl-0 md:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/blog/${r.slug}`}
                  data-cursor="pointer"
                  className="group block rounded-xl border border-charcoal/10 bg-ivory/90 p-6 shadow-sm transition hover:border-gold-primary/40"
                >
                  <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
                    {new Date(r.date).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <h3 className="font-display mt-2 text-xl text-charcoal group-hover:text-gold-dark">
                    {r.title}
                  </h3>
                  <p className="font-heading mt-2 line-clamp-2 text-sm text-slate">{r.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 text-center">
            <Link
              href="/blog"
              data-cursor="pointer"
              className="font-accent inline-flex text-sm uppercase tracking-[0.2em] text-gold-primary underline-offset-4 hover:underline"
            >
              ← Back to journal
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
