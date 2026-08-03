"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  Contact,
  Inbox,
  Images,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Newspaper,
  Package,
  Palette,
  Quote,
  Settings,
  SlidersHorizontal,
  Star,
  Store,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

/**
 * Central route → icon map so the four portal layouts don't each have to wire
 * icons. Any href not listed falls back to a neutral marker.
 */
const ICON_BY_HREF: Record<string, LucideIcon> = {
  // Client
  "/client": LayoutDashboard,
  "/client/wedding": CalendarRange,
  "/client/budget": Wallet,
  "/client/vendors": Store,
  "/client/guests": Users,
  "/client/timeline": CalendarClock,
  "/client/mood-board": Palette,
  "/client/messages": MessageSquare,
  "/client/bookings": CalendarCheck,
  "/client/settings": Settings,
  // Vendor
  "/vendor": LayoutDashboard,
  "/vendor/profile": UserCircle,
  "/vendor/services": Package,
  "/vendor/bookings": CalendarCheck,
  "/vendor/reviews": Star,
  "/vendor/analytics": BarChart3,
  "/vendor/portfolio": Images,
  "/vendor/inquiries": Inbox,
  "/vendor/calendar": Calendar,
  "/vendor/messages": MessageSquare,
  "/vendor/settings": Settings,
  // Admin
  "/admin": LayoutDashboard,
  "/admin/pricing": Wallet,
  "/admin/progress": BarChart3,
  "/admin/revenue": BarChart3,
  "/admin/vendors": Store,
  "/admin/destinations": MapPin,
  "/admin/users": Users,
  "/admin/clients": Contact,
  "/admin/bookings": CalendarCheck,
  "/admin/inquiries": Inbox,
  "/admin/analytics": BarChart3,
  "/admin/packages": Package,
  "/admin/venues": Building2,
  "/admin/blog": Newspaper,
  "/admin/testimonials": Quote,
  "/admin/settings": Settings,
  // Manager
  "/manager": LayoutDashboard,
  "/manager/inquiries": Inbox,
  "/manager/bookings": CalendarCheck,
  "/manager/messages": MessageSquare,
  "/manager/clients": Users,
  "/manager/vendors": Store,
  "/manager/weddings": CalendarRange,
  "/manager/configurator": SlidersHorizontal,
  "/manager/destinations": MapPin,
  "/manager/settings": Settings,
};

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

      <div className="relative px-5 pb-2.5 pt-4 text-center">
        <Link href="/" className="group block">
          <span className="mx-auto mb-2 block h-px w-14 bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent transition-all duration-300 group-hover:w-20" />
          <span className="font-display text-2xl font-bold leading-none text-ivory">
            Elysian
          </span>
          <span className="block font-accent text-[9px] uppercase tracking-[0.3em] text-gold-primary">
            Celebrations
          </span>
        </Link>
        <Link
          href={portalHref}
          className="mx-auto mt-2.5 inline-flex max-w-full items-center justify-center border border-gold-primary/25 bg-gold-primary/10 px-3 py-1 font-accent text-[9px] uppercase tracking-[0.18em] text-gold-primary transition-colors hover:border-gold-primary/50 hover:bg-gold-primary/15"
        >
          <span className="truncate">{portalName}</span>
        </Link>
      </div>

      <nav className="scrollbar-elysian-dark relative min-h-0 flex-1 overflow-y-auto px-3">
        <NavSections groups={groups} pathname={pathname} layoutId="sidebar-active" />
      </nav>

      <div className="relative px-4 pb-3 pt-2">
        <Link
          href="/"
          className="block border border-ivory/10 bg-ivory/[0.03] px-4 py-1.5 text-center font-accent text-[9px] uppercase tracking-[0.2em] text-ivory/45 transition-colors hover:border-gold-primary/35 hover:text-gold-primary"
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
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const firstControl = dialog?.querySelector<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      (firstControl ?? dialog)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter((element) => !element.hasAttribute("hidden"));

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => {
        (trigger ?? previousFocus)?.focus();
      });
    };
  }, [closeMenu, isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center border border-charcoal/15 bg-ivory/95 text-charcoal shadow-[0_12px_32px_rgba(24,24,20,0.12)] backdrop-blur transition-colors hover:border-gold-primary lg:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
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
              onClick={closeMenu}
              className="fixed inset-0 z-50 bg-midnight/60 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              ref={dialogRef}
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-label={`${portalName} navigation`}
              tabIndex={-1}
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
                  type="button"
                  onClick={closeMenu}
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
                  onNavigate={closeMenu}
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
    <div className="flex w-full flex-col gap-2 py-3">
      {groups.map((group, groupIndex) => (
        <section
          key={group.title}
          className="border border-ivory/[0.07] bg-ivory/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="mb-1 flex items-center justify-between gap-3 px-2">
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
              const Icon = ICON_BY_HREF[item.href];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative isolate flex items-center justify-between overflow-hidden px-3 py-2 font-heading text-[12.5px] transition-all duration-300",
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
                    <span className="flex min-w-0 items-center gap-2.5">
                      {Icon ? (
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-gold-primary"
                              : "text-ivory/40 group-hover:text-gold-primary/70"
                          )}
                        />
                      ) : (
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 border transition-colors",
                            isActive
                              ? "border-gold-primary bg-gold-primary"
                              : "border-ivory/20 group-hover:border-gold-primary/50"
                          )}
                        />
                      )}
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
