"use client";

import { useUser } from "@clerk/nextjs";
import { Sidebar, MobileSidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { PortalRoleGuard } from "@/components/dashboard/portal-role-guard";
import { dashboardRoleLabel } from "@/lib/role-utils";

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
  const { user } = useUser();

  return (
    <>
      <PortalRoleGuard />
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
        <Topbar
          userName={user?.fullName ?? "Admin"}
          userRole={dashboardRoleLabel(user?.publicMetadata?.role, "Admin")}
        />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </>
  );
}
