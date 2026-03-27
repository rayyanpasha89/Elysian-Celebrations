"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MagneticButton } from "@/components/shared/magnetic-button";

const navLinks = [
  { label: "Destinations", href: "#destinations" },
  { label: "Packages", href: "#packages" },
  { label: "Vendors", href: "#vendors" },
  { label: "About", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-ivory/80 backdrop-blur-2xl border-b border-charcoal/[0.06] py-3"
            : "bg-transparent py-6"
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-[var(--section-padding-x)]">
          {/* Logo */}
          <Link href="/" className="relative z-10">
            <span
              className={cn(
                "font-display text-2xl font-bold tracking-wide transition-colors duration-500",
                isScrolled ? "text-charcoal" : "text-ivory"
              )}
            >
              Elysian
            </span>
            <span
              className={cn(
                "block font-accent text-[10px] uppercase tracking-[0.3em] transition-colors duration-500",
                isScrolled ? "text-gold-primary" : "text-gold-light"
              )}
            >
              Celebrations
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8 group/nav">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-accent text-xs uppercase tracking-[0.15em] relative group transition-colors duration-300 transition-opacity group-has-[a:hover]/nav:opacity-20 hover:!opacity-100",
                  isScrolled
                    ? "text-charcoal hover:text-gold-dark"
                    : "text-ivory/80 hover:text-ivory"
                )}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-gold-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:block">
            <MagneticButton className="text-xs px-6 py-3">
              Inquire
            </MagneticButton>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={cn(
              "lg:hidden relative z-10 p-2 transition-colors",
              isScrolled || isMobileOpen ? "text-charcoal" : "text-ivory"
            )}
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-ivory"
          >
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center h-full gap-8"
            >
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="font-display text-3xl text-charcoal hover:text-gold-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4"
              >
                <MagneticButton onClick={() => setIsMobileOpen(false)}>
                  Inquire
                </MagneticButton>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
