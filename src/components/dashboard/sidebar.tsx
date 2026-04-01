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

export function Sidebar({ groups, portalName, portalHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-charcoal/10 bg-midnight lg:flex">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-ivory/10">
        <Link href="/" className="block">
          <span className="font-display text-xl font-bold text-ivory">
            Elysian
          </span>
          <span className="block font-accent text-[9px] uppercase tracking-[0.3em] text-gold-primary">
            Celebrations
          </span>
        </Link>
        <Link
          href={portalHref}
          className="mt-3 block font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/30 transition-colors hover:text-gold-primary"
        >
          {portalName}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-elysian-dark flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-6">
            <p className="mb-2 px-3 font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/25">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center justify-between px-3 py-2.5 font-accent text-[11px] uppercase tracking-[0.15em] transition-all duration-300",
                        isActive
                          ? "text-gold-primary"
                          : "text-ivory/50 hover:text-ivory/80"
                      )}
                    >
                      <span>{item.label}</span>
                      {item.badge ? (
                        <span className="min-w-[20px] text-center font-accent text-[10px] text-gold-primary">
                          {item.badge}
                        </span>
                      ) : null}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 border-l-2 border-gold-primary bg-gold-primary/5"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-ivory/10 px-6 py-4">
        <Link
          href="/"
          className="font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/30 transition-colors hover:text-gold-primary"
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
        className="lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center border border-charcoal/20 bg-ivory text-charcoal transition-colors hover:border-gold-primary"
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
              className="fixed left-0 top-0 z-50 h-screen w-72 border-r border-charcoal/10 bg-midnight lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-ivory/10">
                <div>
                  <span className="font-display text-xl font-bold text-ivory">
                    Elysian
                  </span>
                  <Link
                    href={portalHref}
                    onClick={() => setIsOpen(false)}
                    className="block font-accent text-[9px] uppercase tracking-[0.3em] text-gold-primary hover:text-ivory"
                  >
                    {portalName}
                  </Link>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-ivory/50 hover:text-ivory"
                  aria-label="Close menu"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>

              <nav className="scrollbar-elysian-dark max-h-[calc(100vh-8rem)] overflow-y-auto px-3 py-4">
                {groups.map((group) => (
                  <div key={group.title} className="mb-6">
                    <p className="mb-2 px-3 font-accent text-[10px] uppercase tracking-[0.2em] text-ivory/25">
                      {group.title}
                    </p>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2.5 font-accent text-[11px] uppercase tracking-[0.15em] transition-colors",
                                isActive
                                  ? "border-l-2 border-gold-primary bg-gold-primary/5 text-gold-primary"
                                  : "text-ivory/50 hover:text-ivory/80"
                              )}
                            >
                              <span>{item.label}</span>
                              {item.badge ? (
                                <span className="text-[10px] text-gold-primary">
                                  {item.badge}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
