import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach Elysian Celebrations to begin planning your destination wedding—share your vision, dates, and guest count.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-ivory px-[var(--section-padding-x)] py-[var(--section-padding-y)] text-charcoal">
      <div className="mx-auto max-w-xl">
        <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">Contact</p>
        <h1
          className="font-display mt-4 font-semibold"
          style={{ fontSize: "var(--text-display)" }}
        >
          Begin the conversation
        </h1>
        <p className="font-heading mt-4 text-lg font-light text-slate">
          Share a few details—we will respond with next steps and a clear timeline.
        </p>
        <div className="mt-12">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
