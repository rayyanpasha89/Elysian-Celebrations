import Link from "next/link";
import { ArrowUpRight, Layers3, Sparkles, WalletCards } from "lucide-react";

const pillars = [
  {
    icon: WalletCards,
    title: "Budget Intelligence",
    description:
      "Move from vague totals to a layered investment plan with targets, quotes, actuals, and payment visibility.",
    href: "/#packages",
  },
  {
    icon: Sparkles,
    title: "Vendor Curation",
    description:
      "Evaluate creative fit, service mix, and pricing without losing the aesthetic thread of the wedding.",
    href: "/#vendors",
  },
  {
    icon: Layers3,
    title: "Weekend Architecture",
    description:
      "Design the guest journey as a sequence of moments, not a collection of disconnected tasks.",
    href: "/#how-it-works",
  },
];

export function PlanningManifesto() {
  return (
    <section className="relative overflow-hidden bg-ivory py-[calc(var(--section-padding-y)*0.9)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(201,169,110,0.08),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(123,167,201,0.1),transparent_28%),linear-gradient(180deg,rgba(250,247,242,1)_0%,rgba(245,240,232,0.86)_100%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-[var(--section-padding-x)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
            Planning Manifesto
          </p>
          <h2
            className="mt-5 max-w-2xl font-display font-bold leading-[0.96] text-charcoal"
            style={{ fontSize: "var(--text-h1)" }}
          >
            The wedding should feel composed before it feels expensive.
          </h2>
          <p className="mt-6 max-w-xl font-heading text-lg leading-relaxed text-slate">
            We’re building a planning surface for couples who care about atmosphere,
            precision, and control. That means transparent financial structure,
            curated vendors, and a weekend narrative that is designed, not improvised.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/#how-it-works"
              className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-charcoal transition-all duration-300 hover:border-gold-primary hover:text-gold-dark"
            >
              See the flow
            </Link>
            <Link
              href="/contact"
              className="font-accent inline-flex items-center justify-center gap-2 border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-gold-primary transition-all duration-300 hover:bg-gold-primary hover:text-midnight"
            >
              Start an inquiry
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <Link
                key={pillar.title}
                href={pillar.href}
                className="group border border-charcoal/10 bg-white/75 p-6 shadow-[0_22px_60px_rgba(26,26,46,0.06)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-gold-primary/30 hover:shadow-[0_30px_80px_rgba(26,26,46,0.1)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold-primary/20 bg-gold-primary/10 text-gold-dark">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-display text-2xl text-charcoal">
                        {pillar.title}
                      </h3>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-charcoal/30 transition-colors duration-300 group-hover:text-gold-dark" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
