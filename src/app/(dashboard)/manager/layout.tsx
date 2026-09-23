import type { NavGroup } from "@/components/dashboard/sidebar";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { requirePortalPageRole } from "@/lib/portal-auth";

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
      { label: "Live Operations", href: "/manager/operations" },
      { label: "Event Directory", href: "/manager/weddings" },
      { label: "Inquiries", href: "/manager/inquiries" },
      { label: "Bookings", href: "/manager/bookings" },
      { label: "Messages", href: "/manager/messages" },
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

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalPageRole("/manager", "manager", "admin");

  return (
    <PortalShell
      groups={navGroups}
      portalName="Operations Portal"
      portalHref="/manager"
      fallbackName="Operations"
      role={session.role}
    >
      {children}
    </PortalShell>
  );
}
