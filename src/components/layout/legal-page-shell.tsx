import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalPageShell({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-cream">
      <section className="relative overflow-hidden bg-midnight px-[var(--section-padding-x)] pb-20 pt-36 text-ivory">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(201,169,110,0.18),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(123,167,201,0.12),transparent_24%),linear-gradient(180deg,#10101a_0%,#16182a_100%)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-light">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.95] md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl font-heading text-lg leading-relaxed text-ivory/72">
            {intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/"
              className="font-accent inline-flex items-center border border-ivory/15 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-ivory transition-colors hover:border-gold-primary hover:text-gold-light"
            >
              Back to home
            </Link>
            <Link
              href="/contact"
              className="font-accent inline-flex items-center border border-gold-primary px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-gold-light transition-colors hover:bg-gold-primary hover:text-midnight"
            >
              Contact the studio
            </Link>
          </div>
        </div>
      </section>

      <section className="px-[var(--section-padding-x)] py-[var(--section-padding-y)]">
        <div className="mx-auto max-w-5xl space-y-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className="border border-charcoal/8 bg-ivory p-8 shadow-[0_18px_60px_rgba(26,26,46,0.05)]"
            >
              <h2 className="font-display text-3xl text-charcoal">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="font-heading text-base leading-relaxed text-slate"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
