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
      { label: "Dashboard", href: "/client" },
      { label: "My Wedding", href: "/client/wedding" },
    ],
  },
  {
    title: "Planning",
    items: [
      { label: "Budget", href: "/client/budget" },
      { label: "Vendors", href: "/client/vendors" },
      { label: "Guest List", href: "/client/guests" },
      { label: "Timeline", href: "/client/timeline" },
      { label: "Mood Board", href: "/client/mood-board" },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Messages", href: "/client/messages" },
      { label: "Bookings", href: "/client/bookings" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/client/settings" },
    ],
  },
];

export default function ClientLayout({
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
        portalName="Client Portal"
        portalHref="/client"
      />
      <MobileSidebar
        groups={navGroups}
        portalName="Client Portal"
        portalHref="/client"
      />
      <div className="lg:pl-64">
        <Topbar
          userName={user?.fullName ?? "Client"}
          userRole={dashboardRoleLabel(user?.publicMetadata?.role, "Couple")}
        />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </>
  );
}
