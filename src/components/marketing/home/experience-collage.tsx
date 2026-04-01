const collageMoments = [
  {
    label: "Arrival",
    title: "Guests should feel the world before they reach the ceremony.",
    copy:
      "Rooming, welcome notes, transport, and first-night mood all shape how the wedding begins to live in memory.",
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Ceremony",
    title: "The setting, the pacing, and the silence between moments matter.",
    copy:
      "The brief is never just florals or chairs. It is light, sound, movement, and what the photographs will feel like later.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Afterglow",
    title: "Dinner, speeches, and the late-night energy deserve the same care.",
    copy:
      "Luxury lands best when the emotional finish is as considered as the ceremony itself.",
    image:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
  },
];

export function ExperienceCollage() {
  return (
    <section className="noise relative overflow-hidden bg-midnight py-[calc(var(--section-padding-y)*0.95)] text-ivory">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(201,169,110,0.16),transparent_28%),radial-gradient(circle_at_82%_55%,rgba(123,167,201,0.12),transparent_26%),linear-gradient(180deg,#10111c_0%,#121723_100%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-end">
          <div>
            <p className="font-accent text-[11px] uppercase tracking-[0.32em] text-gold-primary">
              What We’re Really Designing
            </p>
            <h2
              className="mt-5 max-w-2xl font-display font-bold leading-[0.96] text-ivory"
              style={{ fontSize: "var(--text-h1)" }}
            >
              Not a sequence of tasks.
              <br />
              <span className="text-gold-primary">A sequence of feelings.</span>
            </h2>
            <p className="mt-6 max-w-xl font-heading text-lg leading-relaxed text-ivory/68">
              The strongest destination weddings feel cinematic because the planning
              behind them is spatial, emotional, and ruthlessly clear. Every guest
              transition, every vendor handoff, and every money decision should serve
              the same atmosphere.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {collageMoments.map((moment) => (
              <article
                key={moment.label}
                className="overflow-hidden border border-white/10 bg-white/[0.04] shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <div
                  className="aspect-[4/5] bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(10,12,20,0.08), rgba(10,12,20,0.34)), url(${moment.image})`,
                  }}
                />
                <div className="space-y-3 p-5">
                  <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-light">
                    {moment.label}
                  </p>
                  <h3 className="font-display text-2xl leading-tight text-ivory">
                    {moment.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ivory/62">{moment.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
