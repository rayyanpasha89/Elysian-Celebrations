"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, ExternalLink, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const PORTAL_LABELS: Record<string, string> = {
  client: "Client Portal",
  vendor: "Vendor Portal",
  manager: "Manager Console",
  admin: "Admin Console",
};

/** Exact pathname → title (no trailing slash). Covers client, vendor, and admin dashboards. */
const DASHBOARD_ROUTE_TITLES: Record<string, string> = {
  "/client": "Dashboard",
  "/client/vendors": "Vendors",
  "/client/budget": "Cost Estimation",
  "/client/guests": "Guest List",
  "/client/mood-board": "Mood Board",
  "/client/messages": "Messages",
  "/client/settings": "Settings",
  "/client/wedding": "Event Plan",
  "/client/timeline": "Run of Show",
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
  "/admin/pricing": "Final Pricing",
  "/admin/progress": "Client Progress",
  "/admin/revenue": "Revenue Dashboard",
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
  "/manager/messages": "Messages",
  "/manager/clients": "Clients",
  "/manager/vendors": "Vendors",
  "/manager/configurator": "Event Configurator",
  "/manager/destinations": "Destinations",
  "/manager/weddings": "Events",
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

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  time: string;
};

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
  const testAuthEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ELYSIAN_TEST_AUTH_BYPASS === "1";
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationActionError, setNotificationActionError] = useState<string | null>(null);
  const [notificationReloadKey, setNotificationReloadKey] = useState(0);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  const displayTitle = resolveDashboardTitle(pathname ?? "", title);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  // Derive settings route from the current portal context
  const portalRoot = (pathname ?? "").split("/").filter(Boolean)[0] ?? "client";
  const settingsHref = `/${portalRoot}/settings`;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        setNotificationsLoading(true);
        setNotificationsError(null);
        const response = await fetch("/api/notifications");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load notifications");
        }
        if (!cancelled) {
          setNotifications((payload.notifications ?? []) as NotificationItem[]);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setNotificationsError("Notifications could not be loaded.");
        }
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [notificationReloadKey]);

  useEffect(() => {
    if (!showNotifications && !showDropdown) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (showNotifications) {
        setShowNotifications(false);
        notificationsTriggerRef.current?.focus();
      } else if (showDropdown) {
        setShowDropdown(false);
        accountTriggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showDropdown, showNotifications]);

  async function markNotificationRead(id: string) {
    const previousReadState =
      notifications.find((item) => item.id === id)?.isRead ?? false;
    if (previousReadState) return;

    setNotificationActionError(null);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "The notification could not be updated.");
      }
    } catch (error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isRead: previousReadState } : item
        )
      );
      setNotificationActionError(
        error instanceof Error
          ? error.message
          : "The notification could not be updated."
      );
    }
  }

  async function markAllNotificationsRead() {
    const previousReadStates = new Map(
      notifications.map((item) => [item.id, item.isRead] as const)
    );
    setNotificationActionError(null);
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true }))
    );

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Notifications could not be updated.");
      }
    } catch (error) {
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: previousReadStates.get(item.id) ?? item.isRead,
        }))
      );
      setNotificationActionError(
        error instanceof Error
          ? error.message
          : "Notifications could not be updated."
      );
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/8 bg-cream/78 shadow-[0_16px_48px_rgba(24,24,20,0.04)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4 lg:px-8">
        <div className="pl-12 lg:pl-0">
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-gold-dark">
            {PORTAL_LABELS[portalRoot] ?? "Portal"}
          </p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-charcoal">{displayTitle}</h1>
          {subtitle && (
            <p className="mt-0.5 font-accent text-[10px] uppercase tracking-[0.2em] text-slate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              ref={notificationsTriggerRef}
              type="button"
              onClick={() => {
                setShowNotifications((current) => !current);
                setShowDropdown(false);
              }}
              className="relative flex h-9 w-9 items-center justify-center border border-charcoal/10 text-charcoal/60 transition-colors hover:border-gold-primary hover:text-gold-primary"
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
              aria-haspopup="dialog"
              aria-controls="dashboard-notifications-popup"
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gold-primary px-1 font-accent text-[8px] leading-none text-midnight">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            <AnimatePresence>
              {showNotifications ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                    aria-hidden
                  />
                  <motion.div
                    id="dashboard-notifications-popup"
                    role="dialog"
                    aria-label="Notifications"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-charcoal/10 bg-ivory shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 px-4 py-3">
                      <div>
                        <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
                          Notifications
                        </p>
                        <p className="mt-1 text-xs text-slate">
                          {unreadCount > 0
                            ? `${unreadCount} unread`
                            : "All caught up"}
                        </p>
                      </div>
                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => void markAllNotificationsRead()}
                          className="font-accent text-[9px] uppercase tracking-[0.16em] text-gold-dark transition-colors hover:text-charcoal"
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>

                    {notificationActionError ? (
                      <div
                        role="alert"
                        className="flex items-start justify-between gap-3 border-b border-rose/35 bg-rose/[0.07] px-4 py-3"
                      >
                        <p className="text-xs leading-relaxed text-charcoal">
                          {notificationActionError} The previous read state was restored.
                        </p>
                        <button
                          type="button"
                          onClick={() => setNotificationActionError(null)}
                          className="font-accent shrink-0 text-[8px] uppercase tracking-[0.14em] text-charcoal underline decoration-charcoal/30 underline-offset-4"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : null}

                    <div className="max-h-[380px] overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="space-y-3 px-4 py-4">
                          <div className="h-3 w-24 animate-pulse bg-charcoal/10" />
                          <div className="h-12 animate-pulse bg-charcoal/5" />
                          <div className="h-12 animate-pulse bg-charcoal/5" />
                        </div>
                      ) : notificationsError ? (
                        <div role="alert" className="px-4 py-5">
                          <p className="text-sm text-slate">{notificationsError}</p>
                          <button
                            type="button"
                            onClick={() => setNotificationReloadKey((key) => key + 1)}
                            className="font-accent mt-3 text-[9px] uppercase tracking-[0.16em] text-gold-dark underline decoration-gold-primary/35 underline-offset-4"
                          >
                            Try again
                          </button>
                        </div>
                      ) : notifications.length > 0 ? (
                        <ul className="list-none divide-y divide-charcoal/8 pl-0">
                          {notifications.map((notification) => (
                            <li key={notification.id}>
                              <NotificationRow
                                notification={notification}
                                onRead={() => void markNotificationRead(notification.id)}
                                onClose={() => setShowNotifications(false)}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-6">
                          <p className="font-heading text-sm text-charcoal">
                            No notifications yet
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate">
                            Booking updates, reminders, and system notes will appear
                            here when they are ready.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              ref={accountTriggerRef}
              type="button"
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              aria-label={`Account menu for ${userName}`}
              aria-haspopup="menu"
              aria-controls="dashboard-account-menu"
              aria-expanded={showDropdown}
            >
              <div
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center bg-midnight font-accent text-[11px] tracking-wider text-ivory"
              >
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-tight text-charcoal">{userName}</p>
                <p className="font-accent text-[9px] uppercase tracking-[0.15em] text-slate">{userRole}</p>
              </div>
              <ChevronDown
                className={cn(
                  "hidden h-3.5 w-3.5 text-slate transition-transform md:block",
                  showDropdown && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} aria-hidden />
                  <motion.div
                    id="dashboard-account-menu"
                    role="menu"
                    aria-label="Account menu"
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
                      <DropdownItem label="Settings" href={settingsHref} icon={Settings} />
                      <DropdownItem label="Back to Site" href="/" icon={ExternalLink} />
                      <div className="my-1 h-px bg-charcoal/8" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowDropdown(false);
                          if (testAuthEnabled) {
                            window.location.href = "/";
                            return;
                          }
                          void signOut({ redirectUrl: "/" });
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-accent text-[11px] uppercase tracking-[0.15em] text-red-600/70 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {testAuthEnabled ? "Exit Test View" : "Sign Out"}
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

function NotificationRow({
  notification,
  onRead,
  onClose,
}: {
  notification: NotificationItem;
  onRead: () => void;
  onClose: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          notification.isRead ? "bg-charcoal/15" : "bg-gold-primary"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-sm text-charcoal">
            {notification.title}
          </span>
          <span className="font-accent text-[8px] uppercase tracking-[0.14em] text-slate">
            {notification.time}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-slate">
          {notification.message}
        </span>
      </span>
    </>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        onClick={() => {
          onRead();
          onClose();
        }}
        className="flex gap-3 px-4 py-3 text-left transition-colors hover:bg-cream/70"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onRead}
      className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-cream/70"
    >
      {content}
    </button>
  );
}

function DropdownItem({
  label,
  href,
  danger,
  icon: Icon,
}: {
  label: string;
  href: string;
  danger?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 font-accent text-[11px] uppercase tracking-[0.15em] transition-colors",
        danger
          ? "text-red-600/70 hover:bg-red-50 hover:text-red-700"
          : "text-charcoal/70 hover:bg-cream hover:text-charcoal",
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </Link>
  );
}
