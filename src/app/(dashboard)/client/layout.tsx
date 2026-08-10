import type { NavGroup } from "@/components/dashboard/sidebar";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { requirePortalPageRole } from "@/lib/portal-auth";

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/client" },
      { label: "Event Plan", href: "/client/wedding" },
    ],
  },
  {
    title: "Planning",
    items: [
      { label: "Cost Estimate", href: "/client/budget" },
      { label: "Vendors", href: "/client/vendors" },
      { label: "Guest List", href: "/client/guests" },
      { label: "Run of Show", href: "/client/timeline" },
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

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalPageRole("/client", "client");

  return (
    <PortalShell
      groups={navGroups}
      portalName="Client Portal"
      portalHref="/client"
      fallbackName="Client"
      role={session.role}
    >
      {children}
    </PortalShell>
  );
}
