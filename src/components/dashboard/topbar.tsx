"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/** Exact pathname → title (no trailing slash). Covers client, vendor, and admin dashboards. */
const DASHBOARD_ROUTE_TITLES: Record<string, string> = {
  "/client": "Dashboard",
  "/client/vendors": "Vendors",
  "/client/budget": "Budget Calculator",
  "/client/guests": "Guest List",
  "/client/mood-board": "Mood Board",
  "/client/messages": "Messages",
  "/client/settings": "Settings",
  "/client/wedding": "My Wedding",
  "/client/timeline": "Timeline",
  "/client/bookings": "Bookings",

  "/vendor": "Dashboard",
  "/vendor/profile": "Profile",
  "/vendor/services": "Services",
  "/vendor/bookings": "Bookings",
  "/vendor/reviews": "Reviews",
  "/vendor/analytics": "Analytics",
  "/vendor/settings": "Settings",
  "/vendor/portfolio": "Portfolio",
  "/vendor/inquiries": "Inquiries",
  "/vendor/calendar": "Calendar",
  "/vendor/messages": "Messages",

  "/admin": "Dashboard",
  "/admin/vendors": "Vendors",
  "/admin/destinations": "Destinations",
  "/admin/users": "Users",
  "/admin/bookings": "Bookings",
  "/admin/inquiries": "Inquiries",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
  "/admin/clients": "Clients",
  "/admin/packages": "Packages",
  "/admin/venues": "Venues",
  "/admin/blog": "Blog Posts",
  "/admin/testimonials": "Testimonials",

  "/manager": "Dashboard",
  "/manager/inquiries": "Inquiries",
  "/manager/bookings": "Bookings",
  "/manager/clients": "Clients",
  "/manager/vendors": "Vendors",
  "/manager/configurator": "Event Configurator",
  "/manager/destinations": "Destinations",
  "/manager/settings": "Settings",
};

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  const p = pathname.replace(/\/$/, "");
  return p === "" ? "/" : p;
}

function fallbackTitleFromPath(pathname: string): string {
  const parts = normalizePath(pathname).split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return "Dashboard";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function resolveDashboardTitle(pathname: string, explicitTitle?: string): string {
  const path = normalizePath(pathname);
  return DASHBOARD_ROUTE_TITLES[path] ?? explicitTitle ?? fallbackTitleFromPath(pathname);
}

interface TopbarProps {
  /** Optional override when pathname is not in the route map */
  title?: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
}

export function Topbar({
  title,
  subtitle,
  userName = "User",
  userRole = "Client",
}: TopbarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [showDropdown, setShowDropdown] = useState(false);

  const displayTitle = resolveDashboardTitle(pathname ?? "", title);

  // Derive settings route from the current portal context
  const portalRoot = (pathname ?? "").split("/").filter(Boolean)[0] ?? "client";
  const settingsHref = `/${portalRoot}/settings`;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/8 bg-ivory/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4 lg:px-8">
        <div className="pl-12 lg:pl-0">
          <h1 className="font-display text-xl font-semibold text-charcoal">{displayTitle}</h1>
          {subtitle && (
            <p className="mt-0.5 font-accent text-[10px] uppercase tracking-[0.2em] text-slate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => { /* Notification panel — planned feature */ }}
            className="relative flex h-9 w-9 items-center justify-center border border-charcoal/10 text-charcoal/60 transition-colors hover:border-gold-primary hover:text-gold-primary"
            aria-label="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5a4.5 4.5 0 00-4.5 4.5v3L2 10.5V12h12v-1.5L12.5 9V6A4.5 4.5 0 008 1.5zM6.5 13a1.5 1.5 0 003 0"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center bg-midnight font-accent text-[11px] tracking-wider text-ivory">
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-tight text-charcoal">{userName}</p>
                <p className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">{userRole}</p>
              </div>
            </button>

            <AnimatePresence>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} aria-hidden />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full z-50 mt-2 w-48 border border-charcoal/10 bg-ivory shadow-lg"
                  >
                    <div className="border-b border-charcoal/8 px-4 py-3">
                      <p className="text-sm font-medium text-charcoal">{userName}</p>
                      <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">{userRole}</p>
                    </div>
                    <div className="py-1">
                      <DropdownItem label="Settings" href={settingsHref} />
                      <DropdownItem label="Back to Site" href="/" />
                      <div className="my-1 h-px bg-charcoal/8" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          void signOut({ redirectUrl: "/" });
                        }}
                        className="block w-full px-4 py-2 text-left font-accent text-[11px] uppercase tracking-[0.15em] text-red-600/70 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function DropdownItem({
  label,
  href,
  danger,
}: {
  label: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block px-4 py-2 font-accent text-[11px] uppercase tracking-[0.15em] transition-colors",
        danger
          ? "text-red-600/70 hover:bg-red-50 hover:text-red-700"
          : "text-charcoal/70 hover:bg-cream hover:text-charcoal",
      )}
    >
      {label}
    </Link>
  );
}
