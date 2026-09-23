import type { ReactNode } from "react";

type DashboardVisualHeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  imageUrl: string;
  aside?: ReactNode;
  children?: ReactNode;
};

export function DashboardVisualHero({
  eyebrow,
  title,
  description,
  imageUrl,
  aside,
  children,
}: DashboardVisualHeroProps) {
  return (
    <section className="relative min-h-[18rem] overflow-hidden border border-charcoal/10 bg-charcoal-brown text-ivory shadow-[0_24px_80px_rgba(51,61,41,0.08)]">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(51,61,41,.98) 0%,rgba(51,61,41,.78) 48%,rgba(51,61,41,.28) 100%),url(${imageUrl})`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(182,173,144,0.28),transparent_46%)]"
      />
      <div className="relative grid min-h-[18rem] gap-8 p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-9">
        <div className="max-w-3xl">
          <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-khaki-beige">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ivory md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl font-heading text-sm leading-7 text-ivory/70 md:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {aside ? <div className="justify-self-start md:justify-self-end">{aside}</div> : null}
      </div>
      {children ? (
        <div className="relative flex flex-wrap gap-2 border-t border-ivory/12 px-4 py-3 md:px-9">
          {children}
        </div>
      ) : null}
    </section>
  );
}
