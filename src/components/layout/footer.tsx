"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const footerLinks = {
  explore: [
    { label: "Destinations", href: "#destinations" },
    { label: "Packages", href: "#packages" },
    { label: "Vendors", href: "#vendors" },
    { label: "Gallery", href: "#gallery" },
  ],
  company: [
    { label: "About Us", href: "#about" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
  ],
  support: [
    { label: "Contact Us", href: "#contact" },
    { label: "FAQ", href: "/faq" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const socialLinks = [
  { label: "Instagram", href: "#", svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  { label: "Facebook", href: "#", svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { label: "YouTube", href: "#", svg: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
];

export function Footer() {
  return (
    <footer className="noise-dark bg-midnight text-ivory/80">
      <div className="mx-auto max-w-7xl px-[var(--section-padding-x)] py-16 lg:py-24 relative z-10">
        {/* Top gold accent line */}
        <div className="mb-16 h-[1px] bg-gradient-to-r from-transparent via-gold-primary/20 to-transparent" />

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <span className="font-display text-3xl font-bold text-ivory">
                Elysian
              </span>
              <span className="block font-accent text-xs uppercase tracking-[0.3em] text-gold-primary">
                Celebrations
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ivory/60 mb-6">
              Curated destination weddings powered by technology and
              strengthened by hands-on planning. Your vision, our execution.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map(({ svg, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center border border-ivory/15 text-ivory/40 transition-all duration-300 hover:border-gold-primary/50 hover:text-gold-primary"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d={svg} /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-accent text-xs uppercase tracking-[0.2em] text-gold-primary mb-6">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ivory/60 transition-colors duration-300 hover:text-ivory"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Row */}
        <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-ivory/10 pt-8 text-sm text-ivory/50">
          <a href="mailto:hello@elysiancelebrations.com" className="flex items-center gap-2 hover:text-gold-primary transition-colors">
            <Mail size={14} />
            hello@elysiancelebrations.com
          </a>
          <a href="tel:+919876543210" className="flex items-center gap-2 hover:text-gold-primary transition-colors">
            <Phone size={14} />
            +91 98765 43210
          </a>
          <span className="flex items-center gap-2">
            <MapPin size={14} />
            India
          </span>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-ivory/10 pt-8 text-center text-xs text-ivory/40">
          <p>&copy; {new Date().getFullYear()} Elysian Celebrations. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
