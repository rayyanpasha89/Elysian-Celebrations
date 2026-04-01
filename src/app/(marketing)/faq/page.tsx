const faqs = [
  {
    question: "What does Elysian actually handle?",
    answer:
      "We combine destination planning, budget structure, vendor coordination, guest logistics, and timeline visibility so couples are not juggling separate tools and disconnected vendors.",
  },
  {
    question: "Do you only work on destination weddings?",
    answer:
      "Destination celebrations are the core focus. The experience, vendor curation, and planning system are all designed around multi-event wedding weekends and travel-heavy logistics.",
  },
  {
    question: "Can we start before every detail is finalized?",
    answer:
      "Yes. The platform is designed to help shape the plan progressively, starting from destination, guest count, and budget posture before every venue, service, or event is locked.",
  },
  {
    question: "How is budgeting handled?",
    answer:
      "The planning flow separates target allocation, quoted spend, actual spend, and paid amounts. That makes drift visible earlier than a static spreadsheet typically would.",
  },
  {
    question: "How quickly do you respond to inquiries?",
    answer:
      "Inquiry requests through the site are reviewed quickly, and the contact flow is meant to start a structured planning conversation rather than a vague lead form exchange.",
  },
];

export default function FAQPage() {
  return (
    <section className="relative overflow-hidden bg-ivory py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(123,167,201,0.08),transparent_24%)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-[var(--section-padding-x)]">
        <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
          Support
        </p>
        <h1 className="mt-4 font-display text-5xl text-charcoal md:text-6xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-5 max-w-2xl font-heading text-lg leading-relaxed text-slate">
          The planning model, platform scope, and inquiry flow in one place.
        </p>

        <div className="mt-16 space-y-5">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="border border-charcoal/8 bg-ivory/90 p-6 shadow-[0_18px_70px_rgba(17,24,39,0.05)]"
            >
              <h2 className="font-display text-2xl text-charcoal">
                {faq.question}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
