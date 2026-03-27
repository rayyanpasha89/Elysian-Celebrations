"use client";

import { Sidebar, MobileSidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Vendors", href: "/admin/vendors" },
      { label: "Clients", href: "/admin/clients" },
      { label: "Destinations", href: "/admin/destinations" },
      { label: "Packages", href: "/admin/packages" },
      { label: "Venues", href: "/admin/venues" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Blog Posts", href: "/admin/blog" },
      { label: "Testimonials", href: "/admin/testimonials" },
      { label: "Inquiries", href: "/admin/inquiries" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users", href: "/admin/users" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar
        groups={navGroups}
        portalName="Admin Portal"
        portalHref="/admin"
      />
      <MobileSidebar
        groups={navGroups}
        portalName="Admin Portal"
        portalHref="/admin"
      />
      <div className="lg:pl-64">
        <Topbar userName="Deeksha" userRole="Admin" />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </>
  );
}
