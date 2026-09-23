import type { NavGroup } from "@/components/dashboard/sidebar";
import { OperationsPortalBoundary } from "@/components/dashboard/operations-portal-boundary";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { loadOperationsStaffScope } from "@/lib/operations-auth";
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
  const operationsScope = await loadOperationsStaffScope(session);
  const scoped = operationsScope !== null;
  const canReadMessages = Boolean(
    operationsScope?.permissions.some((permission) =>
      ["MESSAGE_CLIENT", "MESSAGE_VENDORS"].includes(permission)
    )
  );
  const scopedNavGroups: NavGroup[] = [
    {
      title: "Operations",
      items: [
        { label: "Live Operations", href: "/manager/operations" },
        ...(canReadMessages
          ? [{ label: "External Messages", href: "/manager/messages" }]
          : []),
      ],
    },
    {
      title: "Account",
      items: [{ label: "Settings", href: "/manager/settings" }],
    },
  ];

  return (
    <PortalShell
      groups={scoped ? scopedNavGroups : navGroups}
      portalName="Operations Portal"
      portalHref={scoped ? "/manager/operations" : "/manager"}
      fallbackName="Operations"
      role={session.role}
    >
      <OperationsPortalBoundary
        scoped={scoped}
        canReadMessages={canReadMessages}
      >
        {children}
      </OperationsPortalBoundary>
    </PortalShell>
  );
}
