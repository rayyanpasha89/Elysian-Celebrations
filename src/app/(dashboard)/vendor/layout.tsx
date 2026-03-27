"use client";

import { Sidebar, MobileSidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/vendor" },
      { label: "Analytics", href: "/vendor/analytics" },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Profile", href: "/vendor/profile" },
      { label: "Services", href: "/vendor/services" },
      { label: "Portfolio", href: "/vendor/portfolio" },
      { label: "Reviews", href: "/vendor/reviews" },
    ],
  },
  {
    title: "Bookings",
    items: [
      { label: "Inquiries", href: "/vendor/inquiries" },
      { label: "Confirmed", href: "/vendor/bookings" },
      { label: "Calendar", href: "/vendor/calendar" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Messages", href: "/vendor/messages" },
      { label: "Settings", href: "/vendor/settings" },
    ],
  },
];

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar
        groups={navGroups}
        portalName="Vendor Portal"
        portalHref="/vendor"
      />
      <MobileSidebar
        groups={navGroups}
        portalName="Vendor Portal"
        portalHref="/vendor"
      />
      <div className="lg:pl-64">
        <Topbar userName="Lens & Light" userRole="Vendor" />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </>
  );
}
