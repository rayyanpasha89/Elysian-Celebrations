"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
  portalName: string;
  portalHref: string;
}

function isActivePath(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

export function Sidebar({ groups, portalName, portalHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-56 overflow-hidden border border-ivory/10 bg-midnight text-ivory shadow-[0_24px_80px_rgba(0,0,0,0.32)] lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 bg-gold-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-40 w-40 bg-sage/10 blur-3xl" />

      <div className="relative px-5 pb-4 pt-6 text-center">
        <Link href="/" className="group block">
          <span className="mx-auto mb-3 block h-px w-14 bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent transition-all duration-300 group-hover:w-20" />
          <span className="font-display text-2xl font-bold leading-none text-ivory">
            Elysian
          </span>
          <span className="block font-accent text-[9px] uppercase tracking-[0.3em] text-gold-primary">
            Celebrations
          </span>
        </Link>
        <Link
          href={portalHref}
          className="mx-auto mt-4 inline-flex max-w-full items-center justify-center border border-gold-primary/25 bg-gold-primary/10 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.18em] text-gold-primary transition-colors hover:border-gold-primary/50 hover:bg-gold-primary/15"
        >
          <span className="truncate">{portalName}</span>
        </Link>
      </div>

      <nav className="scrollbar-elysian-dark relative min-h-0 flex-1 overflow-y-auto px-3">
        <NavSections groups={groups} pathname={pathname} layoutId="sidebar-active" />
      </nav>

      <div className="relative px-4 pb-4 pt-3">
        <Link
          href="/"
          className="block border border-ivory/10 bg-ivory/[0.03] px-4 py-3 text-center font-accent text-[9px] uppercase tracking-[0.2em] text-ivory/45 transition-colors hover:border-gold-primary/35 hover:text-gold-primary"
        >
          Back to Site
        </Link>
      </div>
    </aside>
  );
}

// ─── Mobile sidebar ───────────────────────────────────────────

export function MobileSidebar({ groups, portalName, portalHref }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center border border-charcoal/15 bg-ivory/95 text-charcoal shadow-[0_12px_32px_rgba(24,24,20,0.12)] backdrop-blur transition-colors hover:border-gold-primary lg:hidden"
        aria-label="Open menu"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M0 0h16M0 6h16M0 12h16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-midnight/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-3 left-3 top-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden border border-ivory/10 bg-midnight text-ivory shadow-[0_24px_80px_rgba(0,0,0,0.38)] lg:hidden"
            >
              <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
              <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 bg-gold-primary/20 blur-3xl" />

              <div className="relative flex items-center justify-between border-b border-ivory/10 px-6 py-6">
                <div className="min-w-0">
                  <span className="font-display text-2xl font-bold leading-none text-ivory">
                    Elysian
                  </span>
                  <Link
                    href={portalHref}
                    onClick={() => setIsOpen(false)}
                    className="mt-1 block truncate font-accent text-[9px] uppercase tracking-[0.3em] text-gold-primary hover:text-ivory"
                  >
                    {portalName}
                  </Link>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center border border-ivory/10 text-ivory/55 transition-colors hover:border-gold-primary/40 hover:text-ivory"
                  aria-label="Close menu"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>

              <nav className="scrollbar-elysian-dark relative max-h-[calc(100vh-7.5rem)] overflow-y-auto px-3">
                <NavSections
                  groups={groups}
                  pathname={pathname}
                  layoutId="mobile-sidebar-active"
                  onNavigate={() => setIsOpen(false)}
                />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavSections({
  groups,
  pathname,
  layoutId,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string | null;
  layoutId: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex min-h-full w-full flex-col justify-center gap-3 py-4">
      {groups.map((group, groupIndex) => (
        <section
          key={group.title}
          className="border border-ivory/[0.07] bg-ivory/[0.035] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-2">
            <p className="truncate font-accent text-[9px] uppercase tracking-[0.22em] text-ivory/34">
              {group.title}
            </p>
            <span className="font-accent text-[8px] uppercase tracking-[0.12em] text-gold-primary/55">
              {String(groupIndex + 1).padStart(2, "0")}
            </span>
          </div>
          <ul className="list-none space-y-1 pl-0">
            {group.items.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative isolate flex items-center justify-between overflow-hidden px-3 py-2.5 font-heading text-[12px] transition-all duration-300",
                      isActive
                        ? "text-ivory"
                        : "text-ivory/58 hover:bg-ivory/[0.04] hover:text-ivory"
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId={layoutId}
                        className="absolute inset-0 -z-10 border border-gold-primary/35 bg-[linear-gradient(135deg,rgba(201,169,110,0.18),rgba(255,255,255,0.045))]"
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 32,
                        }}
                      />
                    ) : null}
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 border transition-colors",
                          isActive
                            ? "border-gold-primary bg-gold-primary"
                            : "border-ivory/20 group-hover:border-gold-primary/50"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge ? (
                      <span className="ml-2 min-w-[20px] shrink-0 border border-gold-primary/25 px-1.5 py-0.5 text-center font-accent text-[9px] text-gold-primary">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
