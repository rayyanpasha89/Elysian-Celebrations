"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { MagneticButton } from "@/components/shared/magnetic-button";
import { NavSignIn } from "@/components/layout/nav-sign-in";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Destinations", href: "/#destinations" },
  { label: "Packages", href: "/#packages" },
  { label: "Vendors", href: "/#vendors" },
  { label: "About", href: "/#about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/#contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
        className="fixed inset-x-0 top-0 z-[10020]"
      >
        <div className="mx-auto max-w-[1500px] px-[var(--section-padding-x)] pt-5">
          <nav
            className={cn(
              "relative flex items-center justify-between overflow-hidden border px-4 py-3 transition-all duration-500 md:px-6",
              isScrolled
                ? "border-charcoal/6 bg-ivory/88 shadow-[0_22px_80px_rgba(17,24,39,0.12)] backdrop-blur-2xl"
                : "border-white/12 bg-white/[0.04] shadow-[0_22px_90px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.14),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(123,167,201,0.12),transparent_24%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%,rgba(255,255,255,0.05))] transition-opacity duration-500",
                isScrolled ? "opacity-55" : "opacity-100"
              )}
            />

            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/25 to-transparent transition-opacity duration-500",
                isScrolled ? "opacity-70" : "opacity-100"
              )}
            />

            <Link href="/" className="relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 border transition-colors duration-500",
                    isScrolled
                      ? "border-gold-primary/30 bg-gold-primary/10 shadow-[0_10px_30px_rgba(201,169,110,0.12)]"
                      : "border-white/12 bg-white/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                  )}
                >
                  <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-gold-primary">
                    E
                  </div>
                </div>
                <div>
                  <span
                    className={cn(
                      "block font-display text-[1.45rem] font-bold tracking-[0.02em] transition-colors duration-500 md:text-[1.55rem]",
                      isScrolled ? "text-charcoal" : "text-ivory"
                    )}
                  >
                    Elysian
                  </span>
                  <span
                    className={cn(
                      "block font-accent text-[10px] uppercase tracking-[0.34em] transition-colors duration-500",
                      isScrolled ? "text-gold-dark" : "text-gold-light"
                    )}
                  >
                    Celebrations
                  </span>
                </div>
              </div>
            </Link>

            <div className="relative z-10 hidden items-center gap-2 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative rounded-full px-4 py-2 font-accent text-[11px] uppercase tracking-[0.18em] transition-all duration-300",
                    isScrolled
                      ? "text-charcoal/72 hover:bg-charcoal/[0.04] hover:text-charcoal"
                      : "text-ivory/72 hover:bg-white/[0.06] hover:text-ivory"
                  )}
                >
                  {link.label}
                  <span className="absolute inset-x-4 bottom-1 h-px scale-x-0 bg-gold-primary transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
              ))}
            </div>

            <div className="relative z-10 hidden items-center gap-4 lg:flex">
              <div
                className={cn(
                  "hidden flex-col justify-center rounded-full border px-4 py-2 text-right xl:flex",
                  isScrolled
                    ? "border-charcoal/8 bg-white/70"
                    : "border-white/10 bg-white/[0.05]"
                )}
              >
                <span
                  className={cn(
                    "font-accent text-[9px] uppercase tracking-[0.26em]",
                    isScrolled ? "text-slate" : "text-ivory/44"
                  )}
                >
                  Premium planning stack
                </span>
                <span
                  className={cn(
                    "mt-1 font-heading text-[12px] leading-none",
                    isScrolled ? "text-charcoal" : "text-ivory/78"
                  )}
                >
                  Budget, vendors, events
                </span>
              </div>

              <NavSignIn
                className={cn(
                  "font-accent text-[11px] uppercase tracking-[0.18em] transition-colors",
                  isScrolled
                    ? "text-charcoal/72 hover:text-gold-dark"
                    : "text-ivory/74 hover:text-ivory"
                )}
              />
              <MagneticButton href="/contact" className="px-6 py-3 text-xs shadow-[0_14px_40px_rgba(201,169,110,0.16)]">
                Inquire
              </MagneticButton>
            </div>

            <button
              onClick={() => setIsMobileOpen((open) => !open)}
              className={cn(
                "relative z-10 p-2 transition-colors lg:hidden",
                isScrolled || isMobileOpen ? "text-charcoal" : "text-ivory"
              )}
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </nav>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMobileOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[10030] bg-midnight/98 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full flex-col px-[var(--section-padding-x)] pb-10 pt-28"
            >
              <div className="border-t border-white/10 pt-8">
                <div className="flex items-center justify-between">
                  <p className="font-accent text-[10px] uppercase tracking-[0.28em] text-gold-primary">
                    Navigate
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-accent text-[9px] uppercase tracking-[0.24em] text-ivory/54">
                    Premium shell
                  </span>
                </div>
                <div className="mt-6 flex flex-col gap-5">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + index * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileOpen(false)}
                        className="font-display text-4xl leading-none text-ivory transition-colors hover:text-gold-primary"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-auto grid gap-5 border-t border-white/10 pt-8">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-primary">
                      Destinations
                    </p>
                    <p className="mt-2 font-heading text-sm text-ivory/74">
                      Editorial locations, not generic venue lists.
                    </p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-primary">
                      Budget layer
                    </p>
                    <p className="mt-2 font-heading text-sm text-ivory/74">
                      Targets, quotes, actuals, and payables in one place.
                    </p>
                  </div>
                </div>
                <NavSignIn
                  onNavigate={() => setIsMobileOpen(false)}
                  className="font-accent text-[11px] uppercase tracking-[0.2em] text-ivory/72"
                />
                <MagneticButton href="/contact" onClick={() => setIsMobileOpen(false)}>
                  Inquire
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
