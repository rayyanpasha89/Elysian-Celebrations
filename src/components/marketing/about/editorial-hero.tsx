export function EditorialAboutHero() {
  return (
    <section className="relative w-full bg-midnight px-[var(--section-padding-x)] pb-24 pt-[clamp(6rem,18vh,11rem)] md:pb-32 md:pt-[clamp(7rem,20vh,12rem)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(201,169,110,0.22),transparent)]" />
      <div className="relative mx-auto max-w-5xl">
        <p className="font-accent text-[11px] uppercase tracking-[0.35em] text-gold-primary">About</p>
        <h1
          className="font-display mt-8 max-w-4xl font-semibold leading-[1.05] text-ivory"
          style={{ fontSize: "clamp(2.75rem, 7vw, 5rem)" }}
        >
          The Story Behind{" "}
          <span className="text-gold-primary">Elysian</span>
        </h1>
        <p className="font-heading mt-10 max-w-2xl text-base font-light leading-relaxed text-ivory/72 md:text-lg">
          A studio built for couples who want clarity as much as beauty—where every decision is
          documented, every vendor vetted, and every moment held with intention.
        </p>
      </div>
    </section>
  );
}
