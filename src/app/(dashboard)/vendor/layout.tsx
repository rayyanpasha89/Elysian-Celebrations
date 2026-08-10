import type { NavGroup } from "@/components/dashboard/sidebar";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { requirePortalPageRole } from "@/lib/portal-auth";

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

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalPageRole("/vendor", "vendor");

  return (
    <PortalShell
      groups={navGroups}
      portalName="Vendor Portal"
      portalHref="/vendor"
      fallbackName="Vendor"
      role={session.role}
    >
      {children}
    </PortalShell>
  );
}
