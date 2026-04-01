"use client";

import { useUser } from "@clerk/nextjs";
import { Sidebar, MobileSidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { PortalRoleGuard } from "@/components/dashboard/portal-role-guard";
import { Topbar } from "@/components/dashboard/topbar";
import { dashboardRoleLabel } from "@/lib/role-utils";

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/manager" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Inquiries", href: "/manager/inquiries" },
      { label: "Bookings", href: "/manager/bookings" },
      { label: "Clients", href: "/manager/clients" },
      { label: "Vendors", href: "/manager/vendors" },
    ],
  },
  {
    title: "Planning",
    items: [
      { label: "Event Configurator", href: "/manager/configurator" },
      { label: "Destinations", href: "/manager/destinations" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/manager/settings" },
    ],
  },
];

export default function ManagerLayout({
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
        portalName="Manager Portal"
        portalHref="/manager"
      />
      <MobileSidebar
        groups={navGroups}
        portalName="Manager Portal"
        portalHref="/manager"
      />
      <div className="lg:pl-64">
        <Topbar
          userName={user?.fullName ?? "Manager"}
          userRole={dashboardRoleLabel(user?.publicMetadata?.role, "Manager")}
        />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </>
  );
}
