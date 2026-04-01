"use client";

import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

const footerLinks = {
  explore: [
    { label: "Destinations", href: "/#destinations" },
    { label: "Packages", href: "/#packages" },
    { label: "Vendors", href: "/#vendors" },
    { label: "Gallery", href: "/gallery" },
  ],
  company: [
    { label: "About Us", href: "/#about" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Blog", href: "/blog" },
    { label: "FAQ", href: "/faq" },
  ],
  portals: [
    { label: "Client Portal", href: "/client" },
    { label: "Vendor Portal", href: "/vendor" },
    { label: "Admin Console", href: "/admin" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ],
};

const quickActions = [
  {
    label: "Start an inquiry",
    href: "/contact",
    detail: "Tell us the destination, guest count, and mood.",
  },
  {
    label: "Client dashboard",
    href: "/client",
    detail: "Track budget, guests, and bookings in one workspace.",
  },
  {
    label: "Vendor partnership",
    href: "/vendor",
    detail: "Manage profile, services, and inquiries cleanly.",
  },
];

export function Footer() {
  return (
    <footer className="noise-dark relative overflow-hidden bg-midnight text-ivory/80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.14),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(123,167,201,0.12),transparent_22%),linear-gradient(180deg,rgba(26,26,46,0.15),rgba(26,26,46,0.82))]" />

      <div className="relative z-10 mx-auto max-w-7xl px-[var(--section-padding-x)] py-18 lg:py-24">
        <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="relative overflow-hidden border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.1),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(123,167,201,0.08),transparent_24%)]" />
            <div className="relative">
            <p className="font-accent text-[11px] uppercase tracking-[0.3em] text-gold-primary">
              Elysian Celebrations
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-ivory md:text-5xl">
              Build the wedding with the same care as the celebration itself.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ivory/62">
              Destination planning, budget control, guest logistics, and curated
              vendor intelligence in a single experience that feels considered from
              the first inquiry onward.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <FooterAction href="/contact" label="Begin planning" />
              <FooterAction href="/client" label="Open client workspace" />
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Premium destination curation",
                "Budget intelligence in one flow",
                "Vendor, guest, and event orchestration",
              ].map((value) => (
                <div
                  key={value}
                  className="border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-ivory/68"
                >
                  {value}
                </div>
              ))}
            </div>
            </div>
          </div>

          <div className="grid gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-gold-primary/35 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl text-ivory">
                      {action.label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ivory/58">
                      {action.detail}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-gold-light transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-10 border-t border-white/10 pt-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <div>
              <span className="font-display text-3xl font-bold text-ivory">
                Elysian
              </span>
              <span className="block font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">
                Celebrations
              </span>
            </div>

            <div className="mt-6 space-y-3 text-sm text-ivory/58">
              <a
                href="mailto:hello@elysiancelebrations.com"
                className="flex items-center gap-3 transition-colors hover:text-gold-light"
              >
                <Mail className="h-4 w-4 text-gold-primary" />
                hello@elysiancelebrations.com
              </a>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-3 transition-colors hover:text-gold-light"
              >
                <Phone className="h-4 w-4 text-gold-primary" />
                +91 98765 43210
              </a>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gold-primary" />
                India
              </div>
              </div>
            </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title} className="border border-white/8 bg-white/[0.02] p-5">
                <h3 className="font-accent text-[11px] uppercase tracking-[0.22em] text-gold-primary">
                  {title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-ivory/62 transition-colors duration-300 hover:text-ivory"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-ivory/38">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Elysian Celebrations. All rights reserved.</p>
            <p className="font-accent uppercase tracking-[0.18em] text-ivory/28">
              Destination wedding planning system
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="font-accent inline-flex items-center gap-2 border border-gold-primary/40 bg-gold-primary/8 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-gold-light transition-all duration-300 hover:bg-gold-primary hover:text-midnight"
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}
